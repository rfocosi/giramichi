import pg from 'pg';
import { IDatabaseAdapter, Workflow, Task, ActivityLog, Status, Session, EventListener } from '../types.js';

export class PostgresAdapter implements IDatabaseAdapter {
  private pool!: pg.Pool;
  private listeners: EventListener[] = [];

  public async init(): Promise<void> {
    const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
    if (connectionString) {
      this.pool = new pg.Pool({ connectionString });
    } else {
      this.pool = new pg.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'giramichi',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });
    }

    await this.initTables();
    await this.seedDefaultIfEmpty();
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(event: string, data: any) {
    this.listeners.forEach((l) => l(event, data));
  }

  private async initTables() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        statuses_json JSONB NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at VARCHAR(64) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        agent_id VARCHAR(128),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        workflow_id VARCHAR(64) NOT NULL,
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        workflow_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status_id VARCHAR(64) NOT NULL,
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64),
        task_id VARCHAR(64),
        action_type VARCHAR(64) NOT NULL,
        details TEXT NOT NULL,
        from_status VARCHAR(64),
        to_status VARCHAR(64),
        reason TEXT,
        timestamp VARCHAR(64) NOT NULL
      );
    `);

    try {
      await this.pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS session_id VARCHAR(64) NOT NULL DEFAULT 'sess-default';`);
    } catch (_) {}

    try {
      await this.pool.query(`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);`);
    } catch (_) {}
  }

  private async seedDefaultIfEmpty() {
    const resWf = await this.pool.query(`SELECT count(*) as cnt FROM workflows`);
    let defaultWfId = 'wf-default';
    if (parseInt(resWf.rows[0].cnt) === 0) {
      const defaultStatuses: Status[] = [
        { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1, description: 'Tasks queued awaiting AI execution' },
        { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2, description: 'Tasks actively being developed by AI' },
        { id: 'done', name: 'Done', color: '#10b981', order: 3, description: 'Completed and verified deliverables' },
      ];
      const now = new Date().toISOString();
      await this.pool.query(
        `INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [defaultWfId, 'Default Standard Workflow', 'Initial baseline workflow', JSON.stringify(defaultStatuses), true, now]
      );
    } else {
      const activeRes = await this.pool.query(`SELECT id FROM workflows WHERE is_active = true LIMIT 1`);
      if (activeRes.rows.length > 0) {
        defaultWfId = activeRes.rows[0].id;
      }
    }

    const resSess = await this.pool.query(`SELECT count(*) as cnt FROM sessions`);
    if (parseInt(resSess.rows[0].cnt) === 0) {
      const now = new Date().toISOString();
      await this.pool.query(
        `INSERT INTO sessions (id, name, description, agent_id, status, workflow_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['sess-default', 'Primary Agent Session', 'Default execution session', 'Primary-Agent', 'active', defaultWfId, now, now]
      );
    }
  }

  // Session management
  public async getSessions(status?: string): Promise<Session[]> {
    let res: pg.QueryResult;
    if (status) {
      res = await this.pool.query(`SELECT * FROM sessions WHERE status = $1 ORDER BY updated_at DESC`, [status]);
    } else {
      res = await this.pool.query(`SELECT * FROM sessions ORDER BY updated_at DESC`);
    }
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      agent_id: r.agent_id || undefined,
      status: r.status as Session['status'],
      workflow_id: r.workflow_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public async getSessionById(sessionId: string): Promise<Session | null> {
    const res = await this.pool.query(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      agent_id: r.agent_id || undefined,
      status: r.status as Session['status'],
      workflow_id: r.workflow_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  public async getActiveSession(): Promise<Session> {
    let res = await this.pool.query(`SELECT * FROM sessions WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1`);
    if (res.rows.length === 0) {
      res = await this.pool.query(`SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1`);
    }
    if (res.rows.length === 0) {
      const activeWf = await this.getActiveWorkflow();
      return this.createSession('New Agent Session', 'Autonomous session container', 'Agent-1', activeWf.id);
    }
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      agent_id: r.agent_id || undefined,
      status: r.status as Session['status'],
      workflow_id: r.workflow_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  public async createSession(name: string, description: string, agentId?: string, workflowId?: string): Promise<Session> {
    const id = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const targetWf = workflowId || (await this.getActiveWorkflow()).id;
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO sessions (id, name, description, agent_id, status, workflow_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, name, description, agentId || null, 'active', targetWf, now, now]
    );

    const session: Session = {
      id,
      name,
      description,
      agent_id: agentId,
      status: 'active',
      workflow_id: targetWf,
      created_at: now,
      updated_at: now,
    };

    await this.logActivity({
      session_id: id,
      action_type: 'SESSION_CREATED',
      details: `Created new execution session "${name}"${agentId ? ` for agent [${agentId}]` : ''}`,
    });

    this.notify('SESSION_CREATED', session);
    return session;
  }

  public async updateSessionStatus(sessionId: string, status: Session['status']): Promise<Session> {
    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error(`Session with ID ${sessionId} not found`);

    const now = new Date().toISOString();
    await this.pool.query(`UPDATE sessions SET status = $1, updated_at = $2 WHERE id = $3`, [status, now, sessionId]);

    const updatedSession: Session = { ...session, status, updated_at: now };
    await this.logActivity({
      session_id: sessionId,
      action_type: 'SESSION_UPDATED',
      details: `Updated session "${session.name}" status to [${status}]`,
    });

    this.notify('SESSION_UPDATED', updatedSession);
    return updatedSession;
  }

  // Workflows
  public async getWorkflows(): Promise<Workflow[]> {
    const res = await this.pool.query(`SELECT * FROM workflows ORDER BY created_at DESC`);
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      statuses: typeof r.statuses_json === 'string' ? JSON.parse(r.statuses_json) : r.statuses_json,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    }));
  }

  public async getActiveWorkflow(): Promise<Workflow> {
    let res = await this.pool.query(`SELECT * FROM workflows WHERE is_active = TRUE LIMIT 1`);
    if (res.rows.length === 0) {
      res = await this.pool.query(`SELECT * FROM workflows ORDER BY created_at ASC LIMIT 1`);
    }
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      statuses: typeof r.statuses_json === 'string' ? JSON.parse(r.statuses_json) : r.statuses_json,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    };
  }

  public async createWorkflow(name: string, description: string, statuses: Status[], setActive = true): Promise<Workflow> {
    const id = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created_at = new Date().toISOString();

    if (setActive) {
      await this.pool.query(`UPDATE workflows SET is_active = FALSE`);
    }

    await this.pool.query(
      `INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, description, JSON.stringify(statuses), setActive, created_at]
    );

    const newWf: Workflow = { id, name, description, statuses, is_active: setActive, created_at };
    await this.logActivity({
      action_type: 'WORKFLOW_CREATED',
      details: `Generated new workflow "${name}" with ${statuses.length} status steps`,
    });

    this.notify('WORKFLOW_UPDATED', newWf);
    return newWf;
  }

  public async setActiveWorkflow(workflowId: string): Promise<Workflow> {
    const res = await this.pool.query(`SELECT * FROM workflows WHERE id = $1`, [workflowId]);
    if (res.rows.length === 0) throw new Error(`Workflow with ID ${workflowId} not found`);

    await this.pool.query(`UPDATE workflows SET is_active = FALSE`);
    await this.pool.query(`UPDATE workflows SET is_active = TRUE WHERE id = $1`, [workflowId]);

    const activeWf = await this.getActiveWorkflow();
    await this.logActivity({
      action_type: 'WORKFLOW_ACTIVATED',
      details: `Switched active workflow to "${activeWf.name}"`,
    });
    this.notify('WORKFLOW_UPDATED', activeWf);
    return activeWf;
  }

  // Tasks
  public async getTasks(workflowId?: string, sessionId?: string): Promise<Task[]> {
    let res: pg.QueryResult;
    if (sessionId && sessionId !== 'all') {
      res = await this.pool.query(`SELECT * FROM tasks WHERE session_id = $1 ORDER BY created_at DESC`, [sessionId]);
    } else if (workflowId) {
      res = await this.pool.query(`SELECT * FROM tasks WHERE workflow_id = $1 ORDER BY created_at DESC`, [workflowId]);
    } else {
      res = await this.pool.query(`SELECT * FROM tasks ORDER BY created_at DESC`);
    }

    return res.rows.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      workflow_id: r.workflow_id,
      title: r.title,
      description: r.description,
      status_id: r.status_id,
      priority: r.priority,
      tags: typeof r.tags_json === 'string' ? JSON.parse(r.tags_json) : r.tags_json,
      metadata: typeof r.metadata_json === 'string' ? JSON.parse(r.metadata_json) : r.metadata_json,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public async getTaskById(taskId: string): Promise<Task | null> {
    const res = await this.pool.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      session_id: r.session_id,
      workflow_id: r.workflow_id,
      title: r.title,
      description: r.description,
      status_id: r.status_id,
      priority: r.priority,
      tags: typeof r.tags_json === 'string' ? JSON.parse(r.tags_json) : r.tags_json,
      metadata: typeof r.metadata_json === 'string' ? JSON.parse(r.metadata_json) : r.metadata_json,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private async getNextTaskId(): Promise<string> {
    const res = await this.pool.query(`SELECT count(*) as total FROM tasks`);
    const num = parseInt(res.rows[0].total || '0') + 101;
    return `GIRA-${num}`;
  }

  public async createTask(
    title: string,
    description: string,
    statusId?: string,
    priority: Task['priority'] = 'medium',
    tags: string[] = [],
    metadata: Record<string, any> = {},
    sessionId?: string
  ): Promise<Task> {
    const targetSession = sessionId ? (await this.getSessionById(sessionId)) || (await this.getActiveSession()) : await this.getActiveSession();
    const activeWf = await this.getActiveWorkflow();
    const targetStatus = statusId || activeWf.statuses[0]?.id || 'waiting';
    const validStatus = activeWf.statuses.find((s) => s.id === targetStatus);
    const finalStatusId = validStatus ? validStatus.id : activeWf.statuses[0].id;

    const id = await this.getNextTaskId();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO tasks (id, session_id, workflow_id, title, description, status_id, priority, tags_json, metadata_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, targetSession.id, activeWf.id, title, description, finalStatusId, priority, JSON.stringify(tags), JSON.stringify(metadata), now, now]
    );

    const newTask: Task = {
      id,
      session_id: targetSession.id,
      workflow_id: activeWf.id,
      title,
      description,
      status_id: finalStatusId,
      priority,
      tags,
      metadata,
      created_at: now,
      updated_at: now,
    };

    await this.logActivity({
      session_id: targetSession.id,
      task_id: id,
      action_type: 'TASK_CREATED',
      to_status: finalStatusId,
      details: `Added task [${id}] "${title}"`,
    });

    this.notify('TASK_UPDATED', newTask);
    return newTask;
  }

  public async batchCreateTasks(
    tasksInput: Array<{ title: string; description: string; status_id?: string; priority?: Task['priority']; tags?: string[]; session_id?: string }>,
    sessionId?: string
  ): Promise<Task[]> {
    const createdTasks: Task[] = [];
    for (const t of tasksInput) {
      const targetSessId = t.session_id || sessionId;
      const created = await this.createTask(t.title, t.description, t.status_id, t.priority || 'medium', t.tags || [], {}, targetSessId);
      createdTasks.push(created);
    }
    return createdTasks;
  }

  public async moveTask(taskId: string, newStatusId: string, reason?: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found`);

    const now = new Date().toISOString();
    await this.pool.query(`UPDATE tasks SET status_id = $1, updated_at = $2 WHERE id = $3`, [newStatusId, now, taskId]);

    const updatedTask = { ...task, status_id: newStatusId, updated_at: now };
    await this.logActivity({
      session_id: task.session_id,
      task_id: taskId,
      action_type: 'TASK_MOVED',
      from_status: task.status_id,
      to_status: newStatusId,
      reason,
      details: `AI moved [${taskId}] "${task.title}" → [${newStatusId}]`,
    });

    this.notify('TASK_MOVED', updatedTask);
    return updatedTask;
  }

  public async updateTask(
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags' | 'metadata'>>
  ): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found`);

    const newTitle = updates.title ?? task.title;
    const newDesc = updates.description ?? task.description;
    const newPriority = updates.priority ?? task.priority;
    const newTags = updates.tags ?? task.tags;
    const newMeta = updates.metadata ?? task.metadata;
    const now = new Date().toISOString();

    await this.pool.query(
      `UPDATE tasks SET title = $1, description = $2, priority = $3, tags_json = $4, metadata_json = $5, updated_at = $6 WHERE id = $7`,
      [newTitle, newDesc, newPriority, JSON.stringify(newTags), JSON.stringify(newMeta), now, taskId]
    );

    const updated = (await this.getTaskById(taskId))!;
    await this.logActivity({
      session_id: task.session_id,
      task_id: taskId,
      action_type: 'TASK_UPDATED',
      details: `AI updated details for [${taskId}] "${updated.title}"`,
    });

    this.notify('TASK_UPDATED', updated);
    return updated;
  }

  // Activity logs
  public async logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO activity_logs (id, session_id, task_id, action_type, details, from_status, to_status, reason, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, log.session_id || null, log.task_id || null, log.action_type, log.details, log.from_status || null, log.to_status || null, log.reason || null, timestamp]
    );

    const fullLog: ActivityLog = { id, timestamp, ...log };
    this.notify('LOG_ADDED', fullLog);
  }

  public async getActivityLogs(limit = 50, sessionId?: string): Promise<ActivityLog[]> {
    let res: pg.QueryResult;
    if (sessionId && sessionId !== 'all') {
      res = await this.pool.query(`SELECT * FROM activity_logs WHERE session_id = $1 ORDER BY timestamp DESC LIMIT $2`, [sessionId, limit]);
    } else {
      res = await this.pool.query(`SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT $1`, [limit]);
    }
    return res.rows.map((r) => ({
      id: r.id,
      session_id: r.session_id || undefined,
      task_id: r.task_id || undefined,
      action_type: r.action_type,
      details: r.details,
      from_status: r.from_status || undefined,
      to_status: r.to_status || undefined,
      reason: r.reason || undefined,
      timestamp: r.timestamp,
    }));
  }
}
