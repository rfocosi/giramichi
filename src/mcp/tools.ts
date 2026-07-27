import { db, Status, Task } from '../db/db.js';

export const toolDefinitions = [
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
    description: 'Creates a new task card on the Giramichi board under a designated workflow status.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the task' },
        description: { type: 'string', description: 'Detailed technical description and acceptance criteria' },
        status_id: { type: 'string', description: 'Target status column ID (defaults to first status in active workflow if omitted)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority level' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags/labels for the task (e.g. ["frontend", "api", "auth"])' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'giramichi_batch_create_tasks',
    description: 'Batch adds multiple tasks to the board in a single operation during initial AI planning.',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              status_id: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
              tags: { type: 'array', items: { type: 'string' } },
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
    description: 'Updates task title, description, priority, or tags.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID (e.g., "GIRA-101")' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'giramichi_get_board',
    description: 'Fetches the current Giramichi board state including active workflow, status columns, and all tasks.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'giramichi_get_activity_log',
    description: 'Retrieves history of AI transitions and task activity logs.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of recent log entries to retrieve (default 50)' },
      },
    },
  },
];

export async function handleToolCall(name: string, args: any) {
  try {
    switch (name) {
      case 'giramichi_create_workflow': {
        const wf = db.createWorkflow(args.name, args.description, args.statuses, true);
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
        const wf = db.setActiveWorkflow(args.workflow_id);
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
        const task = db.createTask(args.title, args.description, args.status_id, args.priority, args.tags);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Task [${task.id}] created under status [${task.status_id}].`, task }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_batch_create_tasks': {
        const created = db.batchCreateTasks(args.tasks);
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
        const task = db.moveTask(args.task_id, args.new_status_id, args.reason);
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
        const task = db.updateTask(args.task_id, {
          title: args.title,
          description: args.description,
          priority: args.priority,
          tags: args.tags,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Task [${task.id}] updated.`, task }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_get_board': {
        const workflow = db.getActiveWorkflow();
        const tasks = db.getTasks(workflow.id);
        const logs = db.getActivityLogs(10);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ workflow, total_tasks: tasks.length, tasks, recent_logs: logs }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_get_activity_log': {
        const logs = db.getActivityLogs(args.limit || 50);
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
