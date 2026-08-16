import React, { useEffect, useState, useRef } from 'react';
import { Workflow, Task, ActivityLog, Session } from '../db/db.js';
import { WorkflowHeader } from './components/WorkflowHeader.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { ActivityLogStream } from './components/ActivityLogStream.js';
import { TaskDetailModal } from './components/TaskDetailModal.js';
import { TagFilterBar } from './components/TagFilterBar.js';
import { ReportsView } from './components/ReportsView.js';
import { Footer } from './components/Footer.js';
import { fetchConfig, buildApiUrl } from './config.js';

const parseRouteState = (): { sessionId: string; view: 'board' | 'reports'; taskId: string | null } => {
  if (typeof window === 'undefined') {
    return { sessionId: 'all', view: 'board', taskId: null };
  }

  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname.toLowerCase();

  // Determine view
  let view: 'board' | 'reports' = 'board';
  const viewParam = (params.get('view') || params.get('tab') || '').toLowerCase();
  if (
    viewParam === 'reports' ||
    viewParam === 'analytics' ||
    pathname.endsWith('/reports') ||
    pathname.endsWith('/analytics') ||
    pathname === '/reports' ||
    pathname === '/analytics'
  ) {
    view = 'reports';
  }

  // Determine session ID
  let sessionId = params.get('session_id') || params.get('session') || '';
  if (!sessionId) {
    const sessionMatch = window.location.pathname.match(/\/sessions\/([^\/]+)/i);
    if (sessionMatch && sessionMatch[1]) {
      sessionId = decodeURIComponent(sessionMatch[1]);
    }
  }

  // Determine task ID
  let taskId = params.get('task_id') || params.get('task') || params.get('taskId') || null;
  if (!taskId) {
    const taskMatch = window.location.pathname.match(/\/tasks\/([^\/]+)/i);
    if (taskMatch && taskMatch[1]) {
      taskId = decodeURIComponent(taskMatch[1]);
    }
  }

  return {
    sessionId: sessionId || 'all',
    view,
    taskId,
  };
};

export const App: React.FC = () => {
  const initialRoute = parseRouteState();
  const isInitialMount = useRef(true);
  const pendingTaskIdRef = useRef<string | null>(initialRoute.taskId);

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [sessionsList, setSessionsList] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialRoute.sessionId);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'reports'>(initialRoute.view);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  const loadTaskById = async (taskId: string, currentTasks: Task[] = tasks) => {
    const found = currentTasks.find((t) => t.id === taskId);
    if (found) {
      setSelectedTask(found);
      return;
    }
    try {
      const res = await fetch(buildApiUrl(`/api/tasks/${encodeURIComponent(taskId)}`));
      const data = await res.json();
      if (data.success && data.task) {
        setSelectedTask(data.task);
      }
    } catch (err) {
      console.error('Failed to fetch deep linked task:', err);
    }
  };

  // Keep URL query parameters in sync with selected session, active view, and selected task
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);

      // Sync session_id
      if (selectedSessionId && selectedSessionId !== 'all') {
        url.searchParams.set('session_id', selectedSessionId);
      } else {
        url.searchParams.delete('session_id');
        url.searchParams.delete('session');
      }

      // Sync view
      if (activeView === 'reports') {
        url.searchParams.set('view', 'reports');
      } else {
        url.searchParams.delete('view');
        url.searchParams.delete('tab');
      }

      // Sync task_id
      if (selectedTask) {
        url.searchParams.set('task_id', selectedTask.id);
      } else {
        url.searchParams.delete('task_id');
        url.searchParams.delete('task');
        url.searchParams.delete('taskId');
      }

      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedSessionId, activeView, selectedTask]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteState();
      setSelectedSessionId(route.sessionId);
      setActiveView(route.view);
      if (route.taskId) {
        loadTaskById(route.taskId);
      } else {
        setSelectedTask(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tasks]);

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

        // Open deep linked task if specified in URL or pending ref
        const taskIdToOpen = pendingTaskIdRef.current || parseRouteState().taskId;
        if (taskIdToOpen) {
          pendingTaskIdRef.current = null;
          loadTaskById(taskIdToOpen, data.tasks);
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

      <Footer />
    </div>
  );
};

