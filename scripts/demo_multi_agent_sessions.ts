import { handleToolCall } from '../src/mcp/tools.js';

async function runMultiAgentSessionsDemo() {
  console.log('=== Giramichi (煌道) Multi-Agent Concurrent Sessions Simulation & Task Ordering ===\n');

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

  // Agent 1 adds tasks with orders 1.0 and 2.0 to Session 1
  console.log(`[Agent 1] Batch creating tasks with decimal order (1.0, 2.0) in Session [${session1.id}]...`);
  const batch1Res = await handleToolCall('giramichi_batch_create_tasks', {
    session_id: session1.id,
    tasks: [
      {
        title: 'Stripe Webhook Signature Verification',
        description: 'Implement HMAC SHA-256 header validation and replay attack prevention.',
        status_id: 'waiting',
        priority: 'urgent',
        order: 1.0,
        tags: ['stripe', 'security', 'payment'],
      },
      {
        title: 'PayPal Order Capture Endpoint',
        description: 'Integrate PayPal v2 checkout capture API.',
        status_id: 'waiting',
        priority: 'high',
        order: 2.0,
        tags: ['paypal', 'checkout'],
      },
    ],
  });
  console.log(batch1Res.content[0].text);

  console.log('\n------------------------------------------------\n');

  // Agent 1 decides an urgent intermediate step is required between 1.0 and 2.0, creating a task with order 1.5!
  console.log(`[Agent 1] Inserting intermediate task with order [1.5] between 1.0 and 2.0...`);
  const interRes = await handleToolCall('giramichi_create_task', {
    title: 'Audit Stripe TLS & Rate Limiting Controls',
    description: 'Ensure TLS 1.3 encryption and IP rate limiting prior to PayPal integration.',
    status_id: 'waiting',
    priority: 'high',
    order: 1.5,
    session_id: session1.id,
    tags: ['security', 'audit'],
  });
  console.log(interRes.content[0].text);

  console.log('\n------------------------------------------------\n');

  // Inspect Session details and next task to implement
  console.log(`[Agent 1] Inspecting Session [${session1.id}] details and next task to implement...`);
  const getSessRes = await handleToolCall('giramichi_get_session', { session_id: session1.id });
  console.log(getSessRes.content[0].text);

  console.log('\n------------------------------------------------\n');

  // Agent 1 moves task 1.0 -> In Progress -> Done
  const tasks1 = JSON.parse(batch1Res.content[0].text).tasks;
  if (tasks1.length > 0) {
    console.log(`[Agent 1] Moving task [${tasks1[0].id}] to In Progress...`);
    await handleToolCall('giramichi_move_task', {
      task_id: tasks1[0].id,
      new_status_id: 'in_progress',
      reason: 'Agent 1 started implementing Stripe HMAC verification middleware.',
    });

    await new Promise((r) => setTimeout(r, 300));

    console.log(`[Agent 1] Moving task [${tasks1[0].id}] to Done...`);
    await handleToolCall('giramichi_move_task', {
      task_id: tasks1[0].id,
      new_status_id: 'done',
      reason: 'Stripe webhook signature verified and unit tests passing cleanly.',
    });
  }

  console.log('\n------------------------------------------------\n');

  // Inspect next task to implement now (should be task 1.5!)
  console.log(`[Agent 1] Inspecting next task to implement after completing task #1.0 (expecting order 1.5)...`);
  const postDoneSessRes = await handleToolCall('giramichi_get_session', { session_id: session1.id });
  const postData = JSON.parse(postDoneSessRes.content[0].text);
  console.log(`Next task to implement: [${postData.next_task_to_implement.id}] "${postData.next_task_to_implement.title}" (order: ${postData.next_task_to_implement.order})`);

  console.log('\n=== Multi-Agent Simulation Finished Successfully ===');
}

runMultiAgentSessionsDemo().catch(console.error);
