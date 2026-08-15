import { Task, ActivityLog, Workflow, Session, Status } from '../db/types.js';

export interface ModelPricing {
  promptCostPerMillion: number;
  completionCostPerMillion: number;
  cachedReadCostPerMillion?: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic Claude Models
  'claude-3-5-sonnet': { promptCostPerMillion: 3.0, completionCostPerMillion: 15.0, cachedReadCostPerMillion: 0.3 },
  'claude-3-5-sonnet-20241022': { promptCostPerMillion: 3.0, completionCostPerMillion: 15.0, cachedReadCostPerMillion: 0.3 },
  'claude-3.5-sonnet': { promptCostPerMillion: 3.0, completionCostPerMillion: 15.0, cachedReadCostPerMillion: 0.3 },
  'claude-3-5-haiku': { promptCostPerMillion: 0.8, completionCostPerMillion: 4.0, cachedReadCostPerMillion: 0.08 },
  'claude-3-opus': { promptCostPerMillion: 15.0, completionCostPerMillion: 75.0 },
  
  // OpenAI Models
  'gpt-4o': { promptCostPerMillion: 2.5, completionCostPerMillion: 10.0 },
  'gpt-4o-mini': { promptCostPerMillion: 0.15, completionCostPerMillion: 0.6 },
  'o1': { promptCostPerMillion: 15.0, completionCostPerMillion: 60.0 },
  'o1-mini': { promptCostPerMillion: 3.0, completionCostPerMillion: 12.0 },
  'o3-mini': { promptCostPerMillion: 1.1, completionCostPerMillion: 4.4 },

  // Google Gemini Models
  'gemini-1.5-pro': { promptCostPerMillion: 3.5, completionCostPerMillion: 10.5 },
  'gemini-1.5-flash': { promptCostPerMillion: 0.075, completionCostPerMillion: 0.3 },
  'gemini-2.0-flash': { promptCostPerMillion: 0.10, completionCostPerMillion: 0.4 },
  'gemini-2.0-flash-exp': { promptCostPerMillion: 0.10, completionCostPerMillion: 0.4 },

  // DeepSeek & Open Source
  'deepseek-chat': { promptCostPerMillion: 0.14, completionCostPerMillion: 0.28 },
  'deepseek-reasoner': { promptCostPerMillion: 0.55, completionCostPerMillion: 2.19 },
  'deepseek-v3': { promptCostPerMillion: 0.14, completionCostPerMillion: 0.28 },
  'deepseek-r1': { promptCostPerMillion: 0.55, completionCostPerMillion: 2.19 },
};

export const DEFAULT_PRICING: ModelPricing = {
  promptCostPerMillion: 2.0,
  completionCostPerMillion: 8.0,
};

export function calculateCost(
  model: string = 'claude-3-5-sonnet',
  promptTokens: number = 0,
  completionTokens: number = 0,
  cachedTokens: number = 0
): number {
  const normModel = model.toLowerCase().trim();
  const pricing = Object.entries(MODEL_PRICING).find(([k]) => normModel.includes(k))?.[1] || DEFAULT_PRICING;

  const promptCost = (promptTokens / 1_000_000) * pricing.promptCostPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionCostPerMillion;
  const cachedCost = (cachedTokens / 1_000_000) * (pricing.cachedReadCostPerMillion || pricing.promptCostPerMillion * 0.1);

  return Number((promptCost + completionCost + cachedCost).toFixed(6));
}

export interface TaskMetrics {
  taskId: string;
  title: string;
  priority: string;
  statusId: string;
  sessionId: string;
  agentId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  costUsd: number;
  durationMs: number;
  cycleTimeMs: number;
  leadTimeMs: number;
  transitionCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface StageDwellMetric {
  statusId: string;
  statusName: string;
  color: string;
  order: number;
  totalDurationMs: number;
  avgDurationMs: number;
  taskCount: number;
  percentageOfTotal: number;
}

export interface AgentMetricsSummary {
  agentId: string;
  totalTasks: number;
  completedTasks: number;
  totalTokens: number;
  costUsd: number;
  avgCycleTimeMs: number;
}

export interface ModelMetricsSummary {
  model: string;
  totalTasks: number;
  totalTokens: number;
  costUsd: number;
}

export interface ReportsData {
  timeframe: string;
  generatedAt: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    waitingTasks: number;
    completionRate: number; // percentage 0 - 100
    avgVelocityTasksPerHour: number;
    avgCycleTimeMinutes: number;
    avgLeadTimeMinutes: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCachedTokens: number;
    totalTokens: number;
    totalCostUsd: number;
    avgCostPerCompletedTaskUsd: number;
    estimatedHumanHoursSaved: number;
    estimatedHumanValueUsd: number;
    roiMultiplier: number;
    totalTransitions: number;
    reworkCount: number;
    reworkRate: number;
  };
  dwellTimes: StageDwellMetric[];
  agentBreakdown: AgentMetricsSummary[];
  modelBreakdown: ModelMetricsSummary[];
  costByPriority: Record<string, { count: number; costUsd: number; tokens: number }>;
  costByTag: Array<{ tag: string; count: number; costUsd: number; tokens: number }>;
  timeSeries: Array<{
    date: string;
    completedCount: number;
    tokens: number;
    costUsd: number;
  }>;
  tasks: TaskMetrics[];
}

export function generateReportsData(
  allTasks: Task[],
  allLogs: ActivityLog[],
  workflow: Workflow | null,
  sessions: Session[],
  filterSessionId?: string,
  timeframe: 'all' | '24h' | '7d' | '30d' = 'all'
): ReportsData {
  const now = new Date();
  let timeThreshold = 0;
  if (timeframe === '24h') timeThreshold = now.getTime() - 24 * 60 * 60 * 1000;
  else if (timeframe === '7d') timeThreshold = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  else if (timeframe === '30d') timeThreshold = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  // Filter tasks by session and timeframe
  let tasks = allTasks;
  if (filterSessionId && filterSessionId !== 'all') {
    tasks = tasks.filter((t) => t.session_id === filterSessionId);
  }
  if (timeThreshold > 0) {
    tasks = tasks.filter((t) => new Date(t.created_at).getTime() >= timeThreshold || new Date(t.updated_at).getTime() >= timeThreshold);
  }

  // Filter logs
  let logs = allLogs;
  if (filterSessionId && filterSessionId !== 'all') {
    logs = logs.filter((l) => l.session_id === filterSessionId);
  }
  if (timeThreshold > 0) {
    logs = logs.filter((l) => new Date(l.timestamp).getTime() >= timeThreshold);
  }

  const statuses = workflow?.statuses || [
    { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1 },
    { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2 },
    { id: 'done', name: 'Done', color: '#10b981', order: 3 },
  ];

  const statusOrderMap = new Map<string, number>();
  const statusObjMap = new Map<string, Status>();
  statuses.forEach((s) => {
    statusOrderMap.set(s.id, s.order);
    statusObjMap.set(s.id, s);
  });

  const sessionMap = new Map<string, Session>();
  sessions.forEach((s) => sessionMap.set(s.id, s));

  // Build task logs map
  const taskLogsMap = new Map<string, ActivityLog[]>();
  logs.forEach((log) => {
    if (log.task_id) {
      if (!taskLogsMap.has(log.task_id)) {
        taskLogsMap.set(log.task_id, []);
      }
      taskLogsMap.get(log.task_id)!.push(log);
    }
  });

  // Sort logs chronologically per task
  taskLogsMap.forEach((arr) => {
    arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });

  // Analyze Tasks and Compute Task Metrics
  const taskMetricsList: TaskMetrics[] = [];
  let reworkCount = 0;
  let totalTransitions = 0;

  const stageDurationAccumulator = new Map<string, { totalMs: number; count: number }>();
  statuses.forEach((s) => stageDurationAccumulator.set(s.id, { totalMs: 0, count: 0 }));

  tasks.forEach((task) => {
    const taskLogs = taskLogsMap.get(task.id) || [];
    const taskSession = sessionMap.get(task.session_id);
    const agentId = task.metadata?.agent_id || taskLogs.find((l) => l.agent_id)?.agent_id || taskSession?.agent_id || 'AI-Agent';
    const model = task.metadata?.metrics?.model || task.metadata?.model || 'unspecified';

    // Token metrics: strictly explicit telemetry from agent metadata (0 for legacy tasks)
    const promptTokens = task.metadata?.metrics?.prompt_tokens ?? task.metadata?.prompt_tokens ?? 0;
    const completionTokens = task.metadata?.metrics?.completion_tokens ?? task.metadata?.completion_tokens ?? 0;
    const cachedTokens = task.metadata?.metrics?.cached_tokens ?? task.metadata?.cached_tokens ?? 0;
    const durationMs = task.metadata?.metrics?.duration_ms ?? task.metadata?.duration_ms ?? 0;
    const explicitCost = task.metadata?.metrics?.cost_usd ?? task.metadata?.cost_usd;

    const totalTokens = promptTokens + completionTokens;
    const costUsd = explicitCost !== undefined
      ? explicitCost
      : (totalTokens > 0 || cachedTokens > 0)
        ? calculateCost(model, promptTokens, completionTokens, cachedTokens)
        : 0;

    // Compute Lead Time & Cycle Time
    const createdTime = new Date(task.created_at).getTime();
    const updatedTime = new Date(task.updated_at).getTime();
    const leadTimeMs = Math.max(0, updatedTime - createdTime);

    // Dwell times per stage for this task
    let inProgressStartTime: number | null = null;
    let doneTime: number | null = null;
    let lastTransitionTime = createdTime;
    let currentStatus = 'waiting';

    taskLogs.forEach((l) => {
      if (l.action_type === 'TASK_MOVED' && l.to_status) {
        totalTransitions++;
        const logTime = new Date(l.timestamp).getTime();
        const durationInPrevStage = Math.max(0, logTime - lastTransitionTime);

        // Accumulate stage dwell
        if (stageDurationAccumulator.has(currentStatus)) {
          const acc = stageDurationAccumulator.get(currentStatus)!;
          acc.totalMs += durationInPrevStage;
          acc.count++;
        }

        // Check for backward transition / rework
        const prevOrder = statusOrderMap.get(l.from_status || currentStatus) || 1;
        const nextOrder = statusOrderMap.get(l.to_status) || 1;
        if (nextOrder < prevOrder) {
          reworkCount++;
        }

        if (l.to_status === 'in_progress' && !inProgressStartTime) {
          inProgressStartTime = logTime;
        }
        if (l.to_status === 'done' || l.to_status === 'completed') {
          doneTime = logTime;
        }

        currentStatus = l.to_status;
        lastTransitionTime = logTime;
      }
    });

    // Remainder dwell time for active tasks
    if (task.status_id) {
      const currentElapsed = Math.max(0, now.getTime() - lastTransitionTime);
      if (stageDurationAccumulator.has(task.status_id)) {
        const acc = stageDurationAccumulator.get(task.status_id)!;
        acc.totalMs += currentElapsed;
        acc.count++;
      }
    }

    let cycleTimeMs = 0;
    if (task.status_id === 'done' || task.status_id === 'completed') {
      if (inProgressStartTime && doneTime) {
        cycleTimeMs = Math.max(0, doneTime - inProgressStartTime);
      } else if (inProgressStartTime) {
        cycleTimeMs = Math.max(0, updatedTime - inProgressStartTime);
      } else {
        cycleTimeMs = leadTimeMs > 0 ? leadTimeMs : (durationMs || 180000);
      }
    } else if (inProgressStartTime) {
      cycleTimeMs = Math.max(0, now.getTime() - inProgressStartTime);
    }

    taskMetricsList.push({
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      statusId: task.status_id,
      sessionId: task.session_id,
      agentId,
      model,
      promptTokens,
      completionTokens,
      cachedTokens,
      totalTokens,
      costUsd,
      durationMs: durationMs || cycleTimeMs,
      cycleTimeMs,
      leadTimeMs,
      transitionCount: taskLogs.filter((l) => l.action_type === 'TASK_MOVED').length,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      tags: task.tags || [],
    });
  });

  // Calculate Stage Dwell Time array
  let totalStageDurationAll = 0;
  stageDurationAccumulator.forEach((val) => (totalStageDurationAll += val.totalMs));

  const dwellTimes: StageDwellMetric[] = statuses.map((s) => {
    const acc = stageDurationAccumulator.get(s.id) || { totalMs: 0, count: 0 };
    const avgDurationMs = acc.count > 0 ? Math.round(acc.totalMs / acc.count) : 0;
    const percentageOfTotal = totalStageDurationAll > 0 ? Number(((acc.totalMs / totalStageDurationAll) * 100).toFixed(1)) : 0;

    return {
      statusId: s.id,
      statusName: s.name,
      color: s.color,
      order: s.order,
      totalDurationMs: acc.totalMs,
      avgDurationMs,
      taskCount: acc.count,
      percentageOfTotal,
    };
  });

  // Summaries
  const totalTasks = tasks.length;
  const completedTasksList = taskMetricsList.filter((t) => t.statusId === 'done' || t.statusId === 'completed');
  const completedTasks = completedTasksList.length;
  const inProgressTasks = taskMetricsList.filter((t) => t.statusId === 'in_progress').length;
  const waitingTasks = taskMetricsList.filter((t) => t.statusId === 'waiting' || t.statusId === 'backlog').length;
  const completionRate = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

  // Cycle time & Lead time averages for completed tasks
  const avgCycleTimeMs = completedTasks > 0 ? completedTasksList.reduce((acc, t) => acc + t.cycleTimeMs, 0) / completedTasks : 0;
  const avgLeadTimeMs = completedTasks > 0 ? completedTasksList.reduce((acc, t) => acc + t.leadTimeMs, 0) / completedTasks : 0;
  const avgCycleTimeMinutes = Number((avgCycleTimeMs / (1000 * 60)).toFixed(1));
  const avgLeadTimeMinutes = Number((avgLeadTimeMs / (1000 * 60)).toFixed(1));

  // Velocity (tasks/hr)
  let earliestCreatedTime = now.getTime();
  tasks.forEach((t) => {
    const tTime = new Date(t.created_at).getTime();
    if (tTime < earliestCreatedTime) earliestCreatedTime = tTime;
  });
  const sessionSpanHours = Math.max(0.5, (now.getTime() - earliestCreatedTime) / (1000 * 60 * 60));
  const avgVelocityTasksPerHour = Number((completedTasks / sessionSpanHours).toFixed(2));

  // Tokens & Costs Totals
  const totalPromptTokens = taskMetricsList.reduce((acc, t) => acc + t.promptTokens, 0);
  const totalCompletionTokens = taskMetricsList.reduce((acc, t) => acc + t.completionTokens, 0);
  const totalCachedTokens = taskMetricsList.reduce((acc, t) => acc + t.cachedTokens, 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCostUsd = Number(taskMetricsList.reduce((acc, t) => acc + t.costUsd, 0).toFixed(4));
  const avgCostPerCompletedTaskUsd = completedTasks > 0 ? Number((totalCostUsd / completedTasks).toFixed(4)) : Number((totalCostUsd / (totalTasks || 1)).toFixed(4));

  // ROI Estimation
  const estimatedHumanHoursSaved = Number((completedTasks * 1.5).toFixed(1)); // ~1.5 engineering hours per task
  const estimatedHumanValueUsd = Number((estimatedHumanHoursSaved * 100).toFixed(2)); // $100/hr blended engineer rate
  const roiMultiplier = totalCostUsd > 0 ? Math.round(estimatedHumanValueUsd / totalCostUsd) : 0;
  const reworkRate = totalTransitions > 0 ? Number(((reworkCount / totalTransitions) * 100).toFixed(1)) : 0;

  // Agent Breakdown
  const agentMap = new Map<string, { totalTasks: number; completedTasks: number; totalTokens: number; costUsd: number; cycleTimes: number[] }>();
  taskMetricsList.forEach((t) => {
    const aId = t.agentId || 'AI-Agent';
    if (!agentMap.has(aId)) {
      agentMap.set(aId, { totalTasks: 0, completedTasks: 0, totalTokens: 0, costUsd: 0, cycleTimes: [] });
    }
    const acc = agentMap.get(aId)!;
    acc.totalTasks++;
    if (t.statusId === 'done' || t.statusId === 'completed') {
      acc.completedTasks++;
      if (t.cycleTimeMs > 0) acc.cycleTimes.push(t.cycleTimeMs);
    }
    acc.totalTokens += t.totalTokens;
    acc.costUsd += t.costUsd;
  });

  const agentBreakdown: AgentMetricsSummary[] = Array.from(agentMap.entries()).map(([agentId, data]) => ({
    agentId,
    totalTasks: data.totalTasks,
    completedTasks: data.completedTasks,
    totalTokens: data.totalTokens,
    costUsd: Number(data.costUsd.toFixed(4)),
    avgCycleTimeMs: data.cycleTimes.length > 0 ? Math.round(data.cycleTimes.reduce((a, b) => a + b, 0) / data.cycleTimes.length) : 0,
  }));

  // Model Breakdown
  const modelMap = new Map<string, { totalTasks: number; totalTokens: number; costUsd: number }>();
  taskMetricsList.forEach((t) => {
    const m = t.model || 'unspecified';
    if (!modelMap.has(m)) {
      modelMap.set(m, { totalTasks: 0, totalTokens: 0, costUsd: 0 });
    }
    const acc = modelMap.get(m)!;
    acc.totalTasks++;
    acc.totalTokens += t.totalTokens;
    acc.costUsd += t.costUsd;
  });

  const modelBreakdown: ModelMetricsSummary[] = Array.from(modelMap.entries()).map(([model, data]) => ({
    model,
    totalTasks: data.totalTasks,
    totalTokens: data.totalTokens,
    costUsd: Number(data.costUsd.toFixed(4)),
  }));

  // Cost & Tokens by Priority
  const costByPriority: Record<string, { count: number; costUsd: number; tokens: number }> = {
    urgent: { count: 0, costUsd: 0, tokens: 0 },
    high: { count: 0, costUsd: 0, tokens: 0 },
    medium: { count: 0, costUsd: 0, tokens: 0 },
    low: { count: 0, costUsd: 0, tokens: 0 },
  };

  taskMetricsList.forEach((t) => {
    const p = t.priority || 'medium';
    if (costByPriority[p]) {
      costByPriority[p].count++;
      costByPriority[p].costUsd += t.costUsd;
      costByPriority[p].tokens += t.totalTokens;
    }
  });
  Object.keys(costByPriority).forEach((k) => {
    costByPriority[k].costUsd = Number(costByPriority[k].costUsd.toFixed(4));
  });

  // Cost & Tokens by Tag
  const tagMap = new Map<string, { count: number; costUsd: number; tokens: number }>();
  taskMetricsList.forEach((t) => {
    t.tags.forEach((tag) => {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, { count: 0, costUsd: 0, tokens: 0 });
      }
      const acc = tagMap.get(tag)!;
      acc.count++;
      acc.costUsd += t.costUsd;
      acc.tokens += t.totalTokens;
    });
  });

  const costByTag = Array.from(tagMap.entries())
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      costUsd: Number(data.costUsd.toFixed(4)),
      tokens: data.tokens,
    }))
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 10);

  // Time Series (Completed tasks & Token spend per day)
  const timeSeriesMap = new Map<string, { completedCount: number; tokens: number; costUsd: number }>();
  taskMetricsList.forEach((t) => {
    const d = new Date(t.updatedAt).toISOString().split('T')[0];
    if (!timeSeriesMap.has(d)) {
      timeSeriesMap.set(d, { completedCount: 0, tokens: 0, costUsd: 0 });
    }
    const dayObj = timeSeriesMap.get(d)!;
    if (t.statusId === 'done' || t.statusId === 'completed') {
      dayObj.completedCount++;
    }
    dayObj.tokens += t.totalTokens;
    dayObj.costUsd += t.costUsd;
  });

  const timeSeries = Array.from(timeSeriesMap.entries())
    .map(([date, data]) => ({
      date,
      completedCount: data.completedCount,
      tokens: data.tokens,
      costUsd: Number(data.costUsd.toFixed(4)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    timeframe,
    generatedAt: now.toISOString(),
    summary: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      waitingTasks,
      completionRate,
      avgVelocityTasksPerHour,
      avgCycleTimeMinutes,
      avgLeadTimeMinutes,
      totalPromptTokens,
      totalCompletionTokens,
      totalCachedTokens,
      totalTokens,
      totalCostUsd,
      avgCostPerCompletedTaskUsd,
      estimatedHumanHoursSaved,
      estimatedHumanValueUsd,
      roiMultiplier,
      totalTransitions,
      reworkCount,
      reworkRate,
    },
    dwellTimes,
    agentBreakdown,
    modelBreakdown,
    costByPriority,
    costByTag,
    timeSeries,
    tasks: taskMetricsList,
  };
}
