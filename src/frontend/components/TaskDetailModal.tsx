import React, { useState } from 'react';
import { Task, ActivityLog, Status } from '../../db/db.js';
import { X, Bot, Clock, Tag as TagIcon, ArrowRight, ShieldCheck, Link, Check } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  statuses: Status[];
  logs: ActivityLog[];
  onClose: () => void;
  onTagClick?: (tag: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, statuses, logs, onClose, onTagClick }) => {
  if (!task) return null;

  const [copied, setCopied] = useState(false);
  const currentStatus = statuses.find((s) => s.id === task.status_id);
  const taskLogs = logs.filter((l) => l.task_id === task.id);

  const handleCopyLink = async () => {
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
        } catch (_) { }
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel-glow" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="task-id" style={{ fontSize: '0.9rem' }}>{task.id}</span>
            <button
              id="modal-copy-task-link-btn"
              onClick={handleCopyLink}
              title={copied ? 'Task link copied!' : `Copy direct link to ${task.id}`}
              aria-label={copied ? 'Task link copied' : `Copy direct link to ${task.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: copied ? '1px solid var(--accent-emerald)' : '1px solid var(--border-glass)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Link size={13} />}
            </button>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: currentStatus ? `${currentStatus.color}22` : 'rgba(255,255,255,0.1)',
                border: `1px solid ${currentStatus?.color || '#ffffff'}44`,
                color: currentStatus?.color || '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {currentStatus?.name || task.status_id}
            </span>
          </div>

          <button
            id="modal-close-btn"
            aria-label="Close modal"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Task Title & Description */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
          {task.title}
        </h2>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-glass)' }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
            Specification & Acceptance Criteria
          </h4>
          <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {task.description}
          </p>
        </div>

        {/* Tags & Meta Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div>
            <strong style={{ color: 'var(--text-dim)' }}>Priority:</strong>{' '}
            <span style={{ textTransform: 'uppercase', color: '#fff', fontWeight: 600 }}>{task.priority}</span>
          </div>
          <div>
            <strong style={{ color: 'var(--text-dim)' }}>Created:</strong> {new Date(task.created_at).toLocaleString()}
          </div>
          {task.tags && task.tags.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TagIcon size={14} />
              {task.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="tag-badge interactive-tag"
                  style={{ cursor: onTagClick ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (onTagClick) {
                      onTagClick(t);
                      onClose();
                    }
                  }}
                  title={onTagClick ? `Filter board by tag #${t}` : undefined}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Transition Timeline */}
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Bot size={16} color="var(--accent-violet)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
              AI Transition Audit History
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {taskLogs.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                No transition history logged for this task yet.
              </p>
            ) : (
              taskLogs.map((log) => (
                <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)' }}>
                      <ShieldCheck size={14} />
                      <span style={{ fontWeight: 600 }}>{log.action_type}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-main)', margin: '4px 0' }}>{log.details}</p>
                  {log.reason && (
                    <div style={{ marginTop: '6px', padding: '6px 10px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px', color: '#ddd6fe', borderLeft: '3px solid var(--accent-violet)' }}>
                      <strong>AI Rationale:</strong> {log.reason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
