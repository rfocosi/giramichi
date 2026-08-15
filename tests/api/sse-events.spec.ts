import { test, expect } from '@playwright/test';
import http from 'node:http';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Server-Sent Events (SSE) Streaming Endpoints', () => {
  test('GET /api/events - establishes SSE stream with proper headers', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/events`, { signal: controller.signal });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      expect(res.headers.get('cache-control')).toContain('no-cache');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        throw err;
      }
    } finally {
      clearTimeout(timeout);
    }
  });

  test('GET /mcp/sse - establishes MCP transport SSE stream with headers', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const res = await fetch(`${API_BASE_URL}/mcp/sse`, { signal: controller.signal });
      // When AUTH_MODE=oauth2, unauthenticated requests return 401; otherwise 200
      expect([200, 401]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers.get('content-type')).toContain('text/event-stream');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        throw err;
      }
    } finally {
      clearTimeout(timeout);
    }
  });
});
