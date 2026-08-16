import React, { useEffect, useState } from 'react';
import { Workflow, Task, ActivityLog, Session } from '../db/db.js';
import { WorkflowHeader } from './components/WorkflowHeader.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { ActivityLogStream } from './components/ActivityLogStream.js';
import { TaskDetailModal } from './components/TaskDetailModal.js';
import { TagFilterBar } from './components/TagFilterBar.js';
import { ReportsView } from './components/ReportsView.js';
import { fetchConfig, buildApiUrl, isDemoMode } from './config.js';

export const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [sessionsList, setSessionsList] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'reports'>('board');
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Tag Filtering State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<'OR' | 'AND'>('OR');

  // Fetch sessions list
  const fetchSessions = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/sessions'));
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
      const res = await fetch(buildApiUrl(url));
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

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const init = async () => {
      try {
        await fetchConfig();
        fetchBoard(selectedSessionId);
        fetchSessions();

        // Subscribe to SSE stream for real-time live sync
        setSyncStatus('connecting');
        eventSource = new EventSource(buildApiUrl('/api/events'));

        eventSource.onopen = () => {
          setSyncStatus('connected');
        };

        eventSource.onmessage = (event) => {
          setSyncStatus('connected');
          try {
            const payload = JSON.parse(event.data);
            console.log('[SSE Event Received]', payload);
            fetchBoard(selectedSessionId);
            fetchSessions();
          } catch (err) {
            console.error('Failed to parse SSE payload:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.warn('[SSE Connection Error/Reconnecting]', err);
          if (eventSource?.readyState === EventSource.CLOSED) {
            setSyncStatus('disconnected');
          } else {
            setSyncStatus('connecting');
          }
        };
      } catch (err: any) {
        console.error('Configuration Initialization Error:', err);
        setConfigError(err.message || 'GIRAMICHI_API_URL is not defined');
        setSyncStatus('disconnected');
        setLoading(false);
      }
    };

    init();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [selectedSessionId]);

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
    if (!isDemoMode()) {
      console.warn('[Giramichi] Simulation demo task creation blocked: demo mode is not active.');
      return;
    }
    setIsSimulating(true);
    try {
      // Step 1: Agent 1 creates Session A ("Payment Service Agent")
      const sessARes = await fetch(buildApiUrl('/api/mcp-direct'), {
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
      const sessBRes = await fetch(buildApiUrl('/api/mcp-direct'), {
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

      // Step 3: Agent 1 adds tasks to Session A with telemetry metrics
      const batchARes = await fetch(buildApiUrl('/api/mcp-direct'), {
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
                metrics: {
                  model: 'claude-3-5-sonnet-20241022',
                  prompt_tokens: 18400,
                  completion_tokens: 1650,
                  cached_tokens: 4200,
                  duration_ms: 21000,
                },
              },
              {
                title: 'PayPal Checkout Flow API Integration',
                description: 'Set up v2 checkout order creation and capture endpoints.',
                status_id: 'waiting',
                priority: 'high',
                tags: ['payment', 'paypal', 'api'],
                metrics: {
                  model: 'claude-3-5-sonnet-20241022',
                  prompt_tokens: 14200,
                  completion_tokens: 1100,
                  cached_tokens: 2800,
                  duration_ms: 15400,
                },
              },
            ],
          },
        }),
      });
      const batchAData = await batchARes.json();
      const tasksA: Task[] = JSON.parse(batchAData.result.content[0].text).tasks;

      // Step 4: Agent 2 adds tasks to Session B with telemetry metrics
      await fetch(buildApiUrl('/api/mcp-direct'), {
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
                metrics: {
                  model: 'claude-3-5-haiku',
                  prompt_tokens: 11200,
                  completion_tokens: 950,
                  cached_tokens: 2100,
                  duration_ms: 10200,
                },
              },
            ],
          },
        }),
      });

      await new Promise((r) => setTimeout(r, 1000));

      // Step 5: Agent 1 moves Stripe Task in Session A to In Progress -> Done
      if (tasksA.length > 0) {
        await fetch(buildApiUrl('/api/mcp-direct'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'giramichi_move_task',
            args: {
              task_id: tasksA[0].id,
              new_status_id: 'in_progress',
              reason: 'Agent started implementing Stripe Webhook HMAC verification.',
              metrics: {
                model: 'claude-3-5-sonnet-20241022',
                prompt_tokens: 21000,
                completion_tokens: 1850,
                cached_tokens: 6500,
                duration_ms: 24000,
              },
            },
          }),
        });

        await new Promise((r) => setTimeout(r, 1200));

        await fetch(buildApiUrl('/api/mcp-direct'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'giramichi_move_task',
            args: {
              task_id: tasksA[0].id,
              new_status_id: 'done',
              reason: 'Stripe webhook signature verified and unit tests passing.',
              metrics: {
                model: 'claude-3-5-sonnet-20241022',
                prompt_tokens: 25400,
                completion_tokens: 2200,
                cached_tokens: 9800,
                duration_ms: 32000,
              },
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
    }
  };

  if (configError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#ef4444' }}>
        <div style={{ textAlign: 'center', padding: '32px 48px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #ef4444', maxWidth: '500px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Initialization Error</h2>
          <p style={{ color: '#fca5a5', fontSize: '15px', lineHeight: '1.5' }}>{configError}</p>
        </div>
      </div>
    );
  }

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
        sessionsList={sessionsList}
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSession}
        onTriggerSim={handleTriggerSim}
        isSimulating={isSimulating}
        isActivityDrawerOpen={isActivityDrawerOpen}
        onToggleActivityDrawer={() => setIsActivityDrawerOpen((prev) => !prev)}
        logCount={logs.length}
        activeView={activeView}
        onSelectView={(view) => setActiveView(view)}
        syncStatus={syncStatus}
      />

      {activeView === 'board' ? (
        <>
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

          <div>
            <KanbanBoard
              statuses={workflow.statuses}
              tasks={filteredTasks}
              onTaskClick={(task) => setSelectedTask(task)}
              onTagClick={handleToggleTag}
            />
          </div>
        </>
      ) : (
        <ReportsView
          selectedSessionId={selectedSessionId}
          sessionsList={sessionsList}
          tasks={tasks}
          onSelectTaskId={(taskId) => {
            const found = tasks.find((t) => t.id === taskId);
            if (found) setSelectedTask(found);
          }}
        />
      )}

      <ActivityLogStream
        logs={logs}
        isOpen={isActivityDrawerOpen}
        onClose={() => setIsActivityDrawerOpen(false)}
      />

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

