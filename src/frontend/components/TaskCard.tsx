import React from 'react';
import { Task } from '../../db/db.js';
import { Tag, Clock, Bot } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
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

  return (
    <div className="task-card" onClick={() => onClick(task)}>
      <div className="task-card-header">
        <span className="task-id">{task.id}</span>
        <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      <h3 className="task-title">{task.title}</h3>
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
          <span>AI Managed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};
