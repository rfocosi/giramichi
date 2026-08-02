import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://192.168.50.10:3001';

test.describe('Giramichi API Endpoints Tests', () => {
  test.describe('1. Board, Sessions & Workflows Endpoints', () => {
    test('GET /api/board - should return board state with active session and tasks', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/board`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.workflow).toBeDefined();
      expect(body.workflow.id).toBeDefined();
      expect(Array.isArray(body.workflow.statuses)).toBe(true);
      expect(Array.isArray(body.sessions)).toBe(true);
      expect(body.activeSessionId).toBeDefined();
      expect(Array.isArray(body.tasks)).toBe(true);
      expect(Array.isArray(body.logs)).toBe(true);
    });

    test('GET /api/sessions - should list active and queued sessions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/sessions`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.sessions)).toBe(true);
      expect(body.sessions.length).toBeGreaterThan(0);
      expect(body.activeSessionId).toBeDefined();
    });

    test('GET /api/sessions/:id - should return detailed information for a valid session', async ({ request }) => {
      const sessionsRes = await request.get(`${API_BASE_URL}/api/sessions`);
      const sessionsBody = await sessionsRes.json();
      const targetSessionId = sessionsBody.activeSessionId || sessionsBody.sessions[0]?.id;

      expect(targetSessionId).toBeDefined();

      const response = await request.get(`${API_BASE_URL}/api/sessions/${targetSessionId}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.session).toBeDefined();
      expect(body.session.id).toBe(targetSessionId);
      expect(Array.isArray(body.tasks)).toBe(true);
      expect(Array.isArray(body.logs)).toBe(true);
    });

    test('GET /api/sessions?status=active - should return only active sessions', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/sessions?status=active`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.sessions)).toBe(true);
      for (const session of body.sessions) {
        expect(session.status).toBe('active');
      }
    });

    test('GET /api/board?session_id - should return board filtered by target session ID', async ({ request }) => {
      const sessionsRes = await request.get(`${API_BASE_URL}/api/sessions`);
      const sessionsBody = await sessionsRes.json();
      const targetSessionId = sessionsBody.activeSessionId;

      const response = await request.get(`${API_BASE_URL}/api/board?session_id=${targetSessionId}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.activeSessionId).toBe(targetSessionId);
      expect(Array.isArray(body.tasks)).toBe(true);
    });

    test('GET /api/workflows - should return available workflows', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/workflows`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.workflows)).toBe(true);
      expect(body.workflows.length).toBeGreaterThan(0);
    });
  });

  test.describe('2. Tasks, Activity Log & Error Handling', () => {
    test('GET /api/tasks/:id - should return specific task details with activity logs', async ({ request }) => {
      const boardRes = await request.get(`${API_BASE_URL}/api/board`);
      const boardBody = await boardRes.json();
      const firstTask = boardBody.tasks[0];

      if (firstTask) {
        const response = await request.get(`${API_BASE_URL}/api/tasks/${firstTask.id}`);
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.task).toBeDefined();
        expect(body.task.id).toBe(firstTask.id);
        expect(body.task.title).toBe(firstTask.title);
        expect(body.task.status_id).toBeDefined();
        expect(body.task.priority).toBeDefined();
        expect(Array.isArray(body.logs)).toBe(true);
      }
    });

    test('GET /api/tasks/:id - should return 404 for non-existent task', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/tasks/NON_EXISTENT_TASK_9999`);
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Task not found');
    });

    test('GET /api/sessions/:id - should return 404 for non-existent session', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/sessions/NON_EXISTENT_SESSION_9999`);
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Session not found');
    });

    test('GET /api/activity - should fetch activity logs with limit parameter', async ({ request }) => {
      const limit = 10;
      const response = await request.get(`${API_BASE_URL}/api/activity?limit=${limit}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.logs.length).toBeLessThanOrEqual(limit);
    });

    test('GET /api/activity?session_id - should fetch activity logs filtered by session ID', async ({ request }) => {
      const sessionsRes = await request.get(`${API_BASE_URL}/api/sessions`);
      const sessionsBody = await sessionsRes.json();
      const targetSessionId = sessionsBody.activeSessionId;

      const response = await request.get(`${API_BASE_URL}/api/activity?session_id=${targetSessionId}&limit=5`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.logs.length).toBeLessThanOrEqual(5);
      for (const log of body.logs) {
        if (log.session_id) {
          expect(log.session_id).toBe(targetSessionId);
        }
      }
    });
  });

  test.describe('3. Real-time Events (SSE) & MCP Direct Endpoints', () => {
    test('GET /api/events - should initiate Server-Sent Events stream headers', async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      try {
        const res = await fetch(`${API_BASE_URL}/api/events`, { signal: controller.signal });
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/event-stream');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          throw err;
        }
      } finally {
        clearTimeout(timeout);
      }
    });

    test('POST /api/mcp-direct - should execute MCP tool call and return result', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/mcp-direct`, {
        data: {
          name: 'giramichi_get_board',
          args: {},
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toBeDefined();
      expect(Array.isArray(body.result.content)).toBe(true);
      const parsedText = JSON.parse(body.result.content[0].text);
      expect(parsedText.workflow).toBeDefined();
    });

    test('POST /api/mcp-direct - should return 400 when tool name is missing', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/mcp-direct`, {
        data: {},
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Tool name required');
    });
  });
});

