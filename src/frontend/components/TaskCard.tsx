import React, { useState } from 'react';
import { Task } from '../../db/db.js';
import { Clock, Bot, Target, Link, Check } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  isNextTask?: boolean;
  onClick: (task: Task) => void;
  onTagClick?: (tag: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, isNextTask, onClick, onTagClick }) => {
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('task_id', task.id);
      if (task.session_id) {
        url.searchParams.set('session_id', task.session_id);
      }
      const linkText = url.toString();
      let didCopy = false;
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(linkText);
          didCopy = true;
        } catch (_) {}
      }
      if (!didCopy) {
        const textarea = document.createElement('textarea');
        textarea.value = linkText;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy task link:', err);
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
          <button
            className="task-copy-link-btn"
            id={`copy-task-link-${task.id}`}
            onClick={handleCopyLink}
            title={copied ? 'Task link copied!' : `Copy direct link to ${task.id}`}
            aria-label={copied ? 'Task link copied' : `Copy direct link to ${task.id}`}
            style={{
              background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: copied ? '1px solid var(--accent-emerald)' : '1px solid var(--border-glass)',
              borderRadius: '6px',
              padding: '3px 5px',
              color: copied ? 'var(--accent-emerald)' : 'var(--text-dim)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Link size={12} />}
          </button>
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
            <span
              key={idx}
              className="tag-badge interactive-tag"
              onClick={(e) => {
                if (onTagClick) {
                  e.stopPropagation();
                  onTagClick(t);
                }
              }}
              title={`Filter by tag #${t}`}
            >
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
