import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

test.describe('Reports & Analytics API Endpoint Suite', () => {
  test('GET /api/reports - should return full reports telemetry and summary metrics', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/reports`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.reports).toBeDefined();

    const reports = body.reports;
    // Check summary metrics structure
    expect(reports.summary).toBeDefined();
    expect(typeof reports.summary.totalTasks).toBe('number');
    expect(typeof reports.summary.completedTasks).toBe('number');
    expect(typeof reports.summary.completionRate).toBe('number');
    expect(typeof reports.summary.avgVelocityTasksPerHour).toBe('number');
    expect(typeof reports.summary.avgCycleTimeMinutes).toBe('number');
    expect(typeof reports.summary.totalTokens).toBe('number');
    expect(typeof reports.summary.totalCostUsd).toBe('number');
    expect(typeof reports.summary.estimatedHumanHoursSaved).toBe('number');
    expect(typeof reports.summary.roiMultiplier).toBe('number');

    // Check arrays
    expect(Array.isArray(reports.dwellTimes)).toBe(true);
    expect(Array.isArray(reports.agentBreakdown)).toBe(true);
    expect(Array.isArray(reports.modelBreakdown)).toBe(true);
    expect(Array.isArray(reports.costByTag)).toBe(true);
    expect(Array.isArray(reports.tasks)).toBe(true);
  });

  test('GET /api/reports?timeframe=24h - should return filtered metrics for 24 hours', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/reports?timeframe=24h`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.reports.timeframe).toBe('24h');
  });

  test('GET /api/reports?session_id=sess-default - should filter metrics by session', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/reports?session_id=sess-default`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    // All returned tasks should belong to sess-default
    for (const t of body.reports.tasks) {
      expect(t.sessionId).toBe('sess-default');
    }
  });
});
