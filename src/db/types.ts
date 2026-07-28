export interface Status {
  id: string;
  name: string;
  color: string; // e.g. 'blue', 'amber', 'emerald', 'purple', 'rose'
  order: number;
  description?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  statuses: Status[];
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string; // e.g. sess-1722110000000-a1b2c
  name: string;
  description: string;
  agent_id?: string; // e.g. "Claude-3.5-Sonnet", "Antigravity-Agent-1"
  status: 'active' | 'completed' | 'archived';
  workflow_id: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string; // e.g. GIRA-1
  session_id: string;
  workflow_id: string;
  title: string;
  description: string;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  order: number; // Execution sequence order (e.g. 1.0, 1.1, 1.5, 2.0)
  tags: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  session_id?: string;
  task_id?: string;
  agent_id?: string;
  action_type: 'WORKFLOW_CREATED' | 'WORKFLOW_ACTIVATED' | 'SESSION_CREATED' | 'SESSION_UPDATED' | 'TASK_CREATED' | 'TASK_MOVED' | 'TASK_UPDATED';
  details: string;
  from_status?: string;
  to_status?: string;
  reason?: string;
  timestamp: string;
}

export type EventListener = (event: string, data: any) => void;

export interface IDatabaseAdapter {
  init(): Promise<void>;
  
  // Sessions
  getSessions(status?: string): Promise<Session[]>;
  getSessionById(sessionId: string): Promise<Session | null>;
  getActiveSession(): Promise<Session>;
  createSession(name: string, description: string, agentId?: string, workflowId?: string): Promise<Session>;
  updateSessionStatus(sessionId: string, status: Session['status'], agentId?: string): Promise<Session>;
  
  // Workflows
  getWorkflows(): Promise<Workflow[]>;
  getActiveWorkflow(): Promise<Workflow>;
  createWorkflow(name: string, description: string, statuses: Status[], setActive?: boolean, agentId?: string): Promise<Workflow>;
  setActiveWorkflow(workflowId: string, agentId?: string): Promise<Workflow>;
  
  // Tasks
  getTasks(workflowId?: string, sessionId?: string): Promise<Task[]>;
  getTaskById(taskId: string): Promise<Task | null>;
  createTask(
    title: string,
    description: string,
    statusId?: string,
    priority?: Task['priority'],
    tags?: string[],
    metadata?: Record<string, any>,
    sessionId?: string,
    order?: number,
    agentId?: string
  ): Promise<Task>;
  batchCreateTasks(
    tasksInput: Array<{ title: string; description: string; status_id?: string; priority?: Task['priority']; tags?: string[]; session_id?: string; order?: number }>,
    sessionId?: string,
    agentId?: string
  ): Promise<Task[]>;
  moveTask(taskId: string, newStatusId: string, reason?: string, agentId?: string): Promise<Task>;
  updateTask(taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags' | 'metadata' | 'order'>>, agentId?: string): Promise<Task>;
  
  // Activity Logs
  logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void>;
  getActivityLogs(limit?: number, sessionId?: string): Promise<ActivityLog[]>;
  subscribe(listener: EventListener): () => void;
}

