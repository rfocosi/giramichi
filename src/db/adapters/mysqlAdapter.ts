import mysql from 'mysql2/promise';
import { IDatabaseAdapter, Workflow, Task, ActivityLog, Status, Session, EventListener } from '../types.js';

export class MysqlAdapter implements IDatabaseAdapter {
  private pool!: mysql.Pool;
  private listeners: EventListener[] = [];

  public async init(): Promise<void> {
    const connectionString = process.env.DATABASE_URL || process.env.MYSQL_CONNECTION_STRING;
    if (connectionString) {
      this.pool = mysql.createPool(connectionString);
    } else {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'giramichi',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
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
        statuses_json JSON NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        created_at VARCHAR(64) NOT NULL
      );
    `);

    await this.pool.query(`
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
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        workflow_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status_id VARCHAR(64) NOT NULL,
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        \`order\` DOUBLE NOT NULL DEFAULT 1.0,
        tags_json JSON NOT NULL,
        metadata_json JSON NOT NULL,
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
    `);

    await this.pool.query(`
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
      await this.pool.query(`ALTER TABLE tasks ADD COLUMN session_id VARCHAR(64) NOT NULL DEFAULT 'sess-default';`);
    } catch (_) {}

    try {
      await this.pool.query(`ALTER TABLE tasks ADD COLUMN \`order\` DOUBLE NOT NULL DEFAULT 1.0;`);
    } catch (_) {}

    try {
      await this.pool.query(`ALTER TABLE activity_logs ADD COLUMN session_id VARCHAR(64);`);
    } catch (_) {}
  }

  private async seedDefaultIfEmpty() {
    const [rowsWf]: any = await this.pool.query(`SELECT count(*) as cnt FROM workflows`);
    let defaultWfId = 'wf-default';
    if (parseInt(rowsWf[0].cnt) === 0) {
      const defaultStatuses: Status[] = [
        { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1, description: 'Tasks queued awaiting AI execution' },
        { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2, description: 'Tasks actively being developed by AI' },
        { id: 'done', name: 'Done', color: '#10b981', order: 3, description: 'Completed and verified deliverables' },
      ];
      const now = new Date().toISOString();
      await this.pool.query(
        `INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [defaultWfId, 'Default Standard Workflow', 'Initial baseline workflow', JSON.stringify(defaultStatuses), 1, now]
      );
    } else {
      const [activeWfRows]: any = await this.pool.query(`SELECT id FROM workflows WHERE is_active = 1 LIMIT 1`);
      if (activeWfRows.length > 0) defaultWfId = activeWfRows[0].id;
    }

    const [rowsSess]: any = await this.pool.query(`SELECT count(*) as cnt FROM sessions`);
    if (parseInt(rowsSess[0].cnt) === 0) {
      const now = new Date().toISOString();
      await this.pool.query(
        `INSERT INTO sessions (id, name, description, agent_id, status, workflow_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['sess-default', 'Primary Agent Session', 'Default execution session', 'Primary-Agent', 'active', defaultWfId, now, now]
      );
    }
  }

  // Session management
  public async getSessions(status?: string): Promise<Session[]> {
    let rows: any[];
    if (status) {
      const [res]: any = await this.pool.query(`SELECT * FROM sessions WHERE status = ? ORDER BY updated_at DESC`, [status]);
      rows = res;
    } else {
      const [res]: any = await this.pool.query(`SELECT * FROM sessions ORDER BY updated_at DESC`);
      rows = res;
    }
    return rows.map((r) => ({
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
    const [rows]: any = await this.pool.query(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
    if (rows.length === 0) return null;
    const r = rows[0];
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
    let [rows]: any = await this.pool.query(`SELECT * FROM sessions WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1`);
    if (rows.length === 0) {
      [rows] = await this.pool.query(`SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1`);
    }
    if (rows.length === 0) {
      const activeWf = await this.getActiveWorkflow();
      return this.createSession('New Agent Session', 'Autonomous session container', 'Agent-1', activeWf.id);
    }
    const r = rows[0];
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
      `INSERT INTO sessions (id, name, description, agent_id, status, workflow_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
    await this.pool.query(`UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?`, [status, now, sessionId]);

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
    const [rows]: any = await this.pool.query(`SELECT * FROM workflows ORDER BY created_at DESC`);
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      statuses: typeof r.statuses_json === 'string' ? JSON.parse(r.statuses_json) : r.statuses_json,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    }));
  }

  public async getActiveWorkflow(): Promise<Workflow> {
    let [rows]: any = await this.pool.query(`SELECT * FROM workflows WHERE is_active = 1 LIMIT 1`);
    if (rows.length === 0) {
      [rows] = await this.pool.query(`SELECT * FROM workflows ORDER BY created_at ASC LIMIT 1`);
    }
    const r = rows[0];
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
      await this.pool.query(`UPDATE workflows SET is_active = 0`);
    }

    await this.pool.query(
      `INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, description, JSON.stringify(statuses), setActive ? 1 : 0, created_at]
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
    const [rows]: any = await this.pool.query(`SELECT * FROM workflows WHERE id = ?`, [workflowId]);
    if (rows.length === 0) throw new Error(`Workflow with ID ${workflowId} not found`);

    await this.pool.query(`UPDATE workflows SET is_active = 0`);
    await this.pool.query(`UPDATE workflows SET is_active = 1 WHERE id = ?`, [workflowId]);

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
    let rows: any[];
    if (sessionId && sessionId !== 'all') {
      const [res]: any = await this.pool.query(`SELECT * FROM tasks WHERE session_id = ? ORDER BY \`order\` ASC, created_at ASC`, [sessionId]);
      rows = res;
    } else if (workflowId) {
      const [res]: any = await this.pool.query(`SELECT * FROM tasks WHERE workflow_id = ? ORDER BY \`order\` ASC, created_at ASC`, [workflowId]);
      rows = res;
    } else {
      const [res]: any = await this.pool.query(`SELECT * FROM tasks ORDER BY \`order\` ASC, created_at ASC`);
      rows = res;
    }

    return rows.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      workflow_id: r.workflow_id,
      title: r.title,
      description: r.description,
      status_id: r.status_id,
      priority: r.priority,
      order: r.order !== undefined && r.order !== null ? Number(r.order) : 1.0,
      tags: typeof r.tags_json === 'string' ? JSON.parse(r.tags_json) : r.tags_json,
      metadata: typeof r.metadata_json === 'string' ? JSON.parse(r.metadata_json) : r.metadata_json,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public async getTaskById(taskId: string): Promise<Task | null> {
    const [rows]: any = await this.pool.query(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      session_id: r.session_id,
      workflow_id: r.workflow_id,
      title: r.title,
      description: r.description,
      status_id: r.status_id,
      priority: r.priority,
      order: r.order !== undefined && r.order !== null ? Number(r.order) : 1.0,
      tags: typeof r.tags_json === 'string' ? JSON.parse(r.tags_json) : r.tags_json,
      metadata: typeof r.metadata_json === 'string' ? JSON.parse(r.metadata_json) : r.metadata_json,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private async getNextTaskId(): Promise<string> {
    const [rows]: any = await this.pool.query(`SELECT count(*) as total FROM tasks`);
    const num = parseInt(rows[0].total || '0') + 101;
    return `GIRA-${num}`;
  }

  private async getNextTaskOrder(sessionId: string): Promise<number> {
    const [rows]: any = await this.pool.query(`SELECT MAX(\`order\`) as max_order FROM tasks WHERE session_id = ?`, [sessionId]);
    const maxVal = rows[0] && rows[0].max_order !== null && rows[0].max_order !== undefined ? Number(rows[0].max_order) : 0.0;
    return Math.round((maxVal + 1.0) * 100) / 100;
  }

  public async createTask(
    title: string,
    description: string,
    statusId?: string,
    priority: Task['priority'] = 'medium',
    tags: string[] = [],
    metadata: Record<string, any> = {},
    sessionId?: string,
    order?: number
  ): Promise<Task> {
    const targetSession = sessionId ? (await this.getSessionById(sessionId)) || (await this.getActiveSession()) : await this.getActiveSession();
    const activeWf = await this.getActiveWorkflow();
    const targetStatus = statusId || activeWf.statuses[0]?.id || 'waiting';
    const validStatus = activeWf.statuses.find((s) => s.id === targetStatus);
    const finalStatusId = validStatus ? validStatus.id : activeWf.statuses[0].id;
    const finalOrder = order !== undefined ? order : await this.getNextTaskOrder(targetSession.id);

    const id = await this.getNextTaskId();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO tasks (id, session_id, workflow_id, title, description, status_id, priority, \`order\`, tags_json, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, targetSession.id, activeWf.id, title, description, finalStatusId, priority, finalOrder, JSON.stringify(tags), JSON.stringify(metadata), now, now]
    );

    const newTask: Task = {
      id,
      session_id: targetSession.id,
      workflow_id: activeWf.id,
      title,
      description,
      status_id: finalStatusId,
      priority,
      order: finalOrder,
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
      details: `Added task [${id}] "${title}" (order: ${finalOrder})`,
    });

    this.notify('TASK_UPDATED', newTask);
    return newTask;
  }

  public async batchCreateTasks(
    tasksInput: Array<{ title: string; description: string; status_id?: string; priority?: Task['priority']; tags?: string[]; session_id?: string; order?: number }>,
    sessionId?: string
  ): Promise<Task[]> {
    const createdTasks: Task[] = [];
    for (let i = 0; i < tasksInput.length; i++) {
      const t = tasksInput[i];
      const targetSessId = t.session_id || sessionId;
      const calcOrder = t.order !== undefined ? t.order : await this.getNextTaskOrder(targetSessId || '');
      const created = await this.createTask(t.title, t.description, t.status_id, t.priority || 'medium', t.tags || [], {}, targetSessId, calcOrder);
      createdTasks.push(created);
    }
    return createdTasks;
  }

  public async moveTask(taskId: string, newStatusId: string, reason?: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found`);

    const now = new Date().toISOString();
    await this.pool.query(`UPDATE tasks SET status_id = ?, updated_at = ? WHERE id = ?`, [newStatusId, now, taskId]);

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
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags' | 'metadata' | 'order'>>
  ): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found`);

    const newTitle = updates.title ?? task.title;
    const newDesc = updates.description ?? task.description;
    const newPriority = updates.priority ?? task.priority;
    const newOrder = updates.order ?? task.order;
    const newTags = updates.tags ?? task.tags;
    const newMeta = updates.metadata ?? task.metadata;
    const now = new Date().toISOString();

    await this.pool.query(
      `UPDATE tasks SET title = ?, description = ?, priority = ?, \`order\` = ?, tags_json = ?, metadata_json = ?, updated_at = ? WHERE id = ?`,
      [newTitle, newDesc, newPriority, newOrder, JSON.stringify(newTags), JSON.stringify(newMeta), now, taskId]
    );

    const updated = (await this.getTaskById(taskId))!;
    await this.logActivity({
      session_id: task.session_id,
      task_id: taskId,
      action_type: 'TASK_UPDATED',
      details: `AI updated details for [${taskId}] "${updated.title}" (order: ${updated.order})`,
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, log.session_id || null, log.task_id || null, log.action_type, log.details, log.from_status || null, log.to_status || null, log.reason || null, timestamp]
    );

    const fullLog: ActivityLog = { id, timestamp, ...log };
    this.notify('LOG_ADDED', fullLog);
  }

  public async getActivityLogs(limit = 50, sessionId?: string): Promise<ActivityLog[]> {
    let rows: any[];
    if (sessionId && sessionId !== 'all') {
      const [res]: any = await this.pool.query(`SELECT * FROM activity_logs WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?`, [sessionId, limit]);
      rows = res;
    } else {
      const [res]: any = await this.pool.query(`SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
      rows = res;
    }
    return rows.map((r) => ({
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
