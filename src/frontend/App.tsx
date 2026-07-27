import React, { useEffect, useState } from 'react';
import { Workflow, Task, ActivityLog, Session } from '../db/db.js';
import { WorkflowHeader } from './components/WorkflowHeader.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { ActivityLogStream } from './components/ActivityLogStream.js';
import { TaskDetailModal } from './components/TaskDetailModal.js';
import { TagFilterBar } from './components/TagFilterBar.js';

export const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [workflowsList, setWorkflowsList] = useState<Array<{ id: string; name: string }>>([]);
  const [sessionsList, setSessionsList] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tag Filtering State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<'OR' | 'AND'>('OR');

  // Fetch sessions list
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success) {
        setSessionsList(data.sessions);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  // Fetch initial board state for selected session
  const fetchBoard = async (sessId = selectedSessionId) => {
    try {
      const url = sessId && sessId !== 'all' ? `/api/board?session_id=${encodeURIComponent(sessId)}` : '/api/board?session_id=all';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.workflow);
        setTasks(data.tasks);
        setLogs(data.logs);
        if (data.sessions) {
          setSessionsList(data.sessions);
        }
      }
    } catch (err) {
      console.error('Error fetching board state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch workflows list
  const fetchWorkflowsList = async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      if (data.success) {
        setWorkflowsList(data.workflows.map((w: Workflow) => ({ id: w.id, name: w.name })));
      }
    } catch (err) {
      console.error('Error fetching workflows list:', err);
    }
  };

  useEffect(() => {
    fetchBoard(selectedSessionId);
    fetchSessions();
    fetchWorkflowsList();

    // Subscribe to SSE stream for real-time live sync
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[SSE Event Received]', payload);
        fetchBoard(selectedSessionId);
        fetchSessions();
        fetchWorkflowsList();
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [selectedSessionId]);

  const handleSelectWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch('/api/mcp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'giramichi_set_active_workflow',
          args: { workflow_id: workflowId },
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBoard(selectedSessionId);
      }
    } catch (err) {
      console.error('Failed to switch workflow:', err);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    fetchBoard(sessionId);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  const handleToggleMatchMode = () => {
    setTagMatchMode((prev) => (prev === 'OR' ? 'AND' : 'OR'));
  };

  // Compute available tags with frequency count
  const tagCountsMap = new Map<string, number>();
  tasks.forEach((task) => {
    if (Array.isArray(task.tags)) {
      task.tags.forEach((tag) => {
        tagCountsMap.set(tag, (tagCountsMap.get(tag) || 0) + 1);
      });
    }
  });

  const availableTags = Array.from(tagCountsMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  // Compute filtered tasks list based on selected tags and match mode
  const filteredTasks = tasks.filter((task) => {
    if (selectedTags.length === 0) return true;
    const taskTags = task.tags || [];
    if (tagMatchMode === 'AND') {
      return selectedTags.every((t) => taskTags.includes(t));
    }
    return selectedTags.some((t) => taskTags.includes(t));
  });

  // Run a multi-agent simulation demo over MCP
  const handleTriggerSim = async () => {
    setIsSimulating(true);
    try {
      // Step 1: Agent 1 creates Session A ("Payment Service Agent")
      const sessARes = await fetch('/api/mcp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'giramichi_create_session',
          args: {
            name: 'Payment Gateway Integration',
            description: 'Agent handling Stripe & PayPal payment processing microservice',
            agent_id: 'Claude-3.5-Sonnet',
          },
        }),
      });
      const sessAData = await sessARes.json();
      const sessionA: Session = JSON.parse(sessAData.result.content[0].text).session;

      // Step 2: Agent 2 creates Session B ("Analytics Agent")
      const sessBRes = await fetch('/api/mcp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'giramichi_create_session',
          args: {
            name: 'Realtime Analytics Engine',
            description: 'Agent handling telemetry aggregation and SSE metrics pipeline',
            agent_id: 'Antigravity-Agent-2',
          },
        }),
      });
      const sessBData = await sessBRes.json();
      const sessionB: Session = JSON.parse(sessBData.result.content[0].text).session;

      await new Promise((r) => setTimeout(r, 800));

      // Step 3: Agent 1 adds tasks to Session A
      const batchARes = await fetch('/api/mcp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'giramichi_batch_create_tasks',
          args: {
            session_id: sessionA.id,
            tasks: [
              {
                title: 'Stripe Webhook Handler & Idempotency Store',
                description: 'Implement signature verification and DB transaction lock for payment events.',
                status_id: 'waiting',
                priority: 'urgent',
                tags: ['payment', 'stripe', 'backend'],
              },
              {
                title: 'PayPal Checkout Flow API Integration',
                description: 'Set up v2 checkout order creation and capture endpoints.',
                status_id: 'waiting',
                priority: 'high',
                tags: ['payment', 'paypal', 'api'],
              },
            ],
          },
        }),
      });
      const batchAData = await batchARes.json();
      const tasksA: Task[] = JSON.parse(batchAData.result.content[0].text).tasks;

      // Step 4: Agent 2 adds tasks to Session B
      await fetch('/api/mcp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'giramichi_batch_create_tasks',
          args: {
            session_id: sessionB.id,
            tasks: [
              {
                title: 'ClickHouse Event Streaming Pipeline',
                description: 'Configure real-time log ingestion for system metrics.',
                status_id: 'waiting',
                priority: 'medium',
                tags: ['analytics', 'streaming', 'data'],
              },
            ],
          },
        }),
      });

      await new Promise((r) => setTimeout(r, 1000));

      // Step 5: Agent 1 moves Stripe Task in Session A to In Progress -> Done
      if (tasksA.length > 0) {
        await fetch('/api/mcp-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'giramichi_move_task',
            args: {
              task_id: tasksA[0].id,
              new_status_id: 'in_progress',
              reason: 'Agent started implementing Stripe Webhook HMAC verification.',
            },
          }),
        });

        await new Promise((r) => setTimeout(r, 1200));

        await fetch('/api/mcp-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'giramichi_move_task',
            args: {
              task_id: tasksA[0].id,
              new_status_id: 'done',
              reason: 'Stripe webhook signature verified and unit tests passing.',
            },
          }),
        });
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
      fetchBoard(selectedSessionId);
      fetchSessions();
      fetchWorkflowsList();
    }
  };

  if (loading || !workflow) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--accent-indigo)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading Giramichi 煌道...</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Initializing Multi-Agent Sessions Engine</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px' }}>
      <WorkflowHeader
        workflowName={workflow.name}
        workflowDesc={workflow.description}
        totalTasks={tasks.length}
        workflowsList={workflowsList}
        activeWorkflowId={workflow.id}
        onSelectWorkflow={handleSelectWorkflow}
        sessionsList={sessionsList}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSession}
        onTriggerSim={handleTriggerSim}
        isSimulating={isSimulating}
      />

      <TagFilterBar
        availableTags={availableTags}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClearTags={handleClearTags}
        matchMode={tagMatchMode}
        onToggleMatchMode={handleToggleMatchMode}
        totalFilteredCount={filteredTasks.length}
        totalCount={tasks.length}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div>
          <KanbanBoard
            statuses={workflow.statuses}
            tasks={filteredTasks}
            onTaskClick={(task) => setSelectedTask(task)}
            onTagClick={handleToggleTag}
          />
        </div>

        <div>
          <ActivityLogStream logs={logs} />
        </div>
      </div>

      <TaskDetailModal
        task={selectedTask}
        statuses={workflow.statuses}
        logs={logs}
        onClose={() => setSelectedTask(null)}
        onTagClick={handleToggleTag}
      />
    </div>
  );
};
