import React from 'react';
import { Sparkles, ShieldAlert, Cpu, Layers, Bot, Activity } from 'lucide-react';
import { Session } from '../../db/db.js';

interface WorkflowHeaderProps {
  workflowName: string;
  workflowDesc: string;
  totalTasks: number;
  sessionsList: Session[];
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  onTriggerSim: () => void;
  isSimulating: boolean;
  isActivityDrawerOpen?: boolean;
  onToggleActivityDrawer?: () => void;
  logCount?: number;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  workflowName,
  workflowDesc,
  totalTasks,
  sessionsList,
  selectedSessionId,
  onSelectSession,
  onTriggerSim,
  isSimulating,
  isActivityDrawerOpen,
  onToggleActivityDrawer,
  logCount,
}) => {
  return (
    <header style={{ marginBottom: '24px' }}>
      {/* Top Branding & Status Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Giramichi <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--accent-indigo)', marginLeft: '4px' }}>煌道</span>
              </h1>
              <div className="ai-badge">
                <Cpu size={14} /> MULTI-AGENT SESSIONS
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Autonomous Execution Engine — Multi-Agent Session Pipeline & Real-Time Human Oversight
            </p>
          </div>
        </div>

        {/* Action Controls: Read-Only Workflow Badge, Session Selector, Activity Drawer Button & AI Sim Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Agent Session Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Bot size={16} color="var(--accent-indigo)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SESSION:</span>
            <select
              value={selectedSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#1e293b', color: '#fff' }}>
                🌐 All Agent Sessions ({sessionsList.length})
              </option>
              {sessionsList.map((s) => (
                <option key={s.id} value={s.id} style={{ background: '#1e293b', color: '#fff' }}>
                  {s.status === 'active' ? '🟢' : '⚪'} {s.name} {s.agent_id ? `(${s.agent_id})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Read-Only Workflow Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <Layers size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>WORKFLOW:</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {workflowName || 'Active Workflow'}
            </span>
          </div>

          {/* Activity Stream Drawer Button */}
          {onToggleActivityDrawer && (
            <button
              onClick={onToggleActivityDrawer}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isActivityDrawerOpen ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.05)',
                border: isActivityDrawerOpen ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                padding: '6px 12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Activity size={16} color="var(--accent-cyan)" />
              <span>Activity Stream</span>
              {logCount !== undefined && logCount > 0 && (
                <span
                  style={{
                    background: 'rgba(6, 182, 212, 0.2)',
                    color: 'var(--accent-cyan)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {logCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onTriggerSim}
            disabled={isSimulating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isSimulating
                ? 'rgba(99, 102, 241, 0.4)'
                : 'linear-gradient(135deg, #6366f1, #06b6d4)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <Sparkles size={16} />
            {isSimulating ? 'Running Multi-Agent Session Simulation...' : 'Simulate Concurrent Multi-Agent Workflows'}
          </button>
        </div>
      </div>

      {/* Read-Only Safeguard Banner */}
      <div className="read-only-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="var(--accent-amber)" />
          <span>
            <strong>Read-Only Workspace:</strong> Autonomous AI agents create & execute sessions programmatically over MCP. Human dashboard interaction is strictly read-only.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
          <span className="pulse-dot"></span>
          <span style={{ color: 'var(--accent-emerald)', fontWeight: 500 }}>Live Realtime Sync</span>
          <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>|</span>
          <span style={{ color: 'var(--text-muted)' }}>Tasks: {totalTasks}</span>
        </div>
      </div>
    </header>
  );
};
