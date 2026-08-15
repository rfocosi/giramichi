import { calculateCost } from './reportsEngine.js';

export interface TelemetryMetrics {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  duration_ms: number;
  cost_usd: number;
}

/**
 * Detects the most appropriate model identifier based on agent ID or explicit model string.
 */
export function detectModel(agentId?: string, explicitModel?: string): string {
  if (explicitModel && explicitModel.trim() !== '' && explicitModel !== 'unspecified') {
    return explicitModel.toLowerCase().trim();
  }

  if (!agentId) return 'gemini-2.0-flash';

  const normalized = agentId.toLowerCase();
  if (normalized.includes('claude') || normalized.includes('sonnet')) {
    return 'claude-3-5-sonnet';
  }
  if (normalized.includes('opus')) {
    return 'claude-3-opus';
  }
  if (normalized.includes('haiku')) {
    return 'claude-3-5-haiku';
  }
  if (normalized.includes('gpt-4o-mini')) {
    return 'gpt-4o-mini';
  }
  if (normalized.includes('gpt-4') || normalized.includes('openai')) {
    return 'gpt-4o';
  }
  if (normalized.includes('deepseek-r1')) {
    return 'deepseek-r1';
  }
  if (normalized.includes('deepseek')) {
    return 'deepseek-v3';
  }
  if (normalized.includes('gemini-1.5-pro') || normalized.includes('gemini-pro')) {
    return 'gemini-1.5-pro';
  }
  if (normalized.includes('gemini') || normalized.includes('antigravity')) {
    return 'gemini-2.0-flash';
  }

  return 'gemini-2.0-flash';
}

/**
 * Automatically computes or passes through execution telemetry metrics.
 * If the agent provided explicit metrics, it honors them and calculates the cost.
 * If metrics are omitted or partial, it measures the payload size and derives realistic token usage.
 */
export function autoInferMetrics(
  payload: {
    title?: string;
    description?: string;
    reason?: string;
    agentId?: string;
  },
  explicitMetrics?: Partial<TelemetryMetrics>
): TelemetryMetrics {
  const model = detectModel(payload.agentId, explicitMetrics?.model);

  let promptTokens = explicitMetrics?.prompt_tokens ?? 0;
  let completionTokens = explicitMetrics?.completion_tokens ?? 0;
  let cachedTokens = explicitMetrics?.cached_tokens ?? 0;
  let durationMs = explicitMetrics?.duration_ms ?? 0;

  // Auto-derive if token counts are missing
  if (promptTokens === 0 && completionTokens === 0) {
    const textContent = `${payload.title || ''} ${payload.description || ''} ${payload.reason || ''}`.trim();
    const textCharLength = Math.max(20, textContent.length);

    // Baseline system prompt + MCP schema + conversation history overhead (~3,000 to 5,000 tokens)
    const basePromptOverhead = 3200;
    const dynamicPrompt = Math.round(textCharLength / 3.8 * 8); // Context expansion multiplier
    promptTokens = basePromptOverhead + dynamicPrompt;

    // Completion tokens derived from output content length
    completionTokens = Math.max(80, Math.round(textCharLength / 3.6));
    cachedTokens = Math.round(promptTokens * 0.4); // ~40% prompt caching ratio
  }

  if (durationMs === 0) {
    durationMs = Math.max(500, Math.round(completionTokens * 12));
  }

  const costUsd = explicitMetrics?.cost_usd !== undefined
    ? explicitMetrics.cost_usd
    : calculateCost(model, promptTokens, completionTokens, cachedTokens);

  return {
    model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    cached_tokens: cachedTokens,
    duration_ms: durationMs,
    cost_usd: Number(costUsd.toFixed(6)),
  };
}

export const MCP_INSTRUCTION_HINT =
  "💡 TIP: Include the optional 'metrics' object ({ model: string, prompt_tokens: number, completion_tokens: number }) when calling Giramichi tools for precise analytics. Refer to .agents/AGENTS.md.";
