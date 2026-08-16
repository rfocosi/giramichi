import { test, expect } from '@playwright/test';
import { SqliteAdapter } from '../../src/db/adapters/sqliteAdapter.js';
import { getAnonymousAuthContext } from '../../src/auth/auth.js';
import { authenticateAgent } from '../../src/auth/middleware.js';

test.describe('Audit User Actions Verification Suite', () => {
  let adapter: SqliteAdapter;

  test.beforeEach(async () => {
    adapter = new SqliteAdapter(':memory:');
    await adapter.init();
  });

  test('1. Create and update actions store created_by and last_updated_by', async () => {
    const guidUser = '550e8400-e29b-41d4-a716-446655440000';
    const numericUser = 101;

    // Create session with GUID user
    const session = await adapter.createSession('Audit Session', 'Testing created_by', 'Agent-Audit', undefined, guidUser);
    expect(session.created_by).toBe(guidUser);
    expect(session.last_updated_by).toBe(guidUser);

    // Update session status with numeric user
    const updatedSession = await adapter.updateSessionStatus(session.id, 'completed', 'Agent-Audit', numericUser);
    expect(updatedSession.created_by).toBe(guidUser);
    expect(updatedSession.last_updated_by).toBe(numericUser);

    // Create task with GUID user
    const task = await adapter.createTask(
      'Audit Task',
      'Task created_by audit test',
      'waiting',
      'high',
      ['audit'],
      {},
      session.id,
      1.0,
      'Agent-Audit',
      guidUser
    );
    expect(task.created_by).toBe(guidUser);
    expect(task.last_updated_by).toBe(guidUser);

    // Move task with numeric user
    const movedTask = await adapter.moveTask(task.id, 'in_progress', 'Moving to in_progress', 'Agent-Audit', numericUser);
    expect(movedTask.created_by).toBe(guidUser);
    expect(movedTask.last_updated_by).toBe(numericUser);

    // Update task details with another user ID
    const updatedTask = await adapter.updateTask(task.id, { title: 'Audit Task Updated' }, 'Agent-Audit', 202);
    expect(updatedTask.created_by).toBe(guidUser);
    expect(updatedTask.last_updated_by).toBe(202);
  });

  test('2. Activity log has created_by field', async () => {
    const userId = 'usr-guid-12345';
    const session = await adapter.createSession('Log Audit Session', 'Log verification', 'Agent-Audit', undefined, userId);

    const logs = await adapter.getActivityLogs(10, session.id);
    expect(logs.length).toBeGreaterThan(0);
    const creationLog = logs.find((l) => l.action_type === 'SESSION_CREATED');
    expect(creationLog).toBeDefined();
    expect(creationLog?.created_by).toBe(userId);
  });

  test('3. Prepared for any type of userID (guid / numeric id / user object)', async () => {
    // Test numeric ID 0
    const task0 = await adapter.createTask('Task 0', 'Numeric 0 test', 'waiting', 'low', [], {}, undefined, 2.0, 'Agent-Audit', 0);
    expect(task0.created_by).toBe(0);

    // Test GUID string
    const guid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const taskGuid = await adapter.createTask('Task GUID', 'GUID test', 'waiting', 'low', [], {}, undefined, 2.1, 'Agent-Audit', guid);
    expect(taskGuid.created_by).toBe(guid);

    // Test object structure
    const userObj = { userId: 0, user: 'anonymous' };
    const taskObj = await adapter.createTask('Task Obj', 'Obj test', 'waiting', 'low', [], {}, undefined, 2.2, 'Agent-Audit', userObj);
    expect(taskObj.created_by).toEqual(userObj);
  });

  test('4. Authentication disabled fallback uses created_by = 0, user = anonymous', async () => {
    const originalMode = process.env.AUTH_MODE;
    process.env.AUTH_MODE = 'disabled';

    const anonContext = getAnonymousAuthContext();
    expect(anonContext.createdBy).toBe(0);
    expect(anonContext.lastUpdatedBy).toBe(0);
    expect(anonContext.user).toBe('anonymous');

    // Simulate Express middleware in disabled mode
    const req: any = { headers: {} };
    const res: any = {
      status: () => res,
      json: () => res,
    };
    let nextCalled = false;
    await authenticateAgent(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.createdBy).toBe(0);
    expect(req.lastUpdatedBy).toBe(0);
    expect(req.agentId).toBe('anonymous');
    expect(req.userContext).toEqual({ userId: 0, user: 'anonymous' });

    process.env.AUTH_MODE = originalMode;
  });
});
