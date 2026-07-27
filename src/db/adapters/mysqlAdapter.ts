import mysql from 'mysql2/promise';
import { IDatabaseAdapter, Workflow, Task, ActivityLog, Status, EventListener } from '../types.js';

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
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        workflow_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status_id VARCHAR(64) NOT NULL,
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        tags_json JSON NOT NULL,
        metadata_json JSON NOT NULL,
        created_at VARCHAR(64) NOT NULL,
        updated_at VARCHAR(64) NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        task_id VARCHAR(64),
        action_type VARCHAR(64) NOT NULL,
        details TEXT NOT NULL,
        from_status VARCHAR(64),
        to_status VARCHAR(64),
        reason TEXT,
        timestamp VARCHAR(64) NOT NULL
      );
    `);
  }

  private async seedDefaultIfEmpty() {
    const [rows]: any = await this.pool.query(`SELECT count(*) as cnt FROM workflows`);
    const count = parseInt(rows[0].cnt);
    if (count === 0) {
      const defaultStatuses: Status[] = [
        { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1, description: 'Tasks queued awaiting AI execution' },
        { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2, description: 'Tasks actively being developed by AI' },
        { id: 'done', name: 'Done', color: '#10b981', order: 3, description: 'Completed and verified deliverables' },
      ];

      await this.createWorkflow(
        'Default Standard Workflow',
        'Initial baseline workflow with Waiting -> In Progress -> Done',
        defaultStatuses,
        true
      );
    }
  }

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
      `INSERT INTO workflows (id, name, description, statuses_json, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, description, JSON.stringify(statuses), setActive ? 1 : 0, created_at]
    );

    const newWf: Workflow = { id, name, description, statuses, is_active: setActive, created_at };
    await this.logActivity({
      action_type: 'WORKFLOW_CREATED',
      details: `Generated new workflow "${name}" with ${statuses.length} status steps (${statuses.map((s) => s.name).join(' → ')})`,
    });

    this.notify('WORKFLOW_UPDATED', newWf);
    return newWf;
  }

  public async setActiveWorkflow(workflowId: string): Promise<Workflow> {
    const [rows]: any = await this.pool.query(`SELECT * FROM workflows WHERE id = ?`, [workflowId]);
    if (rows.length === 0) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

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

  public async getTasks(workflowId?: string): Promise<Task[]> {
    const targetWf = workflowId || (await this.getActiveWorkflow()).id;
    const [rows]: any = await this.pool.query(`SELECT * FROM tasks WHERE workflow_id = ? ORDER BY created_at DESC`, [targetWf]);
    return rows.map((r: any) => ({
      id: r.id,
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
    const [rows]: any = await this.pool.query(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
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
    const [rows]: any = await this.pool.query(`SELECT count(*) as total FROM tasks`);
    const num = parseInt(rows[0].total) + 101;
    return `GIRA-${num}`;
  }

  public async createTask(
    title: string,
    description: string,
    statusId?: string,
    priority: Task['priority'] = 'medium',
    tags: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<Task> {
    const activeWf = await this.getActiveWorkflow();
    const targetStatus = statusId || activeWf.statuses[0]?.id || 'waiting';

    const validStatus = activeWf.statuses.find((s) => s.id === targetStatus);
    const finalStatusId = validStatus ? validStatus.id : activeWf.statuses[0].id;

    const id = await this.getNextTaskId();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO tasks (id, workflow_id, title, description, status_id, priority, tags_json, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, activeWf.id, title, description, finalStatusId, priority, JSON.stringify(tags), JSON.stringify(metadata), now, now]
    );

    const newTask: Task = {
      id,
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
      task_id: id,
      action_type: 'TASK_CREATED',
      to_status: finalStatusId,
      details: `Added task [${id}] "${title}" to column [${statusName}]`,
    });

    this.notify('TASK_UPDATED', newTask);
    return newTask;
  }

  public async batchCreateTasks(
    tasksInput: Array<{ title: string; description: string; status_id?: string; priority?: Task['priority']; tags?: string[] }>
  ): Promise<Task[]> {
    const createdTasks: Task[] = [];
    for (const t of tasksInput) {
      const created = await this.createTask(t.title, t.description, t.status_id, t.priority || 'medium', t.tags || []);
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
    await this.pool.query(`UPDATE tasks SET status_id = ?, updated_at = ? WHERE id = ?`, [newStatusId, now, taskId]);

    const updatedTask = { ...task, status_id: newStatusId, updated_at: now };

    const fromName = oldStatusDef ? oldStatusDef.name : oldStatusId;
    const toName = statusDef.name;
    const logDetails = `AI moved [${taskId}] "${task.title}" from [${fromName}] → [${toName}]${reason ? `. Rationale: ${reason}` : ''}`;

    await this.logActivity({
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

    await this.pool.query(
      `UPDATE tasks
       SET title = ?, description = ?, priority = ?, tags_json = ?, metadata_json = ?, updated_at = ?
       WHERE id = ?`,
      [newTitle, newDesc, newPriority, JSON.stringify(newTags), JSON.stringify(newMeta), now, taskId]
    );

    const updated = (await this.getTaskById(taskId))!;
    await this.logActivity({
      task_id: taskId,
      action_type: 'TASK_UPDATED',
      details: `AI updated details for [${taskId}] "${updated.title}"`,
    });

    this.notify('TASK_UPDATED', updated);
    return updated;
  }

  public async logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO activity_logs (id, task_id, action_type, details, from_status, to_status, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, log.task_id || null, log.action_type, log.details, log.from_status || null, log.to_status || null, log.reason || null, timestamp]
    );

    const fullLog: ActivityLog = { id, timestamp, ...log };
    this.notify('LOG_ADDED', fullLog);
  }

  public async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    const [rows]: any = await this.pool.query(`SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
    return rows.map((r: any) => ({
      id: r.id,
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
