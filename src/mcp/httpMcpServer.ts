import express, { Router, Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from './mcpServer.js';
import { authenticateAgent } from '../auth/middleware.js';

// Map of active SSE transports by session ID
const sseTransports = new Map<string, SSEServerTransport>();

// Map of active Streamable HTTP transports by session ID
const streamableTransports = new Map<string, StreamableHTTPServerTransport>();

export function createHttpMcpRouter(): Router {
  const router = Router();
  router.use(authenticateAgent);

  // ---------------------------------------------------------
  // 1. SSE Transport Endpoints (Legacy / Compatibility Mode)
  // ---------------------------------------------------------

  // GET /sse (or /mcp/sse) - Establishes SSE stream connection
  router.get('/sse', async (req: Request, res: Response) => {
    console.log('[Giramichi MCP HTTP] Incoming SSE connection request');

    // Determine post endpoint URL based on current router mounting path
    const baseUrl = req.baseUrl || '/mcp';
    const postEndpoint = `${baseUrl}/messages`;

    const transport = new SSEServerTransport(postEndpoint, res);
    const server = createMCPServer();

    sseTransports.set(transport.sessionId, transport);
    console.log(`[Giramichi MCP HTTP] SSE Session initialized: ${transport.sessionId}`);

    transport.onclose = () => {
      console.log(`[Giramichi MCP HTTP] SSE Session closed: ${transport.sessionId}`);
      sseTransports.delete(transport.sessionId);
    };

    try {
      await server.connect(transport);
    } catch (err: any) {
      console.error('[Giramichi MCP HTTP] Error connecting SSE transport:', err);
      sseTransports.delete(transport.sessionId);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to initialize SSE connection' });
      }
    }
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
      res.status(404).json({ error: `SSE Session '${sessionId}' not found or has expired` });
      return;
    }

    try {
      await transport.handlePostMessage(req, res);
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
