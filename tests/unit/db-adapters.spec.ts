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
});
