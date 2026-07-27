import React from 'react';
import { Task } from '../../db/db.js';
import { Clock, Bot, Target } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  isNextTask?: boolean;
  onClick: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, isNextTask, onClick }) => {
  const getPriorityClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'priority-urgent';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
      default:
        return 'priority-low';
    }
  };

  const formattedDate = new Date(task.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const displayOrder = task.order !== undefined && task.order !== null ? task.order.toFixed(1) : '1.0';

  return (
    <div
      className="task-card"
      onClick={() => onClick(task)}
      style={{
        border: isNextTask ? '1px solid var(--accent-indigo)' : undefined,
        boxShadow: isNextTask ? '0 0 16px rgba(99, 102, 241, 0.35)' : undefined,
      }}
    >
      <div className="task-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="task-id">{task.id}</span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            Seq #{displayOrder}
          </span>
        </div>

        <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      {isNextTask && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25))',
            color: '#a5b4fc',
            border: '1px solid rgba(165, 180, 252, 0.4)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: 700,
            marginTop: '8px',
            marginBottom: '4px',
            letterSpacing: '0.02em',
          }}
        >
          <Target size={12} color="#a5b4fc" />
          <span>NEXT TO IMPLEMENT</span>
        </div>
      )}

      <h3 className="task-title" style={{ marginTop: isNextTask ? '4px' : '8px' }}>{task.title}</h3>
      <p className="task-desc">{task.description}</p>

      {task.tags && task.tags.length > 0 && (
        <div className="task-tags">
          {task.tags.map((t, idx) => (
            <span key={idx} className="tag-badge">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Bot size={13} color="var(--accent-violet)" />
          <span style={{ fontWeight: 500 }}>{task.session_id ? task.session_id : 'AI Managed'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};
