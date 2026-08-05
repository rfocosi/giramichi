import sql from 'mssql';
import { IDatabaseAdapter, Workflow, Task, ActivityLog, Status, Session, EventListener, UserId } from '../types.js';

function formatUserId(val: any): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function parseUserId(val: any): any {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (val === '0') return 0;
    if (!isNaN(Number(val))) return Number(val);
    try {
      if (val.startsWith('{') || val.startsWith('[')) return JSON.parse(val);
    } catch {}
  }
  return val;
}

export class MssqlAdapter implements IDatabaseAdapter {
  private pool!: sql.ConnectionPool;
  private listeners: EventListener[] = [];

  public async init(): Promise<void> {
    const connectionString = process.env.DATABASE_URL || process.env.MSSQL_CONNECTION_STRING;
    if (connectionString) {
      this.pool = await sql.connect(connectionString);
    } else {
      const config: sql.config = {
        server: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '1433'),
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'giramichi',
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: true,
        },
      };
      this.pool = await sql.connect(config);
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
    await this.pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='workflows' AND xtype='U')
      CREATE TABLE workflows (
        id NVARCHAR(64) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        statuses_json NVARCHAR(MAX) NOT NULL,
        is_active BIT NOT NULL DEFAULT 0,
        created_at NVARCHAR(64) NOT NULL,
        created_by NVARCHAR(MAX),
        last_updated_by NVARCHAR(MAX)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
      CREATE TABLE sessions (
        id NVARCHAR(64) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        agent_id NVARCHAR(128),
        status NVARCHAR(32) NOT NULL DEFAULT 'active',
        workflow_id NVARCHAR(64) NOT NULL,
        created_at NVARCHAR(64) NOT NULL,
        updated_at NVARCHAR(64) NOT NULL,
        created_by NVARCHAR(MAX),
        last_updated_by NVARCHAR(MAX),
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tasks' AND xtype='U')
      CREATE TABLE tasks (
        id NVARCHAR(64) PRIMARY KEY,
        session_id NVARCHAR(64) NOT NULL,
        workflow_id NVARCHAR(64) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        status_id NVARCHAR(64) NOT NULL,
        priority NVARCHAR(32) NOT NULL DEFAULT 'medium',
        [order] FLOAT NOT NULL DEFAULT 1.0,
        tags_json NVARCHAR(MAX) NOT NULL,
        metadata_json NVARCHAR(MAX) NOT NULL,
        created_at NVARCHAR(64) NOT NULL,
        updated_at NVARCHAR(64) NOT NULL,
        created_by NVARCHAR(MAX),
        last_updated_by NVARCHAR(MAX),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activity_logs' AND xtype='U')
      CREATE TABLE activity_logs (
        id NVARCHAR(64) PRIMARY KEY,
        session_id NVARCHAR(64),
        task_id NVARCHAR(64),
        agent_id NVARCHAR(128),
        created_by NVARCHAR(MAX),
        action_type NVARCHAR(64) NOT NULL,
        details NVARCHAR(MAX) NOT NULL,
        from_status NVARCHAR(64),
        to_status NVARCHAR(64),
        reason NVARCHAR(MAX),
        timestamp NVARCHAR(64) NOT NULL
      );
    `);

    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'session_id') ALTER TABLE tasks ADD session_id NVARCHAR(64) NOT NULL DEFAULT 'sess-default';`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'order') ALTER TABLE tasks ADD [order] FLOAT NOT NULL DEFAULT 1.0;`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('activity_logs') AND name = 'session_id') ALTER TABLE activity_logs ADD session_id NVARCHAR(64);`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('activity_logs') AND name = 'agent_id') ALTER TABLE activity_logs ADD agent_id NVARCHAR(128);`); } catch (_) {}

    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('workflows') AND name = 'created_by') ALTER TABLE workflows ADD created_by NVARCHAR(MAX);`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('workflows') AND name = 'last_updated_by') ALTER TABLE workflows ADD last_updated_by NVARCHAR(MAX);`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sessions') AND name = 'created_by') ALTER TABLE sessions ADD created_by NVARCHAR(MAX);`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('sessions') AND name = 'last_updated_by') ALTER TABLE sessions ADD last_updated_by NVARCHAR(MAX);`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'created_by') ALTER TABLE tasks ADD created_by NVARCHAR(MAX);`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'last_updated_by') ALTER TABLE tasks ADD last_updated_by NVARCHAR(MAX);`); } catch (_) {}
    try { await this.pool.request().query(`IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('activity_logs') AND name = 'created_by') ALTER TABLE activity_logs ADD created_by NVARCHAR(MAX);`); } catch (_) {}
  }

  private async seedDefaultIfEmpty() {
    const resWf = await this.pool.request().query(`SELECT count(*) as cnt FROM workflows`);
    let defaultWfId = 'wf-default';
    if (resWf.recordset[0].cnt === 0) {
      const defaultStatuses: Status[] = [
        { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1, description: 'Tasks queued awaiting AI execution' },
        { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2, description: 'Tasks actively being developed by AI' },
        { id: 'done', name: 'Done', color: '#10b981', order: 3, description: 'Completed and verified deliverables' },
      ];
      const now = new Date().toISOString();
      await this.pool.request()
        .input('id', sql.NVarChar, defaultWfId)
        .input('name', sql.NVarChar, 'Default Standard Workflow')
        .input('desc', sql.NVarChar, 'Initial baseline workflow')
        .input('statuses', sql.NVarChar, JSON.stringify(defaultStatuses))
        .input('active', sql.Bit, 1)
        .input('created_at', sql.NVarChar, now)
        .query(`INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at) VALUES (@id, @name, @desc, @statuses, @active, @created_at)`);
    } else {
      const activeRes = await this.pool.request().query(`SELECT TOP 1 id FROM workflows WHERE is_active = 1`);
      if (activeRes.recordset.length > 0) defaultWfId = activeRes.recordset[0].id;
    }

    const resSess = await this.pool.request().query(`SELECT count(*) as cnt FROM sessions`);
    if (resSess.recordset[0].cnt === 0) {
      const now = new Date().toISOString();
      await this.pool.request()
        .input('id', sql.NVarChar, 'sess-default')
        .input('name', sql.NVarChar, 'Primary Agent Session')
        .input('desc', sql.NVarChar, 'Default execution session')
        .input('agent', sql.NVarChar, 'Primary-Agent')
        .input('status', sql.NVarChar, 'active')
        .input('wf_id', sql.NVarChar, defaultWfId)
        .input('created_at', sql.NVarChar, now)
        .input('updated_at', sql.NVarChar, now)
        .query(`INSERT INTO sessions (id, name, description, agent_id, status, workflow_id, created_at, updated_at) VALUES (@id, @name, @desc, @agent, @status, @wf_id, @created_at, @updated_at)`);
    }
  }

  // Sessions
  public async getSessions(status?: string): Promise<Session[]> {
    let req = this.pool.request();
    let query = `SELECT * FROM sessions`;
    if (status) {
      req = req.input('status', sql.NVarChar, status);
      query += ` WHERE status = @status`;
    }
    query += ` ORDER BY updated_at DESC`;
    const res = await req.query(query);

    return res.recordset.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      agent_id: r.agent_id || undefined,
      status: r.status as Session['status'],
      workflow_id: r.workflow_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: parseUserId(r.created_by),
      last_updated_by: parseUserId(r.last_updated_by),
    }));
  }

  public async getSessionById(sessionId: string): Promise<Session | null> {
    const res = await this.pool.request().input('id', sql.NVarChar, sessionId).query(`SELECT * FROM sessions WHERE id = @id`);
    if (res.recordset.length === 0) return null;
    const r = res.recordset[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      agent_id: r.agent_id || undefined,
      status: r.status as Session['status'],
      workflow_id: r.workflow_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: parseUserId(r.created_by),
      last_updated_by: parseUserId(r.last_updated_by),
    };
  }

  public async getActiveSession(): Promise<Session> {
    let res = await this.pool.request().query(`SELECT TOP 1 * FROM sessions WHERE status = 'active' ORDER BY updated_at DESC`);
    if (res.recordset.length === 0) {
      res = await this.pool.request().query(`SELECT TOP 1 * FROM sessions ORDER BY updated_at DESC`);
    }
    if (res.recordset.length === 0) {
      const activeWf = await this.getActiveWorkflow();
      return this.createSession('New Agent Session', 'Autonomous session container', 'Agent-1', activeWf.id);
    }
    const r = res.recordset[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      agent_id: r.agent_id || undefined,
      status: r.status as Session['status'],
      workflow_id: r.workflow_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: parseUserId(r.created_by),
      last_updated_by: parseUserId(r.last_updated_by),
    };
  }

  public async createSession(name: string, description: string, agentId?: string, workflowId?: string, createdBy?: UserId): Promise<Session> {
    const id = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const targetWf = workflowId || (await this.getActiveWorkflow()).id;
    const now = new Date().toISOString();
    const createdByStr = formatUserId(createdBy);

    await this.pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name)
      .input('desc', sql.NVarChar, description)
      .input('agent', sql.NVarChar, agentId || null)
      .input('status', sql.NVarChar, 'active')
      .input('wf_id', sql.NVarChar, targetWf)
      .input('created_at', sql.NVarChar, now)
      .input('updated_at', sql.NVarChar, now)
      .input('created_by', sql.NVarChar, createdByStr)
      .input('last_updated_by', sql.NVarChar, createdByStr)
      .query(`INSERT INTO sessions (id, name, description, agent_id, status, workflow_id, created_at, updated_at, created_by, last_updated_by) VALUES (@id, @name, @desc, @agent, @status, @wf_id, @created_at, @updated_at, @created_by, @last_updated_by)`);

    const session: Session = {
      id,
      name,
      description,
      agent_id: agentId,
      status: 'active',
      workflow_id: targetWf,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
      last_updated_by: createdBy,
    };

    await this.logActivity({
      session_id: id,
      agent_id: agentId,
      created_by: createdBy,
      action_type: 'SESSION_CREATED',
      details: `Created new execution session "${name}"${agentId ? ` for agent [${agentId}]` : ''}`,
    });

    this.notify('SESSION_CREATED', session);
    return session;
  }

  public async updateSessionStatus(sessionId: string, status: Session['status'], agentId?: string, lastUpdatedBy?: UserId): Promise<Session> {
    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error(`Session with ID ${sessionId} not found`);

    const now = new Date().toISOString();
    const lastUpdatedByStr = formatUserId(lastUpdatedBy ?? session.created_by);
    await this.pool.request()
      .input('status', sql.NVarChar, status)
      .input('updated_at', sql.NVarChar, now)
      .input('last_updated_by', sql.NVarChar, lastUpdatedByStr)
      .input('id', sql.NVarChar, sessionId)
      .query(`UPDATE sessions SET status = @status, updated_at = @updated_at, last_updated_by = @last_updated_by WHERE id = @id`);

    const updatedSession: Session = { ...session, status, updated_at: now, last_updated_by: lastUpdatedBy ?? session.created_by };
    await this.logActivity({
      session_id: sessionId,
      agent_id: agentId,
      created_by: lastUpdatedBy,
      action_type: 'SESSION_UPDATED',
      details: `Updated session "${session.name}" status to [${status}]`,
    });

    this.notify('SESSION_UPDATED', updatedSession);
    return updatedSession;
  }

  // Workflows
  public async getWorkflows(): Promise<Workflow[]> {
    const res = await this.pool.request().query(`SELECT * FROM workflows ORDER BY created_at DESC`);
    return res.recordset.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      statuses: JSON.parse(r.statuses_json),
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      created_by: parseUserId(r.created_by),
      last_updated_by: parseUserId(r.last_updated_by),
    }));
  }

  public async getActiveWorkflow(): Promise<Workflow> {
    let res = await this.pool.request().query(`SELECT TOP 1 * FROM workflows WHERE is_active = 1`);
    if (res.recordset.length === 0) {
      res = await this.pool.request().query(`SELECT TOP 1 * FROM workflows ORDER BY created_at ASC`);
    }
    const r = res.recordset[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      statuses: JSON.parse(r.statuses_json),
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      created_by: parseUserId(r.created_by),
      last_updated_by: parseUserId(r.last_updated_by),
    };
  }

  public async createWorkflow(name: string, description: string, statuses: Status[], setActive = true, agentId?: string, createdBy?: UserId): Promise<Workflow> {
    const id = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created_at = new Date().toISOString();
    const createdByStr = formatUserId(createdBy);

    if (setActive) {
      await this.pool.request().query(`UPDATE workflows SET is_active = 0`);
    }

    await this.pool.request()
      .input('id', sql.NVarChar, id)
      .input('name', sql.NVarChar, name)
      .input('desc', sql.NVarChar, description)
      .input('statuses', sql.NVarChar, JSON.stringify(statuses))
      .input('active', sql.Bit, setActive ? 1 : 0)
      .input('created_at', sql.NVarChar, created_at)
      .input('created_by', sql.NVarChar, createdByStr)
      .input('last_updated_by', sql.NVarChar, createdByStr)
      .query(`INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at, created_by, last_updated_by) VALUES (@id, @name, @desc, @statuses, @active, @created_at, @created_by, @last_updated_by)`);

    const newWf: Workflow = { id, name, description, statuses, is_active: setActive, created_at, created_by: createdBy, last_updated_by: createdBy };
    await this.logActivity({
      agent_id: agentId,
      created_by: createdBy,
      action_type: 'WORKFLOW_CREATED',
      details: `Generated new workflow "${name}" with ${statuses.length} status steps`,
    });

    this.notify('WORKFLOW_UPDATED', newWf);
    return newWf;
  }

  public async setActiveWorkflow(workflowId: string, agentId?: string, lastUpdatedBy?: UserId): Promise<Workflow> {
    const res = await this.pool.request().input('id', sql.NVarChar, workflowId).query(`SELECT * FROM workflows WHERE id = @id`);
    if (res.recordset.length === 0) throw new Error(`Workflow with ID ${workflowId} not found`);

    const lastUpdatedByStr = formatUserId(lastUpdatedBy);
    await this.pool.request().query(`UPDATE workflows SET is_active = 0`);
    await this.pool.request()
      .input('id', sql.NVarChar, workflowId)
      .input('last_updated_by', sql.NVarChar, lastUpdatedByStr)
      .query(`UPDATE workflows SET is_active = 1, last_updated_by = @last_updated_by WHERE id = @id`);

    const activeWf = await this.getActiveWorkflow();
    await this.logActivity({
      agent_id: agentId,
      created_by: lastUpdatedBy,
      action_type: 'WORKFLOW_ACTIVATED',
      details: `Switched active workflow to "${activeWf.name}"`,
    });
    this.notify('WORKFLOW_UPDATED', activeWf);
    return activeWf;
  }

  // Tasks
  public async getTasks(workflowId?: string, sessionId?: string): Promise<Task[]> {
    let req = this.pool.request();
    let query = `SELECT * FROM tasks`;
    if (sessionId && sessionId !== 'all') {
      req = req.input('session_id', sql.NVarChar, sessionId);
      query += ` WHERE session_id = @session_id`;
    } else if (workflowId) {
      req = req.input('workflow_id', sql.NVarChar, workflowId);
      query += ` WHERE workflow_id = @workflow_id`;
    }
    query += ` ORDER BY [order] ASC, created_at ASC`;

    const res = await req.query(query);
    return res.recordset.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      workflow_id: r.workflow_id,
      title: r.title,
      description: r.description,
      status_id: r.status_id,
      priority: r.priority,
      order: r.order !== undefined && r.order !== null ? Number(r.order) : 1.0,
      tags: JSON.parse(r.tags_json),
      metadata: JSON.parse(r.metadata_json),
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: parseUserId(r.created_by),
      last_updated_by: parseUserId(r.last_updated_by),
    }));
  }

  public async getTaskById(taskId: string): Promise<Task | null> {
    const res = await this.pool.request().input('id', sql.NVarChar, taskId).query(`SELECT * FROM tasks WHERE id = @id`);
    if (res.recordset.length === 0) return null;
    const r = res.recordset[0];
    return {
      id: r.id,
      session_id: r.session_id,
      workflow_id: r.workflow_id,
      title: r.title,
      description: r.description,
      status_id: r.status_id,
      priority: r.priority,
      order: r.order !== undefined && r.order !== null ? Number(r.order) : 1.0,
      tags: JSON.parse(r.tags_json),
      metadata: JSON.parse(r.metadata_json),
      created_at: r.created_at,
      updated_at: r.updated_at,
      created_by: parseUserId(r.created_by),
      last_updated_by: parseUserId(r.last_updated_by),
    };
  }

  private async getNextTaskId(): Promise<string> {
    const res = await this.pool.request().query(`SELECT count(*) as total FROM tasks`);
    const num = (res.recordset[0].total || 0) + 101;
    return `GIRA-${num}`;
  }

  private async getNextTaskOrder(sessionId: string): Promise<number> {
    const res = await this.pool.request().input('session_id', sql.NVarChar, sessionId).query(`SELECT MAX([order]) as max_order FROM tasks WHERE session_id = @session_id`);
    const maxVal = res.recordset[0] && res.recordset[0].max_order !== null && res.recordset[0].max_order !== undefined ? Number(res.recordset[0].max_order) : 0.0;
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
    order?: number,
    agentId?: string,
    createdBy?: UserId
  ): Promise<Task> {
    const targetSession = sessionId ? (await this.getSessionById(sessionId)) || (await this.getActiveSession()) : await this.getActiveSession();
    const activeWf = await this.getActiveWorkflow();
    const targetStatus = statusId || activeWf.statuses[0]?.id || 'waiting';
    const validStatus = activeWf.statuses.find((s) => s.id === targetStatus);
    const finalStatusId = validStatus ? validStatus.id : activeWf.statuses[0].id;
    const finalOrder = order !== undefined ? order : await this.getNextTaskOrder(targetSession.id);

    const id = await this.getNextTaskId();
    const now = new Date().toISOString();
    const createdByStr = formatUserId(createdBy);

    await this.pool.request()
      .input('id', sql.NVarChar, id)
      .input('session_id', sql.NVarChar, targetSession.id)
      .input('wf_id', sql.NVarChar, activeWf.id)
      .input('title', sql.NVarChar, title)
      .input('desc', sql.NVarChar, description)
      .input('status_id', sql.NVarChar, finalStatusId)
      .input('priority', sql.NVarChar, priority)
      .input('order', sql.Float, finalOrder)
      .input('tags', sql.NVarChar, JSON.stringify(tags))
      .input('meta', sql.NVarChar, JSON.stringify(metadata))
      .input('created_at', sql.NVarChar, now)
      .input('updated_at', sql.NVarChar, now)
      .input('created_by', sql.NVarChar, createdByStr)
      .input('last_updated_by', sql.NVarChar, createdByStr)
      .query(`INSERT INTO tasks (id, session_id, workflow_id, title, description, status_id, priority, [order], tags_json, metadata_json, created_at, updated_at, created_by, last_updated_by) VALUES (@id, @session_id, @wf_id, @title, @desc, @status_id, @priority, @order, @tags, @meta, @created_at, @updated_at, @created_by, @last_updated_by)`);

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
      created_by: createdBy,
      last_updated_by: createdBy,
    };

    await this.logActivity({
      session_id: targetSession.id,
      task_id: id,
      agent_id: agentId,
      created_by: createdBy,
      action_type: 'TASK_CREATED',
      to_status: finalStatusId,
      details: `Added task [${id}] "${title}" (order: ${finalOrder})`,
    });

    this.notify('TASK_UPDATED', newTask);
    return newTask;
  }

  public async batchCreateTasks(
    tasksInput: Array<{ title: string; description: string; status_id?: string; priority?: Task['priority']; tags?: string[]; session_id?: string; order?: number }>,
    sessionId?: string,
    agentId?: string,
    createdBy?: UserId
  ): Promise<Task[]> {
    const createdTasks: Task[] = [];
    for (let i = 0; i < tasksInput.length; i++) {
      const t = tasksInput[i];
      const targetSessId = t.session_id || sessionId;
      const calcOrder = t.order !== undefined ? t.order : await this.getNextTaskOrder(targetSessId || '');
      const created = await this.createTask(t.title, t.description, t.status_id, t.priority || 'medium', t.tags || [], {}, targetSessId, calcOrder, agentId, createdBy);
      createdTasks.push(created);
    }
    return createdTasks;
  }

  public async moveTask(taskId: string, newStatusId: string, reason?: string, agentId?: string, lastUpdatedBy?: UserId): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Task with ID ${taskId} not found`);

    const now = new Date().toISOString();
    const lastUpdatedByStr = formatUserId(lastUpdatedBy ?? task.created_by);
    await this.pool.request()
      .input('status_id', sql.NVarChar, newStatusId)
      .input('updated_at', sql.NVarChar, now)
      .input('last_updated_by', sql.NVarChar, lastUpdatedByStr)
      .input('id', sql.NVarChar, taskId)
      .query(`UPDATE tasks SET status_id = @status_id, updated_at = @updated_at, last_updated_by = @last_updated_by WHERE id = @id`);

    const updatedTask = { ...task, status_id: newStatusId, updated_at: now, last_updated_by: lastUpdatedBy ?? task.created_by };
    await this.logActivity({
      session_id: task.session_id,
      task_id: taskId,
      agent_id: agentId,
      created_by: lastUpdatedBy ?? task.created_by,
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
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags' | 'metadata' | 'order'>>,
    agentId?: string,
    lastUpdatedBy?: UserId
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
    const lastUpdatedByStr = formatUserId(lastUpdatedBy ?? task.created_by);

    await this.pool.request()
      .input('title', sql.NVarChar, newTitle)
      .input('desc', sql.NVarChar, newDesc)
      .input('priority', sql.NVarChar, newPriority)
      .input('order', sql.Float, newOrder)
      .input('tags', sql.NVarChar, JSON.stringify(newTags))
      .input('meta', sql.NVarChar, JSON.stringify(newMeta))
      .input('updated_at', sql.NVarChar, now)
      .input('last_updated_by', sql.NVarChar, lastUpdatedByStr)
      .input('id', sql.NVarChar, taskId)
      .query(`UPDATE tasks SET title = @title, description = @desc, priority = @priority, [order] = @order, tags_json = @tags, metadata_json = @meta, updated_at = @updated_at, last_updated_by = @last_updated_by WHERE id = @id`);

    const updated = (await this.getTaskById(taskId))!;
    await this.logActivity({
      session_id: task.session_id,
      task_id: taskId,
      agent_id: agentId,
      created_by: lastUpdatedBy ?? task.created_by,
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
    const createdByStr = formatUserId(log.created_by);

    await this.pool.request()
      .input('id', sql.NVarChar, id)
      .input('session_id', sql.NVarChar, log.session_id || null)
      .input('task_id', sql.NVarChar, log.task_id || null)
      .input('agent_id', sql.NVarChar, log.agent_id || null)
      .input('created_by', sql.NVarChar, createdByStr)
      .input('action', sql.NVarChar, log.action_type)
      .input('details', sql.NVarChar, log.details)
      .input('from', sql.NVarChar, log.from_status || null)
      .input('to', sql.NVarChar, log.to_status || null)
      .input('reason', sql.NVarChar, log.reason || null)
      .input('timestamp', sql.NVarChar, timestamp)
      .query(`INSERT INTO activity_logs (id, session_id, task_id, agent_id, created_by, action_type, details, from_status, to_status, reason, timestamp) VALUES (@id, @session_id, @task_id, @agent_id, @created_by, @action, @details, @from, @to, @reason, @timestamp)`);

    const fullLog: ActivityLog = { id, timestamp, ...log };
    this.notify('LOG_ADDED', fullLog);
  }

  public async getActivityLogs(limit = 50, sessionId?: string): Promise<ActivityLog[]> {
    let req = this.pool.request().input('limit', sql.Int, limit);
    let query = `SELECT TOP (@limit) * FROM activity_logs`;
    if (sessionId && sessionId !== 'all') {
      req = req.input('session_id', sql.NVarChar, sessionId);
      query += ` WHERE session_id = @session_id`;
    }
    query += ` ORDER BY timestamp DESC`;

    const res = await req.query(query);
    return res.recordset.map((r) => ({
      id: r.id,
      session_id: r.session_id || undefined,
      task_id: r.task_id || undefined,
      agent_id: r.agent_id || undefined,
      created_by: parseUserId(r.created_by),
      action_type: r.action_type,
      details: r.details,
      from_status: r.from_status || undefined,
      to_status: r.to_status || undefined,
      reason: r.reason || undefined,
      timestamp: r.timestamp,
    }));
  }
}
