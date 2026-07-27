import { db } from '../db/index.js';

export const toolDefinitions = [
  {
    name: 'giramichi_create_session',
    description: 'Creates a top-level agent execution session for organizing tasks and activities when multiple AI agents work on the same server.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the agent session, e.g. "Payment Gateway Refactor"' },
        description: { type: 'string', description: 'Detailed objective of this agent session' },
        agent_id: { type: 'string', description: 'Identifier of the agent, e.g., "Claude-3.5", "Antigravity-Agent-1", "Cursor"' },
        workflow_id: { type: 'string', description: 'Optional workflow ID to link to this session' },
      },
      required: ['name', 'description'],
    },
  },
  {
    name: 'giramichi_list_sessions',
    description: 'Lists active, completed, or archived agent sessions.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'completed', 'archived'], description: 'Filter sessions by status' },
      },
    },
  },
  {
    name: 'giramichi_get_session',
    description: 'Retrieves details, task execution breakdown, next task to implement, and recent logs for a specific session.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session ID (e.g. "sess-1722110000000-a1b2c")' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'giramichi_close_session',
    description: 'Updates session status to "completed" or "archived".',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session ID' },
        status: { type: 'string', enum: ['completed', 'archived'], description: 'New status for the session' },
      },
      required: ['session_id', 'status'],
    },
  },
  {
    name: 'giramichi_create_workflow',
    description: 'Generates a new project development workflow lifecycle with custom status steps (e.g. Waiting -> In Progress -> Done). Sets it as active.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the workflow, e.g., "Full-Stack AI Feature Pipeline"' },
        description: { type: 'string', description: 'Detailed explanation of why this workflow structure was chosen' },
        statuses: {
          type: 'array',
          description: 'Ordered array of status stages in the workflow (at least 3 steps recommended)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique status key, e.g. "backlog", "waiting", "in_progress", "code_review", "done"' },
              name: { type: 'string', description: 'Display name, e.g., "In Progress"' },
              color: { type: 'string', description: 'Color hex or name, e.g. "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6"' },
              order: { type: 'number', description: 'Display order index (1, 2, 3...)' },
              description: { type: 'string', description: 'Meaning of this status state' },
            },
            required: ['id', 'name', 'color', 'order'],
          },
        },
      },
      required: ['name', 'description', 'statuses'],
    },
  },
  {
    name: 'giramichi_set_active_workflow',
    description: 'Activates an existing workflow for the Giramichi board.',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'ID of the workflow to activate' },
      },
      required: ['workflow_id'],
    },
  },
  {
    name: 'giramichi_create_task',
    description: 'Creates a new task card on the Giramichi board under a designated workflow status, session, and decimal execution order.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the task' },
        description: { type: 'string', description: 'Detailed technical description and acceptance criteria' },
        status_id: { type: 'string', description: 'Target status column ID (defaults to first status in active workflow if omitted)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority level' },
        order: { type: 'number', description: 'Execution sequence order (e.g. 1.0, 1.1, 1.5, 2.0). Tasks execute in ascending order.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags/labels for the task (e.g. ["frontend", "api", "auth"])' },
        session_id: { type: 'string', description: 'Optional session ID for multi-agent grouping (defaults to active session if omitted)' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'giramichi_batch_create_tasks',
    description: 'Batch adds multiple tasks to the board with sequential or custom decimal order indexes.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Target session ID for all batch tasks' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status_id: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
              order: { type: 'number', description: 'Decimal order position (e.g. 1.0, 1.5, 2.0)' },
              tags: { type: 'array', items: { type: 'string' } },
              session_id: { type: 'string' },
            },
            required: ['title', 'description'],
          },
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'giramichi_move_task',
    description: 'Moves a task card from its current status to a new status stage along the active workflow, logging the AI decision rationale.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID (e.g., "GIRA-101")' },
        new_status_id: { type: 'string', description: 'Target status column ID (e.g., "in_progress", "done")' },
        reason: { type: 'string', description: 'Detailed rationale for why the AI moved this card' },
      },
      required: ['task_id', 'new_status_id'],
    },
  },
  {
    name: 'giramichi_update_task',
    description: 'Updates task title, description, priority, order position, or tags.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID (e.g., "GIRA-101")' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        order: { type: 'number', description: 'New execution sequence order (e.g. 1.5 to insert between 1.0 and 2.0)' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'giramichi_get_board',
    description: 'Fetches the current Giramichi board state including sessions, active workflow, tasks ordered by execution sequence, and next task to implement.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Optional session ID to filter board view (pass "all" for all sessions)' },
      },
    },
  },
  {
    name: 'giramichi_get_activity_log',
    description: 'Retrieves history of AI transitions and task activity logs.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of recent log entries to retrieve (default 50)' },
        session_id: { type: 'string', description: 'Optional session ID filter' },
      },
    },
  },
];

function findNextTaskToImplement(tasks: any[]) {
  const pending = tasks.filter((t) => t.status_id !== 'done' && t.status_id !== 'completed');
  if (pending.length === 0) return null;
  pending.sort((a, b) => a.order - b.order);
  return pending[0];
}

export async function handleToolCall(name: string, args: any) {
  try {
    switch (name) {
      case 'giramichi_create_session': {
        const session = await db.createSession(args.name, args.description, args.agent_id, args.workflow_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Session "${session.name}" created [ID: ${session.id}].`, session }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_list_sessions': {
        const sessions = await db.getSessions(args.status);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, count: sessions.length, sessions }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_get_session': {
        const session = await db.getSessionById(args.session_id);
        if (!session) {
          throw new Error(`Session ${args.session_id} not found`);
        }
        const tasks = await db.getTasks(undefined, args.session_id);
        const logs = await db.getActivityLogs(20, args.session_id);
        const nextTask = findNextTaskToImplement(tasks);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, session, total_tasks: tasks.length, next_task_to_implement: nextTask, tasks, recent_logs: logs }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_close_session': {
        const session = await db.updateSessionStatus(args.session_id, args.status);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Session [${session.id}] status updated to ${args.status}.`, session }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_create_workflow': {
        const wf = await db.createWorkflow(args.name, args.description, args.statuses, true);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Workflow "${wf.name}" created and set as active.`, workflow: wf }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_set_active_workflow': {
        const wf = await db.setActiveWorkflow(args.workflow_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Active workflow switched to "${wf.name}".`, workflow: wf }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_create_task': {
        const task = await db.createTask(args.title, args.description, args.status_id, args.priority, args.tags, {}, args.session_id, args.order);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Task [${task.id}] created in session [${task.session_id}] with order [${task.order}] under status [${task.status_id}].`, task }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_batch_create_tasks': {
        const created = await db.batchCreateTasks(args.tasks, args.session_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, count: created.length, tasks: created }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_move_task': {
        const task = await db.moveTask(args.task_id, args.new_status_id, args.reason);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Task [${task.id}] moved to [${task.status_id}].`, task }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_update_task': {
        const task = await db.updateTask(args.task_id, {
          title: args.title,
          description: args.description,
          priority: args.priority,
          order: args.order,
          tags: args.tags,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Task [${task.id}] updated (order: ${task.order}).`, task }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_get_board': {
        const activeSession = await db.getActiveSession();
        const targetSessionId = args.session_id || activeSession.id;
        const workflow = await db.getActiveWorkflow();
        const tasks = await db.getTasks(workflow.id, targetSessionId);
        const logs = await db.getActivityLogs(20, targetSessionId);
        const sessions = await db.getSessions();
        const nextTask = findNextTaskToImplement(tasks);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ workflow, active_session_id: targetSessionId, sessions, total_tasks: tasks.length, next_task_to_implement: nextTask, tasks, recent_logs: logs }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_get_activity_log': {
        const logs = await db.getActivityLogs(args.limit || 50, args.session_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ logs }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool name: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
    };
  }
}
