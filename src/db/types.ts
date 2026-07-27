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

export interface Task {
  id: string; // e.g. GIRA-1
  workflow_id: string;
  title: string;
  description: string;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  task_id?: string;
  action_type: 'WORKFLOW_CREATED' | 'WORKFLOW_ACTIVATED' | 'TASK_CREATED' | 'TASK_MOVED' | 'TASK_UPDATED';
  details: string;
  from_status?: string;
  to_status?: string;
  reason?: string;
  timestamp: string;
}

export type EventListener = (event: string, data: any) => void;

export interface IDatabaseAdapter {
  init(): Promise<void>;
  getWorkflows(): Promise<Workflow[]>;
  getActiveWorkflow(): Promise<Workflow>;
  createWorkflow(name: string, description: string, statuses: Status[], setActive?: boolean): Promise<Workflow>;
  setActiveWorkflow(workflowId: string): Promise<Workflow>;
  getTasks(workflowId?: string): Promise<Task[]>;
  getTaskById(taskId: string): Promise<Task | null>;
  createTask(
    title: string,
    description: string,
    statusId?: string,
    priority?: Task['priority'],
    tags?: string[],
    metadata?: Record<string, any>
  ): Promise<Task>;
  batchCreateTasks(
    tasksInput: Array<{ title: string; description: string; status_id?: string; priority?: Task['priority']; tags?: string[] }>
  ): Promise<Task[]>;
  moveTask(taskId: string, newStatusId: string, reason?: string): Promise<Task>;
  updateTask(taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags' | 'metadata'>>): Promise<Task>;
  logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  subscribe(listener: EventListener): () => void;
}
