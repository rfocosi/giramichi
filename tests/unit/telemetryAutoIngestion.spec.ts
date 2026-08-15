import { test, expect } from '@playwright/test';
import { autoInferMetrics, detectModel, MCP_INSTRUCTION_HINT } from '../../src/server/telemetryAutoIngestion.js';

test.describe('Server-Side Telemetry Auto-Ingestion Unit Tests', () => {
  test('1. detectModel correctly maps agent names and explicit models', () => {
    expect(detectModel('Claude-3.5-Sonnet')).toBe('claude-3-5-sonnet');
    expect(detectModel('Antigravity-Agent')).toBe('gemini-2.0-flash');
    expect(detectModel('OpenAI-Agent')).toBe('gpt-4o');
    expect(detectModel('DeepSeek-Coder')).toBe('deepseek-v3');
    expect(detectModel(undefined, 'gpt-4o-mini')).toBe('gpt-4o-mini');
    expect(detectModel(undefined, 'gemini-1.5-pro')).toBe('gemini-1.5-pro');
  });

  test('2. autoInferMetrics computes realistic tokens when metrics are omitted', () => {
    const metrics = autoInferMetrics({
      title: 'Setup Database Connection',
      description: 'Configure Postgres connection pooling and error retries',
      agentId: 'Claude-3.5-Sonnet',
    });

    expect(metrics.model).toBe('claude-3-5-sonnet');
    expect(metrics.prompt_tokens).toBeGreaterThan(3200);
    expect(metrics.completion_tokens).toBeGreaterThan(0);
    expect(metrics.cached_tokens).toBeGreaterThan(0);
    expect(metrics.duration_ms).toBeGreaterThan(0);
    expect(metrics.cost_usd).toBeGreaterThan(0);
  });

  test('3. autoInferMetrics preserves explicit metrics supplied by agents', () => {
    const explicit = {
      model: 'gpt-4o',
      prompt_tokens: 15000,
      completion_tokens: 1200,
      cached_tokens: 5000,
      duration_ms: 2500,
    };

    const metrics = autoInferMetrics(
      { title: 'Custom Task', description: 'Explicit telemetry test' },
      explicit
    );

    expect(metrics.model).toBe('gpt-4o');
    expect(metrics.prompt_tokens).toBe(15000);
    expect(metrics.completion_tokens).toBe(1200);
    expect(metrics.cached_tokens).toBe(5000);
    expect(metrics.duration_ms).toBe(2500);
    expect(metrics.cost_usd).toBeGreaterThan(0);
  });

  test('4. MCP instruction hint is defined and informative', () => {
    expect(typeof MCP_INSTRUCTION_HINT).toBe('string');
    expect(MCP_INSTRUCTION_HINT).toContain('metrics');
    expect(MCP_INSTRUCTION_HINT).toContain('AGENTS.md');
  });
});
