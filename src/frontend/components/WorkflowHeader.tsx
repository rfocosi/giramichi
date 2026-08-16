import React from 'react';
import { Sparkles, ShieldAlert, Layers, Bot, Activity, LayoutGrid, BarChart3 } from 'lucide-react';
import { Session } from '../../db/db.js';
import { isDemoMode } from '../config.js';

interface WorkflowHeaderProps {
  workflowName: string;
  workflowDesc: string;
  totalTasks?: number;
  sessionsList: Session[];
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  onTriggerSim: () => void;
  isSimulating: boolean;
  isActivityDrawerOpen?: boolean;
  onToggleActivityDrawer?: () => void;
  logCount?: number;
  isDemo?: boolean;
  activeView?: 'board' | 'reports';
  onSelectView?: (view: 'board' | 'reports') => void;
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
  isDemo,
  activeView = 'board',
  onSelectView,
}) => {
  const showDemoButton = isDemo !== undefined ? isDemo : isDemoMode();

  return (
    <header style={{ marginBottom: '20px' }}>
      {/* Row 1: Brand Title on Left, Action Toolbar on Right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={20} color="#ffffff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap' }}>
            Giramichi <span style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--accent-indigo)', marginLeft: '4px' }}>煌道</span>
          </h1>
        </div>

        {/* Action Controls Toolbar - Single Clean Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Primary View Switcher Tabs */}
          {onSelectView && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(15, 23, 42, 0.7)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              <button
                onClick={() => onSelectView('board')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeView === 'board' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  color: activeView === 'board' ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: activeView === 'board' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
                }}
              >
                <LayoutGrid size={14} />
                <span>Kanban Board</span>
              </button>
              <button
                onClick={() => onSelectView('reports')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeView === 'reports' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                  color: activeView === 'reports' ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: activeView === 'reports' ? '0 2px 8px rgba(6, 182, 212, 0.4)' : 'none',
                }}
              >
                <BarChart3 size={14} />
                <span>Analytics & Reports</span>
              </button>
            </div>
          )}

          {/* Agent Session Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.1)', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Bot size={15} color="var(--accent-indigo)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>SESSION:</span>
            <select
              value={selectedSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '180px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <Layers size={15} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>WORKFLOW:</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                gap: '6px',
                background: isActivityDrawerOpen ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.05)',
                border: isActivityDrawerOpen ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                padding: '5px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Activity size={15} color="var(--accent-cyan)" />
              <span>Activity Stream</span>
              {logCount !== undefined && logCount > 0 && (
                <span
                  style={{
                    background: 'rgba(6, 182, 212, 0.2)',
                    color: 'var(--accent-cyan)',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {logCount}
                </span>
              )}
            </button>
          )}

          {/* Simulation Button */}
          {showDemoButton && (
            <button
              onClick={onTriggerSim}
              disabled={isSimulating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isSimulating
                  ? 'rgba(99, 102, 241, 0.4)'
                  : 'linear-gradient(135deg, #6366f1, #06b6d4)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                padding: '6px 14px',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={15} />
              {isSimulating ? 'Simulating...' : 'Simulate Workflows'}
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Subtitle directly under title & Live Realtime Sync aligned to right on same level */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Autonomous Execution Engine — Multi-Agent Session Pipeline & Real-Time Human Oversight
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', flexShrink: 0 }}>
          <span className="pulse-dot"></span>
          <span style={{ color: 'var(--accent-emerald)', fontWeight: 500 }}>Live Realtime Sync</span>
        </div>
      </div>

      {/* Row 3: Read-Only Safeguard Banner */}
      <div className="read-only-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="var(--accent-amber)" />
          <span>
            <strong>Read-Only Workspace:</strong> Autonomous AI agents create & execute sessions programmatically over MCP. Human dashboard interaction is strictly read-only.
          </span>
        </div>
      </div>
    </header>
  );
};
