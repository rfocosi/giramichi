import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from '../db/index.js';
import { handleToolCall } from '../mcp/tools.js';
import { createHttpMcpRouter } from '../mcp/httpMcpServer.js';
import { authenticateAgent } from '../auth/middleware.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mount HTTP MCP Protocol endpoints
const httpMcpRouter = createHttpMcpRouter();
app.use('/mcp', httpMcpRouter);
app.use('/api/mcp', httpMcpRouter);

// List of connected SSE clients
const sseClients: Response[] = [];

// Subscribe DB changes to push SSE updates to frontend
db.subscribe((event, data) => {
  const payload = `data: ${JSON.stringify({ event, data, timestamp: new Date().toISOString() })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
});

// SSE Endpoint for real-time dashboard updates
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', message: 'Realtime Giramichi SSE Stream Established' })}\n\n`);

  sseClients.push(res);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
});

// Sessions API
app.get('/api/sessions', async (req: Request, res: Response) => {
  try {
    const status = req.query.status ? (req.query.status as string) : undefined;
    const sessions = await db.getSessions(status);
    const activeSession = await db.getActiveSession();
    res.json({ success: true, sessions, activeSessionId: activeSession.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sessions/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const session = await db.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    const tasks = await db.getTasks(undefined, sessionId);
    const logs = await db.getActivityLogs(50, sessionId);
    res.json({ success: true, session, tasks, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Read-only Board API
app.get('/api/board', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id ? (req.query.session_id as string) : undefined;
    const sessions = await db.getSessions();
    const activeSession = await db.getActiveSession();
    const targetSessionId = sessionId || activeSession.id;
    const workflow = await db.getActiveWorkflow();
    const tasks = await db.getTasks(workflow.id, targetSessionId);
    const logs = await db.getActivityLogs(20, targetSessionId);
    res.json({ success: true, workflow, sessions, activeSessionId: targetSessionId, tasks, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Read-only Workflows API
app.get('/api/workflows', async (req: Request, res: Response) => {
  try {
    const workflows = await db.getWorkflows();
    res.json({ success: true, workflows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Read-only Task Detail API
app.get('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const task = await db.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    const logs = (await db.getActivityLogs(100)).filter((l) => l.task_id === taskId);
    res.json({ success: true, task, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Read-only Activity Logs API
app.get('/api/activity', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const sessionId = req.query.session_id ? (req.query.session_id as string) : undefined;
    const logs = await db.getActivityLogs(limit, sessionId);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// MCP direct execution endpoint (for testing & simulation)
app.post('/api/mcp-direct', authenticateAgent, async (req: Request, res: Response) => {
  try {
    const { name, args } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Tool name required' });
    }
    const result = await handleToolCall(name, args || {}, req.agentId);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Giramichi Server] Running on http://localhost:${PORT}`);
  console.log(`[Giramichi Server] MCP Streamable HTTP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`[Giramichi Server] MCP SSE Stream endpoint:      http://localhost:${PORT}/mcp/sse`);
  console.log(`[Giramichi Server] Real-time SSE stream at       http://localhost:${PORT}/api/events`);
});
