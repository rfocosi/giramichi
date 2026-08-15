import { test, expect } from '@playwright/test';
import { calculateCost, generateReportsData, MODEL_PRICING } from '../../src/server/reportsEngine.js';
import { Task, ActivityLog, Workflow, Session } from '../../src/db/types.js';

test.describe('Reports Engine Unit Tests', () => {
  test('1. calculateCost computes correct USD based on model pricing matrix', () => {
    // Claude 3.5 Sonnet: $3 / 1M prompt, $15 / 1M completion, $0.3 / 1M cached
    const costSonnet = calculateCost('claude-3-5-sonnet', 1_000_000, 100_000, 500_000);
    // 3.0 + 1.5 + 0.15 = 4.65
    expect(costSonnet).toBe(4.65);

    // GPT-4o: $2.5 / 1M prompt, $10 / 1M completion
    const costGpt4o = calculateCost('gpt-4o', 2_000_000, 500_000, 0);
    // 5.0 + 5.0 = 10.0
    expect(costGpt4o).toBe(10);

    // DeepSeek V3: $0.14 / 1M prompt, $0.28 / 1M completion
    const costDeepSeek = calculateCost('deepseek-v3', 1_000_000, 1_000_000, 0);
    expect(costDeepSeek).toBe(0.42);
  });

  test('2. generateReportsData computes velocity, dwell times, and tokens', () => {
    const mockWorkflow: Workflow = {
      id: 'wf-test',
      name: 'Test Workflow',
      description: 'Testing',
      is_active: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      statuses: [
        { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1 },
        { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2 },
        { id: 'done', name: 'Done', color: '#10b981', order: 3 },
      ],
    };

    const mockSessions: Session[] = [
      {
        id: 'sess-1',
        name: 'Sprint Session 1',
        description: 'First test sprint',
        agent_id: 'Claude-3.5-Sonnet',
        status: 'active',
        workflow_id: 'wf-test',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockTasks: Task[] = [
      {
        id: 'GIRA-1',
        session_id: 'sess-1',
        workflow_id: 'wf-test',
        title: 'Backend API Service',
        description: 'Implement backend handlers',
        status_id: 'done',
        priority: 'urgent',
        order: 1.0,
        tags: ['backend', 'api'],
        metadata: {
          metrics: {
            model: 'claude-3-5-sonnet',
            prompt_tokens: 10000,
            completion_tokens: 2000,
            cached_tokens: 5000,
            duration_ms: 120000,
          },
        },
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: 'GIRA-2',
        session_id: 'sess-1',
        workflow_id: 'wf-test',
        title: 'Frontend Reports View',
        description: 'Build UI components',
        status_id: 'in_progress',
        priority: 'high',
        order: 2.0,
        tags: ['frontend', 'ui'],
        metadata: {
          metrics: {
            model: 'gpt-4o',
            prompt_tokens: 8000,
            completion_tokens: 1500,
            cached_tokens: 0,
            duration_ms: 60000,
          },
        },
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockLogs: ActivityLog[] = [
      {
        id: 'log-1',
        session_id: 'sess-1',
        task_id: 'GIRA-1',
        agent_id: 'Claude-3.5-Sonnet',
        action_type: 'TASK_MOVED',
        details: 'Moved to in_progress',
        from_status: 'waiting',
        to_status: 'in_progress',
        timestamp: new Date(Date.now() - 3000000).toISOString(),
      },
      {
        id: 'log-2',
        session_id: 'sess-1',
        task_id: 'GIRA-1',
        agent_id: 'Claude-3.5-Sonnet',
        action_type: 'TASK_MOVED',
        details: 'Moved to done',
        from_status: 'in_progress',
        to_status: 'done',
        timestamp: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: 'log-3',
        session_id: 'sess-1',
        task_id: 'GIRA-2',
        agent_id: 'Claude-3.5-Sonnet',
        action_type: 'TASK_MOVED',
        details: 'Moved to in_progress',
        from_status: 'waiting',
        to_status: 'in_progress',
        timestamp: new Date(Date.now() - 900000).toISOString(),
      },
    ];

    const report = generateReportsData(mockTasks, mockLogs, mockWorkflow, mockSessions, 'sess-1', 'all');

    expect(report.summary.totalTasks).toBe(2);
    expect(report.summary.completedTasks).toBe(1);
    expect(report.summary.inProgressTasks).toBe(1);
    expect(report.summary.completionRate).toBe(50);
    expect(report.summary.totalTokens).toBe(10000 + 2000 + 8000 + 1500);
    expect(report.summary.totalPromptTokens).toBe(18000);
    expect(report.summary.totalCompletionTokens).toBe(3500);
    expect(report.summary.totalCostUsd).toBeGreaterThan(0);
    expect(report.summary.estimatedHumanHoursSaved).toBe(1.5);
    expect(report.summary.estimatedHumanValueUsd).toBe(150);

    // Dwell times verification
    expect(report.dwellTimes.length).toBe(3);
    const inProgressStage = report.dwellTimes.find((d) => d.statusId === 'in_progress');
    expect(inProgressStage).toBeDefined();
    expect(inProgressStage?.taskCount).toBeGreaterThan(0);

    // Agent & Model breakdown verification
    expect(report.agentBreakdown.length).toBeGreaterThan(0);
    expect(report.modelBreakdown.length).toBeGreaterThan(0);
    expect(report.tasks.length).toBe(2);
  });

  test('3. generateReportsData handles empty dataset gracefully without NaN or errors', () => {
    const report = generateReportsData([], [], null, [], undefined, 'all');

    expect(report.summary.totalTasks).toBe(0);
    expect(report.summary.completedTasks).toBe(0);
    expect(report.summary.completionRate).toBe(0);
    expect(report.summary.avgVelocityTasksPerHour).toBe(0);
    expect(report.summary.avgCycleTimeMinutes).toBe(0);
    expect(report.summary.totalTokens).toBe(0);
    expect(report.summary.totalCostUsd).toBe(0);
    expect(report.summary.roiMultiplier).toBe(0);
    expect(Array.isArray(report.dwellTimes)).toBe(true);
    expect(Array.isArray(report.agentBreakdown)).toBe(true);
    expect(Array.isArray(report.tasks)).toBe(true);
  });

  test('4. legacy tasks without telemetry show 0 tokens and $0.00 cost', () => {
    const legacyTask: Task = {
      id: 'LEGACY-1',
      session_id: 'sess-old',
      workflow_id: 'wf-default',
      title: 'Old Task Without Telemetry',
      description: 'Created before reports feature was added',
      status_id: 'done',
      priority: 'medium',
      order: 1.0,
      tags: ['legacy'],
      metadata: {},
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const report = generateReportsData([legacyTask], [], null, [], undefined, 'all');

    expect(report.summary.totalTasks).toBe(1);
    expect(report.summary.completedTasks).toBe(1);
    expect(report.summary.totalTokens).toBe(0);
    expect(report.summary.totalCostUsd).toBe(0);
    expect(report.tasks[0].promptTokens).toBe(0);
    expect(report.tasks[0].completionTokens).toBe(0);
    expect(report.tasks[0].costUsd).toBe(0);
    expect(report.tasks[0].model).toBe('unspecified');
  });
});
