import { test, expect } from '@playwright/test';
import type { Request, Response } from 'express';
import { authenticateAgent } from '../../src/auth/middleware.js';

test.describe('Authentication & Security Middleware Tests', () => {
  const originalEnv = process.env.AUTH_MODE;

  test.afterEach(() => {
    process.env.AUTH_MODE = originalEnv;
  });

  test('AUTH_MODE=disabled - should set agentId to anonymous when no headers are provided', async () => {
    process.env.AUTH_MODE = 'disabled';

    const req = {
      headers: {},
    } as unknown as Request;

    const res = {} as Response;
    let nextCalled = false;

    await authenticateAgent(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.agentId).toBe('anonymous');
  });

  test('AUTH_MODE=disabled - should set agentId from x-agent-id header', async () => {
    process.env.AUTH_MODE = 'disabled';

    const req = {
      headers: {
        'x-agent-id': 'Claude-3.5-Sonnet',
      },
    } as unknown as Request;

    const res = {} as Response;
    let nextCalled = false;

    await authenticateAgent(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.agentId).toBe('Claude-3.5-Sonnet');
  });

  test('AUTH_MODE=oauth2 - should reject request missing Authorization header with 401', async () => {
    process.env.AUTH_MODE = 'oauth2';

    const req = {
      headers: {},
    } as unknown as Request;

    let responseStatus: number | null = null;
    let responseJson: any = null;

    const res = {
      status: (status: number) => {
        responseStatus = status;
        return {
          json: (data: any) => {
            responseJson = data;
          },
        };
      },
    } as unknown as Response;

    let nextCalled = false;
    await authenticateAgent(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(responseStatus).toBe(401);
    expect(responseJson?.success).toBe(false);
    expect(responseJson?.error).toContain('Authorization header with Bearer token is required');
  });

  test('AUTH_MODE=oauth2 - should reject request with invalid Bearer token', async () => {
    process.env.AUTH_MODE = 'oauth2';

    const req = {
      headers: {
        authorization: 'Bearer INVALID_JWT_TOKEN_123',
      },
    } as unknown as Request;

    let responseStatus: number | null = null;
    let responseJson: any = null;

    const res = {
      status: (status: number) => {
        responseStatus = status;
        return {
          json: (data: any) => {
            responseJson = data;
          },
        };
      },
    } as unknown as Response;

    let nextCalled = false;
    await authenticateAgent(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(responseStatus).toBe(401);
    expect(responseJson?.success).toBe(false);
    expect(responseJson?.error).toContain('Token verification failed');
  });
});
