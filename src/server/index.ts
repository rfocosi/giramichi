import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from '../db/db.js';
import { handleToolCall } from '../mcp/tools.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// Read-only Board API
app.get('/api/board', (req: Request, res: Response) => {
  try {
    const workflow = db.getActiveWorkflow();
    const tasks = db.getTasks(workflow.id);
    const logs = db.getActivityLogs(20);
    res.json({ success: true, workflow, tasks, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Read-only Workflows API
app.get('/api/workflows', (req: Request, res: Response) => {
  try {
    const workflows = db.getWorkflows();
    res.json({ success: true, workflows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Read-only Task Detail API
app.get('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const task = db.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    const logs = db.getActivityLogs(100).filter((l) => l.task_id === taskId);
    res.json({ success: true, task, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Read-only Activity Logs API
app.get('/api/activity', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const logs = db.getActivityLogs(limit);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// MCP direct execution endpoint (for testing & simulation)
app.post('/api/mcp-direct', async (req: Request, res: Response) => {
  try {
    const { name, args } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Tool name required' });
    }
    const result = await handleToolCall(name, args || {});
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Giramichi Server] Running on http://localhost:${PORT}`);
  console.log(`[Giramichi Server] Real-time SSE stream at http://localhost:${PORT}/api/events`);
});
