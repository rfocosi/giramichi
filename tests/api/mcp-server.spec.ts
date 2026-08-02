import { test, expect } from '@playwright/test';

const MCP_BASE_URL = process.env.MCP_SERVER_URL || process.env.API_BASE_URL || 'http://192.168.50.10:3001';

test.describe('Giramichi MCP Server HTTP Endpoints Spec', () => {
  let mcpSessionId: string = '';

  test.describe.serial('1. Streamable HTTP Protocol Handshake & Tool Calls', () => {
    test('POST /mcp - should initialize MCP session and return mcp-session-id header', async ({ request }) => {
      const response = await request.post(`${MCP_BASE_URL}/mcp`, {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json',
        },
        data: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'giramichi-playwright-test',
              version: '1.0.0',
            },
          },
        },
      });

      expect(response.status()).toBe(200);

      const headers = response.headers();
      mcpSessionId = headers['mcp-session-id'] || '';
      expect(mcpSessionId).not.toBe('');

      const text = await response.text();
      expect(text).toContain('jsonrpc');
      expect(text).toContain('2.0');
      expect(text).toContain('giramichi');
    });

    test('POST /mcp - should accept notifications/initialized notification', async ({ request }) => {
      expect(mcpSessionId).not.toBe('');

      const response = await request.post(`${MCP_BASE_URL}/mcp`, {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json',
          'mcp-session-id': mcpSessionId,
        },
        data: {
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        },
      });

      expect([200, 202]).toContain(response.status());
    });

    test('POST /mcp - tools/list - should list registered MCP tools', async ({ request }) => {
      expect(mcpSessionId).not.toBe('');

      const response = await request.post(`${MCP_BASE_URL}/mcp`, {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json',
          'mcp-session-id': mcpSessionId,
        },
        data: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        },
      });

      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(text).toContain('jsonrpc');
      expect(text).toContain('giramichi_get_board');
      expect(text).toContain('giramichi_create_task');
      expect(text).toContain('giramichi_move_task');
      expect(text).toContain('giramichi_get_activity_log');
    });

    test('POST /mcp - tools/call - should execute giramichi_get_board tool call', async ({ request }) => {
      expect(mcpSessionId).not.toBe('');

      const response = await request.post(`${MCP_BASE_URL}/mcp`, {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json',
          'mcp-session-id': mcpSessionId,
        },
        data: {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'giramichi_get_board',
            arguments: {},
          },
        },
      });

      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(text).toContain('jsonrpc');
      expect(text).toContain('workflow');
    });

    test('POST /mcp - tools/call - should execute giramichi_get_activity_log tool call', async ({ request }) => {
      expect(mcpSessionId).not.toBe('');

      const response = await request.post(`${MCP_BASE_URL}/mcp`, {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json',
          'mcp-session-id': mcpSessionId,
        },
        data: {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'giramichi_get_activity_log',
            arguments: { limit: 5 },
          },
        },
      });

      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(text).toContain('jsonrpc');
      expect(text).toContain('logs');
    });

    test('POST /mcp - tools/call - should execute giramichi_create_session tool call', async ({ request }) => {
      expect(mcpSessionId).not.toBe('');

      const response = await request.post(`${MCP_BASE_URL}/mcp`, {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json',
          'mcp-session-id': mcpSessionId,
        },
        data: {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'giramichi_create_session',
            arguments: {
              name: 'Playwright Test Session',
              description: 'Created during MCP API test run',
              agent_id: 'Playwright-Tester',
            },
          },
        },
      });

      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(text).toContain('jsonrpc');
      expect(text).toContain('Playwright Test Session');
    });

    test('POST /mcp - tools/call - should handle unknown tool gracefully', async ({ request }) => {
      expect(mcpSessionId).not.toBe('');

      const response = await request.post(`${MCP_BASE_URL}/mcp`, {
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json',
          'mcp-session-id': mcpSessionId,
        },
        data: {
          jsonrpc: '2.0',
          id: 6,
          method: 'tools/call',
          params: {
            name: 'non_existent_tool_xyz',
            arguments: {},
          },
        },
      });

      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(text).toContain('jsonrpc');
      expect(text.toLowerCase()).toContain('unknown tool');
    });
  });


  test.describe('2. SSE Transport & Endpoint Validation', () => {
    test('GET /mcp/sse - should establish SSE stream with correct headers', async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      try {
        const res = await fetch(`${MCP_BASE_URL}/mcp/sse`, { signal: controller.signal });
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

    test('POST /mcp/messages - should return 400 when sessionId parameter is missing', async ({ request }) => {
      const response = await request.post(`${MCP_BASE_URL}/mcp/messages`, {
        data: {
          jsonrpc: '2.0',
          id: 5,
          method: 'ping',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('sessionId');
    });

    test('POST /mcp/messages - should return 404 when sessionId is invalid or expired', async ({ request }) => {
      const response = await request.post(`${MCP_BASE_URL}/mcp/messages?sessionId=INVALID_SESSION_999`, {
        data: {
          jsonrpc: '2.0',
          id: 6,
          method: 'ping',
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toContain('not found');
    });
  });
});
