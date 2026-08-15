import { db } from '../db/index.js';
import { autoInferMetrics, MCP_INSTRUCTION_HINT } from '../server/telemetryAutoIngestion.js';

export const toolDefinitions = [
  {
    name: 'giramichi_create_session',
    description: 'Creates a top-level agent execution session for organizing tasks and activities when multiple AI agents work on the same server. TRIGGER KEYWORDS: Use this tool whenever the user prompt contains "plan", "planning", or requests project task management.',
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
    description: 'Lists active, completed, or archived agent sessions. INSTRUCTION FOR AI AGENT: Do not automatically list all sessions. Instead, ask the user if they want to create a new session or input an existing session ID.',
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
    description: 'Creates a new task card on the Giramichi board under a designated workflow status, session, and decimal execution order. TRIGGER KEYWORDS: Always use when user requests planning or task breakdown ("plan", "planning").',
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
        metrics: {
          type: 'object',
          description: 'Optional LLM execution telemetry (model, prompt_tokens, completion_tokens, cached_tokens, duration_ms, cost_usd)',
          properties: {
            model: { type: 'string' },
            prompt_tokens: { type: 'number' },
            completion_tokens: { type: 'number' },
            cached_tokens: { type: 'number' },
            duration_ms: { type: 'number' },
            cost_usd: { type: 'number' },
          },
        },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'giramichi_batch_create_tasks',
    description: 'Batch adds multiple tasks to the board with sequential or custom decimal order indexes. TRIGGER KEYWORDS: Always use when creating tasks from a plan ("plan", "planning").',
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
              metrics: {
                type: 'object',
                properties: {
                  model: { type: 'string' },
                  prompt_tokens: { type: 'number' },
                  completion_tokens: { type: 'number' },
                  cached_tokens: { type: 'number' },
                  duration_ms: { type: 'number' },
                  cost_usd: { type: 'number' },
                },
              },
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
        metrics: {
          type: 'object',
          description: 'Optional LLM execution telemetry for this transition',
          properties: {
            model: { type: 'string' },
            prompt_tokens: { type: 'number' },
            completion_tokens: { type: 'number' },
            cached_tokens: { type: 'number' },
            duration_ms: { type: 'number' },
            cost_usd: { type: 'number' },
          },
        },
      },
      required: ['task_id', 'new_status_id'],
    },
  },
  {
    name: 'giramichi_update_task',
    description: 'Updates task title, description, priority, order position, tags, or execution metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID (e.g., "GIRA-101")' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        order: { type: 'number', description: 'New execution sequence order (e.g. 1.5 to insert between 1.0 and 2.0)' },
        tags: { type: 'array', items: { type: 'string' } },
        metrics: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            prompt_tokens: { type: 'number' },
            completion_tokens: { type: 'number' },
            cached_tokens: { type: 'number' },
            duration_ms: { type: 'number' },
            cost_usd: { type: 'number' },
          },
        },
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

let activeMcpSessionId: string | null = null;

function findNextTaskToImplement(tasks: any[]) {
  const pending = tasks.filter((t) => t.status_id !== 'done' && t.status_id !== 'completed');
  if (pending.length === 0) return null;
  pending.sort((a, b) => a.order - b.order);
  return pending[0];
}

export async function resolveOrCreateSession(sessionId?: string, agentId?: string): Promise<{ id: string; autoCreated: boolean }> {
  // 1. If explicit session_id is passed (and not special keywords like 'all', 'new', 'auto', 'default'), use it
  if (sessionId && sessionId !== 'all' && sessionId !== 'new' && sessionId !== 'auto' && sessionId !== 'default') {
    const existing = await db.getSessionById(sessionId);
    if (existing) {
      activeMcpSessionId = existing.id;
      return { id: existing.id, autoCreated: false };
    }
  }

  // 2. If 'new' is explicitly requested, force creation of a brand-new session
  if (sessionId === 'new') {
    const now = new Date();
    const sessionName = `Agent Session - ${now.toISOString().replace('T', ' ').slice(0, 16)}`;
    const newSession = await db.createSession(
      sessionName,
      'Newly initialized execution session',
      agentId || 'MCP-Agent'
    );
    activeMcpSessionId = newSession.id;
    return { id: newSession.id, autoCreated: true };
  }

  // 3. If a session was already created or set during this active MCP execution session, reuse it
  if (activeMcpSessionId) {
    const session = await db.getSessionById(activeMcpSessionId);
    if (session && session.status === 'active') {
      return { id: session.id, autoCreated: false };
    }
  }

  // 4. Otherwise (first access in session / no session_id provided):
  // Automatically create a BRAND NEW session for the current task execution!
  const now = new Date();
  const sessionName = `Agent Session - ${now.toISOString().replace('T', ' ').slice(0, 16)}`;
  const newSession = await db.createSession(
    sessionName,
    'Automatically initialized execution session on first MCP access',
    agentId || 'MCP-Agent'
  );
  activeMcpSessionId = newSession.id;
  return { id: newSession.id, autoCreated: true };
}

export async function handleToolCall(name: string, args: any, agentId?: string, createdBy?: any) {
  try {
    switch (name) {
      case 'giramichi_create_session': {
        const session = await db.createSession(args.name, args.description, args.agent_id || agentId, args.workflow_id, createdBy);
        activeMcpSessionId = session.id;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Session "${session.name}" created [ID: ${session.id}].`,
                instruction: MCP_INSTRUCTION_HINT,
                session,
              }, null, 2),
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
              text: JSON.stringify({ success: true, count: sessions.length, instruction: MCP_INSTRUCTION_HINT, sessions }, null, 2),
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
              text: JSON.stringify({
                success: true,
                session,
                instruction: MCP_INSTRUCTION_HINT,
                total_tasks: tasks.length,
                next_task_to_implement: nextTask,
                tasks,
                recent_logs: logs,
              }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_close_session': {
        const session = await db.updateSessionStatus(args.session_id, args.status, agentId, createdBy);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Session [${session.id}] status updated to ${args.status}.`,
                instruction: MCP_INSTRUCTION_HINT,
                session,
              }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_create_workflow': {
        const wf = await db.createWorkflow(args.name, args.description, args.statuses, true, agentId, createdBy);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Workflow "${wf.name}" created and set as active.`,
                instruction: MCP_INSTRUCTION_HINT,
                workflow: wf,
              }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_set_active_workflow': {
        const wf = await db.setActiveWorkflow(args.workflow_id, agentId, createdBy);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Active workflow switched to "${wf.name}".`,
                instruction: MCP_INSTRUCTION_HINT,
                workflow: wf,
              }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_create_task': {
        const { id: targetSessionId, autoCreated } = await resolveOrCreateSession(args.session_id, agentId);
        const effectiveAgent = args.agent_id || agentId || 'AI-Agent';
        const metrics = autoInferMetrics(
          { title: args.title, description: args.description, agentId: effectiveAgent },
          args.metrics
        );
        const metadata = { ...(args.metadata || {}), metrics, agent_id: effectiveAgent };
        const task = await db.createTask(
          args.title,
          args.description,
          args.status_id,
          args.priority,
          args.tags,
          metadata,
          targetSessionId,
          args.order,
          effectiveAgent,
          createdBy
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Task [${task.id}] created in session [${task.session_id}] with order [${task.order}] under status [${task.status_id}].`,
                instruction: MCP_INSTRUCTION_HINT,
                auto_created_session: autoCreated,
                task,
              }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_batch_create_tasks': {
        const { id: targetSessionId, autoCreated } = await resolveOrCreateSession(args.session_id, agentId);
        const effectiveAgent = agentId || 'AI-Agent';
        const enrichedTasks = (args.tasks || []).map((t: any) => {
          const taskAgent = t.agent_id || effectiveAgent;
          const metrics = autoInferMetrics(
            { title: t.title, description: t.description, agentId: taskAgent },
            t.metrics || args.metrics
          );
          return {
            ...t,
            metadata: { ...(t.metadata || {}), metrics, agent_id: taskAgent },
          };
        });
        const created = await db.batchCreateTasks(enrichedTasks, targetSessionId, effectiveAgent, createdBy);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                count: created.length,
                instruction: MCP_INSTRUCTION_HINT,
                auto_created_session: autoCreated,
                target_session_id: targetSessionId,
                tasks: created,
              }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_move_task': {
        const existingTask = await db.getTaskById(args.task_id);
        const effectiveAgent = agentId || existingTask?.metadata?.agent_id || 'AI-Agent';
        const moveMetrics = autoInferMetrics(
          {
            title: existingTask?.title,
            description: existingTask?.description,
            reason: args.reason,
            agentId: effectiveAgent,
          },
          args.metrics
        );

        const currentMetrics = existingTask?.metadata?.metrics || {
          prompt_tokens: 0,
          completion_tokens: 0,
          cached_tokens: 0,
          duration_ms: 0,
          cost_usd: 0,
        };

        const accumulatedMetrics = {
          model: moveMetrics.model,
          prompt_tokens: (currentMetrics.prompt_tokens || 0) + moveMetrics.prompt_tokens,
          completion_tokens: (currentMetrics.completion_tokens || 0) + moveMetrics.completion_tokens,
          cached_tokens: (currentMetrics.cached_tokens || 0) + moveMetrics.cached_tokens,
          duration_ms: (currentMetrics.duration_ms || 0) + moveMetrics.duration_ms,
          cost_usd: Number(((currentMetrics.cost_usd || 0) + moveMetrics.cost_usd).toFixed(6)),
        };

        if (existingTask) {
          await db.updateTask(
            args.task_id,
            {
              metadata: { ...(existingTask.metadata || {}), metrics: accumulatedMetrics, agent_id: effectiveAgent },
            },
            effectiveAgent,
            createdBy
          );
        }

        const task = await db.moveTask(args.task_id, args.new_status_id, args.reason, effectiveAgent, createdBy);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Task [${task.id}] moved to [${task.status_id}].`,
                instruction: MCP_INSTRUCTION_HINT,
                task,
              }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_update_task': {
        const existingTask = await db.getTaskById(args.task_id);
        const effectiveAgent = agentId || existingTask?.metadata?.agent_id || 'AI-Agent';
        let metadata = existingTask?.metadata || {};

        if (args.metrics) {
          const updatedMetrics = autoInferMetrics(
            { title: args.title || existingTask?.title, description: args.description || existingTask?.description, agentId: effectiveAgent },
            args.metrics
          );
          metadata = { ...metadata, metrics: updatedMetrics, agent_id: effectiveAgent };
        }

        const task = await db.updateTask(
          args.task_id,
          {
            title: args.title,
            description: args.description,
            priority: args.priority,
            order: args.order,
            tags: args.tags,
            metadata,
          },
          effectiveAgent,
          createdBy
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Task [${task.id}] updated (order: ${task.order}).`,
                instruction: MCP_INSTRUCTION_HINT,
                task,
              }, null, 2),
            },
          ],
        };
      }

      case 'giramichi_get_board': {
        const { id: targetSessionId, autoCreated } = await resolveOrCreateSession(args.session_id, agentId);
        const workflow = await db.getActiveWorkflow();
        const tasks = await db.getTasks(workflow.id, targetSessionId);
        const logs = await db.getActivityLogs(20, targetSessionId);
        const sessions = await db.getSessions();
        const nextTask = findNextTaskToImplement(tasks);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                workflow,
                active_session_id: targetSessionId,
                auto_created_session: autoCreated,
                instruction: MCP_INSTRUCTION_HINT,
                sessions,
                total_tasks: tasks.length,
                next_task_to_implement: nextTask,
                tasks,
                recent_logs: logs,
              }, null, 2),
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
