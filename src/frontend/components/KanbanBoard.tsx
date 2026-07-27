import React from 'react';
import { Status, Task } from '../../db/db.js';
import { TaskCard } from './TaskCard.js';
import { Inbox, CheckCircle2, Clock, PlayCircle, Code2, AlertCircle } from 'lucide-react';

interface KanbanBoardProps {
  statuses: Status[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ statuses, tasks, onTaskClick }) => {
  const getStatusIcon = (statusId: string, color: string) => {
    switch (statusId.toLowerCase()) {
      case 'waiting':
      case 'todo':
      case 'backlog':
        return <Clock size={18} color={color} />;
      case 'in_progress':
      case 'progress':
      case 'doing':
        return <PlayCircle size={18} color={color} />;
      case 'code_review':
      case 'review':
        return <Code2 size={18} color={color} />;
      case 'done':
      case 'completed':
        return <CheckCircle2 size={18} color={color} />;
      default:
        return <Inbox size={18} color={color} />;
    }
  };

  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order);

  return (
    <div className="board-container">
      {sortedStatuses.map((status) => {
        const columnTasks = tasks.filter((t) => t.status_id === status.id);

        return (
          <div key={status.id} className="kanban-column">
            <div className="column-header">
              <div className="column-title">
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: status.color || '#3b82f6',
                    boxShadow: `0 0 10px ${status.color || '#3b82f6'}`,
                  }}
                ></span>
                {getStatusIcon(status.id, status.color || '#3b82f6')}
                <span>{status.name}</span>
              </div>
              <span className="column-count">{columnTasks.length}</span>
            </div>

            {status.description && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '12px', fontStyle: 'italic' }}>
                {status.description}
              </p>
            )}

            <div className="column-tasks">
              {columnTasks.length === 0 ? (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    border: '1px dashed rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: 'var(--text-dim)',
                    fontSize: '0.8rem',
                  }}
                >
                  No tasks currently in {status.name}
                </div>
              ) : (
                columnTasks.map((task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
