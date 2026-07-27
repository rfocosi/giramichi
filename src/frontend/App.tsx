import React, { useEffect, useState } from 'react';
import { Workflow, Task, ActivityLog, Status } from '../db/db.js';
import { WorkflowHeader } from './components/WorkflowHeader.js';
import { KanbanBoard } from './components/KanbanBoard.js';
import { ActivityLogStream } from './components/ActivityLogStream.js';
import { TaskDetailModal } from './components/TaskDetailModal.js';

export const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [workflowsList, setWorkflowsList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch initial board state
  const fetchBoard = async () => {
    try {
      const res = await fetch('/api/board');
      const data = await res.json();
      if (data.success) {
        setWorkflow(data.workflow);
        setTasks(data.tasks);
        setLogs(data.logs);
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
    fetchBoard();
    fetchWorkflowsList();

    // Subscribe to SSE stream for real-time live sync
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[SSE Event Received]', payload);
        fetchBoard();
        fetchWorkflowsList();
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

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
        fetchBoard();
      }
    } catch (err) {
      console.error('Failed to switch workflow:', err);
    }
  };

  // Run a complete AI workflow simulation demonstration over MCP
  const handleTriggerSim = async () => {
    setIsSimulating(true);
    try {
      // Step 1: AI generates custom workflow
      await fetch('/api/mcp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'giramichi_create_workflow',
          args: {
            name: 'Brilliant AI Full-Stack Workflow',
            description: 'AI-designed workflow featuring Waiting -> In Progress -> Code Review -> Done',
            statuses: [
              { id: 'waiting', name: 'Waiting', color: '#3b82f6', order: 1, description: 'Queued for AI execution' },
              { id: 'in_progress', name: 'In Progress', color: '#f59e0b', order: 2, description: 'AI agent working on feature implementation' },
              { id: 'code_review', name: 'Code Review', color: '#8b5cf6', order: 3, description: 'Automated verification & static analysis' },
              { id: 'done', name: 'Done', color: '#10b981', order: 4, description: 'Successfully verified & merged deliverable' },
            ],
          },
        }),
      });

      await new Promise((r) => setTimeout(r, 800));

      // Step 2: AI batch creates initial tasks
      const batchRes = await fetch('/api/mcp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'giramichi_batch_create_tasks',
          args: {
            tasks: [
              {
                title: 'Implement Database Connection Pool & Schema Migration',
                description: 'Set up SQLite WAL mode database tables for workflows, tasks, and activity logs.',
                status_id: 'waiting',
                priority: 'high',
                tags: ['database', 'backend', 'core'],
              },
              {
                title: 'Expose MCP Stdio & SSE Event Server Interface',
                description: 'Configure @modelcontextprotocol/sdk stdio transport and Express Server-Sent Events endpoint.',
                status_id: 'waiting',
                priority: 'urgent',
                tags: ['mcp', 'api', 'realtime'],
              },
              {
                title: 'Build Read-Only Modern Kanban Board UI',
                description: 'Construct Vite + React dark mode UI with glassmorphism aesthetics and live SSE listeners.',
                status_id: 'waiting',
                priority: 'medium',
                tags: ['frontend', 'react', 'ui'],
              },
            ],
          },
        }),
      });
      const batchData = await batchRes.json();
      const createdTasks: Task[] = JSON.parse(batchData.result.content[0].text).tasks;

      await new Promise((r) => setTimeout(r, 1000));

      // Step 3: AI moves first task from Waiting -> In Progress
      if (createdTasks.length > 0) {
        await fetch('/api/mcp-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'giramichi_move_task',
            args: {
              task_id: createdTasks[0].id,
              new_status_id: 'in_progress',
              reason: 'AI agent started database schema initialization and connection pooling setup.',
            },
          }),
        });

        await new Promise((r) => setTimeout(r, 1200));

        // Step 4: AI moves task to Code Review
        await fetch('/api/mcp-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'giramichi_move_task',
            args: {
              task_id: createdTasks[0].id,
              new_status_id: 'code_review',
              reason: 'Database tables initialized. Running unit tests and verification suite.',
            },
          }),
        });

        await new Promise((r) => setTimeout(r, 1200));

        // Step 5: AI marks task Done
        await fetch('/api/mcp-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'giramichi_move_task',
            args: {
              task_id: createdTasks[0].id,
              new_status_id: 'done',
              reason: 'All database constraints and CRUD operations verified successfully.',
            },
          }),
        });
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
      fetchBoard();
      fetchWorkflowsList();
    }
  };

  if (loading || !workflow) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--accent-indigo)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading Giramichi 煌道...</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Initializing AI-Guided Dashboard System</p>
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
        onTriggerSim={handleTriggerSim}
        isSimulating={isSimulating}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        <div>
          <KanbanBoard
            statuses={workflow.statuses}
            tasks={tasks}
            onTaskClick={(task) => setSelectedTask(task)}
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
      />
    </div>
  );
};
