import { test, expect } from '@playwright/test';
import { SqliteAdapter } from '../../src/db/adapters/sqliteAdapter.js';

test.describe('SQLite Database Adapter Unit Tests', () => {
  let adapter: SqliteAdapter;

  test.beforeAll(async () => {
    adapter = new SqliteAdapter(':memory:');
    await adapter.init();
  });

  test('should initialize workflow and default session on startup', async () => {
    const workflows = await adapter.getWorkflows();
    expect(workflows.length).toBeGreaterThan(0);

    const activeWorkflow = await adapter.getActiveWorkflow();
    expect(activeWorkflow.is_active).toBe(true);

    const activeSession = await adapter.getActiveSession();
    expect(activeSession).toBeDefined();
    expect(activeSession.status).toBe('active');
  });

  test('should create a new session and retrieve it by ID', async () => {
    const newSession = await adapter.createSession('Test Session', 'Unit test session', 'Tester-Agent');
    expect(newSession.id).toContain('sess-');
    expect(newSession.name).toBe('Test Session');
    expect(newSession.agent_id).toBe('Tester-Agent');

    const fetchedSession = await adapter.getSessionById(newSession.id);
    expect(fetchedSession).not.toBeNull();
    expect(fetchedSession?.id).toBe(newSession.id);
  });

  test('should update session status', async () => {
    const session = await adapter.createSession('Session to Complete', 'Desc');
    const updated = await adapter.updateSessionStatus(session.id, 'completed', 'Tester-Agent');
    expect(updated.status).toBe('completed');
  });

  test('should create task and move task across workflow statuses', async () => {
    const activeSession = await adapter.getActiveSession();
    const task = await adapter.createTask(
      'Unit Test Task',
      'Test task description',
      'waiting',
      'high',
      ['test'],
      { env: 'unit' },
      activeSession.id,
      1.0,
      'Tester-Agent'
    );

    expect(task.id).toContain('GIRA-');
    expect(task.title).toBe('Unit Test Task');
    expect(task.status_id).toBe('waiting');

    const movedTask = await adapter.moveTask(task.id, 'in_progress', 'Started testing', 'Tester-Agent');
    expect(movedTask.status_id).toBe('in_progress');

    const fetchedTask = await adapter.getTaskById(task.id);
    expect(fetchedTask?.status_id).toBe('in_progress');
  });

  test('should batch create tasks with order indices', async () => {
    const activeSession = await adapter.getActiveSession();
    const batchTasks = await adapter.batchCreateTasks(
      [
        { title: 'Batch Task 1', description: 'Desc 1', order: 1.0 },
        { title: 'Batch Task 2', description: 'Desc 2', order: 2.0 },
      ],
      activeSession.id,
      'Tester-Agent'
    );

    expect(batchTasks.length).toBe(2);
    expect(batchTasks[0].title).toBe('Batch Task 1');
    expect(batchTasks[1].title).toBe('Batch Task 2');
  });

  test('should emit event notifications on subscriber callback', async () => {
    let emittedEvent: string | null = null;
    let emittedData: any = null;

    const unsubscribe = adapter.subscribe((event, data) => {
      emittedEvent = event;
      emittedData = data;
    });

    const createdSession = await adapter.createSession('Subscribed Session', 'Sub test');
    expect(emittedEvent).toBe('SESSION_CREATED');
    expect(emittedData?.id).toBe(createdSession.id);

    unsubscribe();
  });

  test('should filter sessions based on display period / since cutoff date', async () => {
    // 1. Create a recent session (updated now)
    const recentSession = await adapter.createSession('Recent Session', 'Created just now');

    // 2. Create an old session and artificially backdate updated_at to 10 days ago
    const oldSession = await adapter.createSession('Old Session', 'Created 10 days ago');
    const tenDaysAgoIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    (adapter as any).db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`).run(tenDaysAgoIso, oldSession.id);

    // 3. Default getSessions() (3D period) should include recent session but exclude 10-day-old session
    const defaultSessions = await adapter.getSessions();
    const defaultSessionIds = defaultSessions.map((s) => s.id);
    expect(defaultSessionIds).toContain(recentSession.id);
    expect(defaultSessionIds).not.toContain(oldSession.id);

    // 4. getSessions with 'all' should return both sessions
    const allSessions = await adapter.getSessions(undefined, 'all');
    const allSessionIds = allSessions.map((s) => s.id);
    expect(allSessionIds).toContain(recentSession.id);
    expect(allSessionIds).toContain(oldSession.id);

    // 5. getSessions with explicit since Date
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const filteredByDate = await adapter.getSessions(undefined, fiveDaysAgo);
    const filteredIds = filteredByDate.map((s) => s.id);
    expect(filteredIds).toContain(recentSession.id);
    expect(filteredIds).not.toContain(oldSession.id);

    // 6. getSessions with status and period
    const activeSessionsFiltered = await adapter.getSessions('active', '7D');
    expect(activeSessionsFiltered.map((s) => s.id)).toContain(recentSession.id);
    expect(activeSessionsFiltered.map((s) => s.id)).not.toContain(oldSession.id);
  });

  test('should filter tasks and activity logs based on session display period when querying all sessions', async () => {
    // 1. Create a recent session and task
    const recentSession = await adapter.createSession('Recent Task Session', 'Recent desc');
    const recentTask = await adapter.createTask('Recent Task', 'Recent task desc', 'waiting', 'high', ['tag-recent'], {}, recentSession.id, 1.0);
    await adapter.logActivity({
      session_id: recentSession.id,
      task_id: recentTask.id,
      action_type: 'TASK_CREATED',
      details: 'Created recent task',
    });

    // 2. Create an old session and task, backdating session updated_at to 10 days ago
    const oldSession = await adapter.createSession('Old Task Session', 'Old desc');
    const oldTask = await adapter.createTask('Old Task', 'Old task desc', 'waiting', 'low', ['tag-old'], {}, oldSession.id, 2.0);
    await adapter.logActivity({
      session_id: oldSession.id,
      task_id: oldTask.id,
      action_type: 'TASK_CREATED',
      details: 'Created old task',
    });
    const tenDaysAgoIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    (adapter as any).db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`).run(tenDaysAgoIso, oldSession.id);

    // 3. getTasks(undefined, 'all') with default 3D period should return only recentTask
    const defaultTasks = await adapter.getTasks(undefined, 'all');
    const defaultTaskIds = defaultTasks.map((t) => t.id);
    expect(defaultTaskIds).toContain(recentTask.id);
    expect(defaultTaskIds).not.toContain(oldTask.id);

    // 4. getTasks(undefined, 'all', 'all') should return all tasks
    const allTasks = await adapter.getTasks(undefined, 'all', 'all');
    const allTaskIds = allTasks.map((t) => t.id);
    expect(allTaskIds).toContain(recentTask.id);
    expect(allTaskIds).toContain(oldTask.id);

    // 5. Querying specific old session directly should still return its tasks
    const specificOldTasks = await adapter.getTasks(undefined, oldSession.id);
    expect(specificOldTasks.map((t) => t.id)).toContain(oldTask.id);

    // 6. getActivityLogs(50, 'all') with default 3D period should filter out old session logs
    const logs = await adapter.getActivityLogs(50, 'all');
    const sessionIdsInLogs = logs.map((l) => l.session_id);
    expect(sessionIdsInLogs).toContain(recentSession.id);
    expect(sessionIdsInLogs).not.toContain(oldSession.id);
  });
});
