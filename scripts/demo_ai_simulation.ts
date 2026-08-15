import { handleToolCall } from '../src/mcp/tools.js';

async function runDemoSimulation() {
  console.log('=== Giramichi (煌道) AI Autonomous Agent MCP Demonstration ===\n');

  // Step 1: AI decides and generates workflow for project
  console.log('[1/4] AI invoking "giramichi_create_workflow"...');
  const wfRes = await handleToolCall('giramichi_create_workflow', {
    name: 'AI Autonomous Sprint Workflow',
    description: 'Designed by Giramichi AI engine featuring Waiting -> In Progress -> Quality Assurance -> Done',
    statuses: [
      { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1, description: 'Tasks waiting in AI queue' },
      { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2, description: 'AI agent working on feature implementation' },
      { id: 'qa', name: 'Quality Assurance', color: '#8b5cf6', order: 3, description: 'Running unit tests, linters, and build validation' },
      { id: 'done', name: 'Done', color: '#10b981', order: 4, description: 'Deliverable complete and merged' },
    ],
  });
  console.log(wfRes.content[0].text);
  console.log('\n------------------------------------------------\n');

  // Step 2: AI generates tasks and adds them to board
  console.log('[2/4] AI invoking "giramichi_batch_create_tasks"...');
  const tasksRes = await handleToolCall('giramichi_batch_create_tasks', {
    tasks: [
      {
        title: 'Generate MCP Tool Schema & Server',
        description: 'Implement stdio MCP protocol handlers for workflow and task management.',
        status_id: 'waiting',
        priority: 'urgent',
        tags: ['mcp', 'protocol', 'ai'],
        metrics: {
          model: 'claude-3-5-sonnet-20241022',
          prompt_tokens: 16500,
          completion_tokens: 1420,
          cached_tokens: 4200,
          duration_ms: 18500,
        },
      },
      {
        title: 'Develop Real-Time SSE Board Sync API',
        description: 'Expose EventStream endpoint to push instant task state updates to web dashboard.',
        status_id: 'waiting',
        priority: 'high',
        tags: ['api', 'sse', 'realtime'],
        metrics: {
          model: 'claude-3-5-sonnet-20241022',
          prompt_tokens: 12400,
          completion_tokens: 980,
          cached_tokens: 3100,
          duration_ms: 12100,
        },
      },
      {
        title: 'Design Read-Only Dark Glassmorphism Interface',
        description: 'Build Vite + React Kanban board with status indicators and AI audit log stream.',
        status_id: 'waiting',
        priority: 'medium',
        tags: ['frontend', 'react', 'design'],
        metrics: {
          model: 'claude-3-5-haiku',
          prompt_tokens: 9800,
          completion_tokens: 850,
          cached_tokens: 2400,
          duration_ms: 8900,
        },
      },
    ],
  });
  console.log(tasksRes.content[0].text);
  console.log('\n------------------------------------------------\n');

  // Step 3: AI moves tasks along status workflow
  const tasksData = JSON.parse(tasksRes.content[0].text).tasks;
  if (tasksData.length > 0) {
    const taskId = tasksData[0].id;

    console.log(`[3/4] AI invoking "giramichi_move_task" for ${taskId}...`);
    const move1 = await handleToolCall('giramichi_move_task', {
      task_id: taskId,
      new_status_id: 'in_progress',
      reason: 'AI agent initiated code generation for MCP Server and schema definitions.',
      metrics: {
        model: 'claude-3-5-sonnet-20241022',
        prompt_tokens: 18200,
        completion_tokens: 1650,
        cached_tokens: 6400,
        duration_ms: 14200,
      },
    });
    console.log(move1.content[0].text);

    await new Promise((r) => setTimeout(r, 500));

    const move2 = await handleToolCall('giramichi_move_task', {
      task_id: taskId,
      new_status_id: 'qa',
      reason: 'MCP server code implemented. Running type-checking and automated tests.',
      metrics: {
        model: 'claude-3-5-sonnet-20241022',
        prompt_tokens: 21500,
        completion_tokens: 1890,
        cached_tokens: 8200,
        duration_ms: 22400,
      },
    });
    console.log(move2.content[0].text);

    await new Promise((r) => setTimeout(r, 500));

    const move3 = await handleToolCall('giramichi_move_task', {
      task_id: taskId,
      new_status_id: 'done',
      reason: 'All tests passed cleanly. Feature verified and deployed.',
      metrics: {
        model: 'claude-3-5-sonnet-20241022',
        prompt_tokens: 24800,
        completion_tokens: 2100,
        cached_tokens: 11500,
        duration_ms: 28600,
      },
    });
    console.log(move3.content[0].text);
  }
  console.log('\n------------------------------------------------\n');

  // Step 4: AI inspects final board state
  console.log('[4/4] AI invoking "giramichi_get_board"...');
  const boardRes = await handleToolCall('giramichi_get_board', {});
  console.log(boardRes.content[0].text);

  console.log('\n=== Simulation Completed Successfully ===');
}

runDemoSimulation().catch(console.error);
