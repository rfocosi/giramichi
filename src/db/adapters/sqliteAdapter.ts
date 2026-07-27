import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IDatabaseAdapter, Workflow, Task, ActivityLog, Status, Session, EventListener } from '../types.js';

export class SqliteAdapter implements IDatabaseAdapter {
  private db!: Database.Database;
  private listeners: EventListener[] = [];

  public async init(): Promise<void> {
    const dbDir = path.resolve(process.cwd(), process.env.DB_DIR || 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, process.env.DB_FILE || 'giramichi.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initTables();
    this.seedDefaultIfEmpty();
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

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        statuses_json TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        agent_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        workflow_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL DEFAULT 'sess-default',
        workflow_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status_id TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        tags_json TEXT NOT NULL DEFAULT '[]',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (workflow_id) REFERENCES workflows(id)
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        task_id TEXT,
        action_type TEXT NOT NULL,
        details TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT,
        reason TEXT,
        timestamp TEXT NOT NULL
      );
    `);

    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN session_id TEXT NOT NULL DEFAULT 'sess-default';`);
    } catch (_) {}

    try {
      this.db.exec(`ALTER TABLE activity_logs ADD COLUMN session_id TEXT;`);
    } catch (_) {}
  }

  private seedDefaultIfEmpty() {
    const wfCount = (this.db.prepare(`SELECT count(*) as cnt FROM workflows`).get() as any).cnt;
    let defaultWf: Workflow;
    if (wfCount === 0) {
      const defaultStatuses: Status[] = [
        { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1, description: 'Tasks queued awaiting AI execution' },
        { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2, description: 'Tasks actively being developed by AI' },
        { id: 'done', name: 'Done', color: '#10b981', order: 3, description: 'Completed and verified deliverables' },
      ];

      const id = `wf-default`;
      const created_at = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, 'Default Standard Workflow', 'Initial baseline workflow with Waiting -> In Progress -> Done', JSON.stringify(defaultStatuses), 1, created_at);
      defaultWf = { id, name: 'Default Standard Workflow', description: 'Initial baseline workflow', statuses: defaultStatuses, is_active: true, created_at };
    } else {
      const row = this.db.prepare(`SELECT * FROM workflows WHERE is_active = 1 LIMIT 1`).get() as any;
      defaultWf = {
        id: row.id,
        name: row.name,
        description: row.description,
        statuses: JSON.parse(row.statuses_json),
        is_active: Boolean(row.is_active),
        created_at: row.created_at,
      };
    }

    const sessCount = (this.db.prepare(`SELECT count(*) as cnt FROM sessions`).get() as any).cnt;
    if (sessCount === 0) {
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO sessions (id, name, description, agent_id, status, workflow_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('sess-default', 'Primary Agent Session', 'Default execution session for multi-agent tasks', 'Primary-Agent', 'active', defaultWf.id, now, now);
    }
  }

  // Session management
  public async getSessions(status?: string): Promise<Session[]> {
    let rows: any[];
    if (status) {
      rows = this.db.prepare(`SELECT * FROM sessions WHERE status = ? ORDER BY updated_at DESC`).all(status) as any[];
    } else {
      rows = this.db.prepare(`SELECT * FROM sessions ORDER BY updated_at DESC`).all() as any[];
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
    const r = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId) as any;
    if (!r) return null;
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
    let row = this.db.prepare(`SELECT * FROM sessions WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1`).get() as any;
    if (!row) {
      row = this.db.prepare(`SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 1`).get() as any;
    }
    if (!row) {
      const activeWf = await this.getActiveWorkflow();
      return this.createSession('New Agent Session', 'Autonomous session container', 'Agent-1', activeWf.id);
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      agent_id: row.agent_id || undefined,
      status: row.status as Session['status'],
      workflow_id: row.workflow_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  public async createSession(name: string, description: string, agentId?: string, workflowId?: string): Promise<Session> {
    const id = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const targetWf = workflowId || (await this.getActiveWorkflow()).id;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, name, description, agent_id, status, workflow_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
    `);
    stmt.run(id, name, description, agentId || null, targetWf, now, now);

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
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    const now = new Date().toISOString();
    this.db.prepare(`UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, sessionId);

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
    const rows = this.db.prepare(`SELECT * FROM workflows ORDER BY created_at DESC`).all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      statuses: JSON.parse(r.statuses_json),
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    }));
  }

  public async getActiveWorkflow(): Promise<Workflow> {
    let row = this.db.prepare(`SELECT * FROM workflows WHERE is_active = 1 LIMIT 1`).get() as any;
    if (!row) {
      row = this.db.prepare(`SELECT * FROM workflows ORDER BY created_at ASC LIMIT 1`).get() as any;
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      statuses: JSON.parse(row.statuses_json),
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
    };
  }

  public async createWorkflow(name: string, description: string, statuses: Status[], setActive = true): Promise<Workflow> {
    const id = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created_at = new Date().toISOString();

    if (setActive) {
      this.db.prepare(`UPDATE workflows SET is_active = 0`).run();
    }

    const stmt = this.db.prepare(`
      INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, description, JSON.stringify(statuses), setActive ? 1 : 0, created_at);

    const newWf: Workflow = { id, name, description, statuses, is_active: setActive, created_at };

    await this.logActivity({
      action_type: 'WORKFLOW_CREATED',
      details: `Generated new workflow "${name}" with ${statuses.length} status steps (${statuses.map((s) => s.name).join(' → ')})`,
    });

    this.notify('WORKFLOW_UPDATED', newWf);
    return newWf;
  }

  public async setActiveWorkflow(workflowId: string): Promise<Workflow> {
    const wfRow = this.db.prepare(`SELECT * FROM workflows WHERE id = ?`).get(workflowId) as any;
    if (!wfRow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    this.db.prepare(`UPDATE workflows SET is_active = 0`).run();
    this.db.prepare(`UPDATE workflows SET is_active = 1 WHERE id = ?`).run(workflowId);

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
      rows = this.db.prepare(`SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at DESC`).all(sessionId) as any[];
    } else if (workflowId) {
      rows = this.db.prepare(`SELECT * FROM tasks WHERE workflow_id = ? ORDER BY created_at DESC`).all(workflowId) as any[];
    } else {
      rows = this.db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC`).all() as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      workflow_id: r.workflow_id,
      title: r.title,
      description: r.description,
      status_id: r.status_id,
      priority: r.priority,
      tags: JSON.parse(r.tags_json),
      metadata: JSON.parse(r.metadata_json),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public async getTaskById(taskId: string): Promise<Task | null> {
    const r = this.db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as any;
    if (!r) return null;
    return {
      id: r.id,
      session_id: r.session_id,
      workflow_id: r.workflow_id,
      title: r.title,
      description: r.description,
      status_id: r.status_id,
      priority: r.priority,
      tags: JSON.parse(r.tags_json),
      metadata: JSON.parse(r.metadata_json),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private getNextTaskId(): string {
    const row = this.db.prepare(`SELECT count(*) as total FROM tasks`).get() as any;
    const num = (row.total || 0) + 101;
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

    const id = this.getNextTaskId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, session_id, workflow_id, title, description, status_id, priority, tags_json, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, targetSession.id, activeWf.id, title, description, finalStatusId, priority, JSON.stringify(tags), JSON.stringify(metadata), now, now);

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

    const statusName = validStatus ? validStatus.name : finalStatusId;
    await this.logActivity({
      session_id: targetSession.id,
      task_id: id,
      action_type: 'TASK_CREATED',
      to_status: finalStatusId,
      details: `Added task [${id}] "${title}" to column [${statusName}]`,
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
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const activeWf = await this.getActiveWorkflow();
    const statusDef = activeWf.statuses.find((s) => s.id === newStatusId);
    if (!statusDef) {
      throw new Error(`Status ${newStatusId} does not exist in active workflow ${activeWf.name}`);
    }

    const oldStatusId = task.status_id;
    const oldStatusDef = activeWf.statuses.find((s) => s.id === oldStatusId);

    const now = new Date().toISOString();
    this.db.prepare(`UPDATE tasks SET status_id = ?, updated_at = ? WHERE id = ?`).run(newStatusId, now, taskId);

    const updatedTask = { ...task, status_id: newStatusId, updated_at: now };

    const fromName = oldStatusDef ? oldStatusDef.name : oldStatusId;
    const toName = statusDef.name;
    const logDetails = `AI moved [${taskId}] "${task.title}" from [${fromName}] → [${toName}]${reason ? `. Rationale: ${reason}` : ''}`;

    await this.logActivity({
      session_id: task.session_id,
      task_id: taskId,
      action_type: 'TASK_MOVED',
      from_status: oldStatusId,
      to_status: newStatusId,
      reason,
      details: logDetails,
    });

    this.notify('TASK_MOVED', updatedTask);
    return updatedTask;
  }

  public async updateTask(
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags' | 'metadata'>>
  ): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const newTitle = updates.title ?? task.title;
    const newDesc = updates.description ?? task.description;
    const newPriority = updates.priority ?? task.priority;
    const newTags = updates.tags ?? task.tags;
    const newMeta = updates.metadata ?? task.metadata;
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, priority = ?, tags_json = ?, metadata_json = ?, updated_at = ?
      WHERE id = ?
    `).run(newTitle, newDesc, newPriority, JSON.stringify(newTags), JSON.stringify(newMeta), now, taskId);

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

  // Activity Logs
  public async logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO activity_logs (id, session_id, task_id, action_type, details, from_status, to_status, reason, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, log.session_id || null, log.task_id || null, log.action_type, log.details, log.from_status || null, log.to_status || null, log.reason || null, timestamp);

    const fullLog: ActivityLog = { id, timestamp, ...log };
    this.notify('LOG_ADDED', fullLog);
  }

  public async getActivityLogs(limit = 50, sessionId?: string): Promise<ActivityLog[]> {
    let rows: any[];
    if (sessionId && sessionId !== 'all') {
      rows = this.db.prepare(`SELECT * FROM activity_logs WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?`).all(sessionId, limit) as any[];
    } else {
      rows = this.db.prepare(`SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?`).all(limit) as any[];
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
