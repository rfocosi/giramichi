import express, { Router, Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from './mcpServer.js';
import { authenticateAgent } from '../auth/middleware.js';

import {
  initRedisAdapter,
  publishSessionMessage,
  subscribeToSession,
  unsubscribeFromSession
} from './redisAdapter.js';

// Map of active SSE transports by session ID
const sseTransports = new Map<string, SSEServerTransport>();

// Map of active Streamable HTTP transports by session ID
const streamableTransports = new Map<string, StreamableHTTPServerTransport>();

export function createHttpMcpRouter(): Router {
  const router = Router();
  router.use(authenticateAgent);

  // Initialize Redis adapter (if REDIS_URL or REDIS_HOST is configured)
  initRedisAdapter();

  // Helper function to handle Streamable HTTP transport requests
  async function handleStreamableHttp(req: Request, res: Response) {
    const sessionId = (req.headers['mcp-session-id'] as string) || (req.query.sessionId as string);
    let transport = sessionId ? streamableTransports.get(sessionId) : undefined;

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      const server = createMCPServer();
      await server.connect(transport);

      if (transport.sessionId) {
        streamableTransports.set(transport.sessionId, transport);
      }

      transport.onclose = () => {
        if (transport?.sessionId) {
          console.log(`[Giramichi MCP HTTP] Streamable HTTP Session closed: ${transport.sessionId}`);
          streamableTransports.delete(transport.sessionId);
        }
      };
    }

    try {
      await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
      console.error('[Giramichi MCP HTTP] Error handling Streamable HTTP request:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  }

  // ---------------------------------------------------------
  // 1. SSE Transport Endpoints (Legacy / Compatibility Mode)
  // ---------------------------------------------------------

  // GET /sse (or /mcp/sse) - Establishes SSE stream connection
  router.get('/sse', async (req: Request, res: Response) => {
    console.log('[Giramichi MCP HTTP] Incoming SSE connection request');

    // Explicitly set SSE stream headers to prevent Nginx/Express from closing connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Determine post endpoint URL based on current router mounting path
    const baseUrl = req.baseUrl || '/mcp';
    const postEndpoint = `${baseUrl}/messages`;

    const transport = new SSEServerTransport(postEndpoint, res);
    const server = createMCPServer();

    sseTransports.set(transport.sessionId, transport);
    console.log(`[Giramichi MCP HTTP] SSE Session initialized: ${transport.sessionId}`);

    // Register Redis Pub/Sub subscriber for cross-instance message routing
    await subscribeToSession(transport.sessionId, async (remoteBody) => {
      console.log(`[Giramichi MCP HTTP] Processing remote Pub/Sub message for session: ${transport.sessionId}`);
      try {
        const mockReq: any = { body: remoteBody, query: { sessionId: transport.sessionId }, headers: {} };
        const mockRes: any = {
          headersSent: false,
          status: () => mockRes,
          json: () => mockRes,
          end: () => mockRes,
          writeHead: () => mockRes
        };
        await transport.handlePostMessage(mockReq, mockRes, remoteBody);
      } catch (err: any) {
        console.error(`[Giramichi MCP HTTP] Error handling Redis Pub/Sub message for ${transport.sessionId}:`, err);
      }
    });

    transport.onclose = () => {
      console.log(`[Giramichi MCP HTTP] SSE Session closed: ${transport.sessionId}`);
      unsubscribeFromSession(transport.sessionId);
      sseTransports.delete(transport.sessionId);
    };

    try {
      await server.connect(transport);
    } catch (err: any) {
      console.error('[Giramichi MCP HTTP] Error connecting SSE transport:', err);
      unsubscribeFromSession(transport.sessionId);
      sseTransports.delete(transport.sessionId);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to initialize SSE connection' });
      }
    }
  });

  // POST /sse (or /mcp/sse) - Dual-mode handler for http-first client strategy & SSE post messages
  router.post('/sse', async (req: Request, res: Response) => {
    const sessionId = (req.query.sessionId as string) || (req.headers['mcp-session-id'] as string);
    if (sessionId) {
      const transport = sseTransports.get(sessionId);
      if (transport) {
        return transport.handlePostMessage(req, res, req.body);
      }
    }
    // Fallback to Streamable HTTP handler for clients probing POST /mcp/sse
    return handleStreamableHttp(req, res);
  });

  // POST /messages (or /mcp/messages) - Handles client messages for active SSE session
  router.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing required query parameter: sessionId' });
      return;
    }

    const transport = sseTransports.get(sessionId);
    if (!transport) {
      // Session not on this local pod: attempt routing via Redis Pub/Sub to the pod holding the session
      const forwarded = await publishSessionMessage(sessionId, req.body);
      if (forwarded) {
        console.log(`[Giramichi MCP HTTP] Session '${sessionId}' hosted on another pod. Message routed via Redis Pub/Sub.`);
        res.status(202).json({ status: 'accepted', sessionId });
        return;
      }

      res.status(404).json({ error: `SSE Session '${sessionId}' not found or has expired` });
      return;
    }

    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (err: any) {
      console.error(`[Giramichi MCP HTTP] Error handling SSE message for session ${sessionId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // ---------------------------------------------------------
  // 2. Streamable HTTP Transport Endpoints (MCP HTTP Spec)
  // ---------------------------------------------------------

  // ALL / (or /mcp) - Streamable HTTP transport supporting GET & POST requests
  router.all('/', async (req: Request, res: Response) => {
    return handleStreamableHttp(req, res);
  });

  return router;
}

// Standalone runner for HTTP MCP server
if (process.argv[1] && (process.argv[1].endsWith('httpMcpServer.ts') || process.argv[1].endsWith('httpMcpServer.js'))) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const router = createHttpMcpRouter();
  app.use('/mcp', router);
  app.use('/', router);

  const PORT = process.env.MCP_HTTP_PORT || process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`[Giramichi MCP HTTP Server] Running on http://localhost:${PORT}`);
    console.log(`  - Streamable HTTP Endpoint: http://localhost:${PORT}/mcp`);
    console.log(`  - SSE Stream Endpoint:      http://localhost:${PORT}/mcp/sse`);
    console.log(`  - SSE Post Endpoint:        http://localhost:${PORT}/mcp/messages`);
  });
}
