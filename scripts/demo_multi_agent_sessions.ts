import { handleToolCall } from '../src/mcp/tools.js';

async function runMultiAgentSessionsDemo() {
  console.log('=== Giramichi (煌道) Multi-Agent Concurrent Sessions Simulation ===\n');

  // Agent 1 creates Session 1: Payment Gateway Service
  console.log('[Agent 1 (Claude-3.5)] Creating Session 1: Payment Gateway Service...');
  const sess1Res = await handleToolCall('giramichi_create_session', {
    name: 'Payment Gateway Integration',
    description: 'Autonomous session working on Stripe & PayPal microservices',
    agent_id: 'Claude-3.5-Sonnet',
  });
  console.log(sess1Res.content[0].text);
  const session1 = JSON.parse(sess1Res.content[0].text).session;

  console.log('\n------------------------------------------------\n');

  // Agent 2 creates Session 2: Telemetry & Analytics Pipeline
  console.log('[Agent 2 (Antigravity-Agent)] Creating Session 2: Telemetry Engine...');
  const sess2Res = await handleToolCall('giramichi_create_session', {
    name: 'Realtime Analytics & Telemetry',
    description: 'Autonomous session working on ClickHouse event aggregation',
    agent_id: 'Antigravity-Agent-2',
  });
  console.log(sess2Res.content[0].text);
  const session2 = JSON.parse(sess2Res.content[0].text).session;

  console.log('\n------------------------------------------------\n');

  // Agent 1 adds tasks to Session 1
  console.log(`[Agent 1] Batch creating tasks in Session [${session1.id}]...`);
  const batch1Res = await handleToolCall('giramichi_batch_create_tasks', {
    session_id: session1.id,
    tasks: [
      {
        title: 'Stripe Webhook Signature Verification',
        description: 'Implement HMAC SHA-256 header validation and replay attack prevention.',
        status_id: 'waiting',
        priority: 'urgent',
        tags: ['stripe', 'security', 'payment'],
      },
      {
        title: 'PayPal Order Capture Endpoint',
        description: 'Integrate PayPal v2 checkout capture API.',
        status_id: 'waiting',
        priority: 'high',
        tags: ['paypal', 'checkout'],
      },
    ],
  });
  console.log(batch1Res.content[0].text);

  console.log('\n------------------------------------------------\n');

  // Agent 2 adds tasks to Session 2 concurrently
  console.log(`[Agent 2] Batch creating tasks in Session [${session2.id}]...`);
  const batch2Res = await handleToolCall('giramichi_batch_create_tasks', {
    session_id: session2.id,
    tasks: [
      {
        title: 'ClickHouse Columnar Data Ingestion',
        description: 'Build high-throughput buffer queue for SSE log streaming.',
        status_id: 'waiting',
        priority: 'medium',
        tags: ['analytics', 'clickhouse', 'data'],
      },
    ],
  });
  console.log(batch2Res.content[0].text);

  console.log('\n------------------------------------------------\n');

  // Agent 1 moves its task in Session 1
  const tasks1 = JSON.parse(batch1Res.content[0].text).tasks;
  if (tasks1.length > 0) {
    console.log(`[Agent 1] Moving task [${tasks1[0].id}] to In Progress in Session [${session1.id}]...`);
    const move1 = await handleToolCall('giramichi_move_task', {
      task_id: tasks1[0].id,
      new_status_id: 'in_progress',
      reason: 'Agent 1 started implementing Stripe HMAC verification middleware.',
    });
    console.log(move1.content[0].text);

    await new Promise((r) => setTimeout(r, 400));

    console.log(`[Agent 1] Moving task [${tasks1[0].id}] to Done...`);
    const move2 = await handleToolCall('giramichi_move_task', {
      task_id: tasks1[0].id,
      new_status_id: 'done',
      reason: 'Stripe webhook signature verified and unit tests passing cleanly.',
    });
    console.log(move2.content[0].text);
  }

  console.log('\n------------------------------------------------\n');

  // List all sessions
  console.log('Listing all active Sessions on server...');
  const listRes = await handleToolCall('giramichi_list_sessions', {});
  console.log(listRes.content[0].text);

  console.log('\n=== Multi-Agent Simulation Finished Successfully ===');
}

runMultiAgentSessionsDemo().catch(console.error);
