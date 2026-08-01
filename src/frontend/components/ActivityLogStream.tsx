import React from 'react';
import { ActivityLog } from '../../db/db.js';
import { Activity, MoveRight, PlusCircle, Workflow as WorkflowIcon, Edit3, X } from 'lucide-react';

interface ActivityLogStreamProps {
  logs: ActivityLog[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const ActivityLogStream: React.FC<ActivityLogStreamProps> = ({ logs, isOpen = true, onClose }) => {
  if (!isOpen) return null;

  const getActionIcon = (action: ActivityLog['action_type']) => {
    switch (action) {
      case 'WORKFLOW_CREATED':
      case 'WORKFLOW_ACTIVATED':
        return <WorkflowIcon size={14} color="var(--accent-violet)" />;
      case 'TASK_CREATED':
        return <PlusCircle size={14} color="var(--accent-cyan)" />;
      case 'TASK_MOVED':
        return <MoveRight size={14} color="var(--accent-amber)" />;
      case 'TASK_UPDATED':
      default:
        return <Edit3 size={14} color="var(--accent-indigo)" />;
    }
  };

  return (
    <>
      {onClose && <div className="drawer-overlay" onClick={onClose} />}
      <div
        className={onClose ? 'drawer-content' : 'glass-panel'}
        style={!onClose ? { padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' } : {}}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              AI Activity Stream
            </h3>
            <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', marginLeft: '4px' }}>
              {logs.length}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: 'var(--text-muted)',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No recent AI activity recorded
            </div>
          ) : (
            logs.map((log) => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

              return (
                <div
                  key={log.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getActionIcon(log.action_type)}
                      <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.75rem' }}>
                        {log.action_type.replace('_', ' ')}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {timeStr}
                    </span>
                  </div>

                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>{log.details}</p>

                  {log.reason && (
                    <div
                      style={{
                        marginTop: '6px',
                        padding: '4px 8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderLeft: '2px solid var(--accent-indigo)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#c7d2fe',
                      }}
                    >
                      <strong>AI Rationale:</strong> {log.reason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
