import React, { useState } from 'react';
import { Sparkles, ShieldAlert, Layers, Bot, Activity, LayoutGrid, BarChart3, Copy, Link, Check } from 'lucide-react';
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
  syncStatus?: 'connected' | 'connecting' | 'disconnected';
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
  syncStatus = 'connected',
}) => {
  const showDemoButton = isDemo !== undefined ? isDemo : isDemoMode();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyTextToClipboard = async (text: string): Promise<void> => {
    let copied = false;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (_) {
        // Continue to fallback
      }
    }
    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.error('Clipboard copy error:', err);
      }
    }
  };

  const handleCopySessionId = async () => {
    if (!selectedSessionId || selectedSessionId === 'all') return;
    await copyTextToClipboard(selectedSessionId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopySessionLink = async () => {
    if (!selectedSessionId || selectedSessionId === 'all') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('session_id', selectedSessionId);
      await copyTextToClipboard(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy session link:', err);
    }
  };

  return (
    <header style={{ marginBottom: '20px' }}>
      {/* Row 1: Brand Title & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <img
          src="/giramichi.png"
          alt="Giramichi Logo"
          style={{
            height: '34px',
            width: 'auto',
            objectFit: 'contain',
            flexShrink: 0,
            display: 'block',
          }}
        />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          Giramichi <span style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--accent-indigo)', marginLeft: '6px' }}>煌<br />道</span>
        </h1>
      </div>

      {/* Row 2: Subtitle directly under title & Live Realtime Sync aligned to right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Autonomous Execution Engine — Multi-Agent Session Pipeline & Real-Time Human Oversight
        </p>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', flexShrink: 0 }}
          title={
            syncStatus === 'connected'
              ? 'Connected to server SSE real-time stream'
              : syncStatus === 'connecting'
                ? 'Attempting to establish connection with server...'
                : 'Disconnected from server stream (offline)'
          }
        >
          <span className={`pulse-dot ${syncStatus === 'connecting' ? 'warning' : syncStatus === 'disconnected' ? 'error' : ''}`}></span>
          <span style={{
            color: syncStatus === 'connected' ? 'var(--accent-emerald)' : syncStatus === 'connecting' ? 'var(--accent-amber)' : 'var(--accent-rose)',
            fontWeight: 500
          }}>
            {syncStatus === 'connected' ? 'Live Realtime Sync' : syncStatus === 'connecting' ? 'Reconnecting...' : 'Sync Offline'}
          </span>
        </div>
      </div>

      {/* Row 3: Read-Only Safeguard Banner */}
      <div className="read-only-banner" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="var(--accent-amber)" />
          <span>
            <strong>Read-Only Workspace:</strong> Autonomous AI agents create & execute sessions programmatically over MCP. Human dashboard interaction is strictly read-only.
          </span>
        </div>
      </div>

      {/* Row 4: Controls Toolbar (Below Read-Only Banner) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Left Side: Primary View Switcher Tabs */}
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
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeView === 'board' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: activeView === 'board' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeView === 'board' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
              }}
            >
              <LayoutGrid size={15} />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => onSelectView('reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeView === 'reports' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                color: activeView === 'reports' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeView === 'reports' ? '0 2px 8px rgba(6, 182, 212, 0.4)' : 'none',
              }}
            >
              <BarChart3 size={15} />
              <span>Analytics & Reports</span>
            </button>
          </div>
        )}

        {/* Right Side: Session, Workflow, Activity Stream, and Simulation Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Agent Session Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Bot size={15} color="var(--accent-indigo)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SESSION:</span>
            <select
              value={selectedSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.825rem',
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

          {/* Copy Session ID Button */}
          <button
            id="copy-session-id-btn"
            onClick={handleCopySessionId}
            disabled={!selectedSessionId || selectedSessionId === 'all'}
            title={
              selectedSessionId === 'all'
                ? 'Select a specific session to copy its ID'
                : copiedId
                ? 'Session ID copied!'
                : `Copy Session ID (${selectedSessionId})`
            }
            aria-label={copiedId ? 'Session ID copied' : 'Copy Session ID'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: copiedId
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(255, 255, 255, 0.05)',
              border: copiedId
                ? '1px solid var(--accent-emerald)'
                : '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: copiedId
                ? 'var(--accent-emerald)'
                : selectedSessionId === 'all'
                ? 'var(--text-dim)'
                : 'var(--text-main)',
              padding: '7px 9px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: selectedSessionId === 'all' ? 'not-allowed' : 'pointer',
              opacity: selectedSessionId === 'all' ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {copiedId ? <Check size={15} color="var(--accent-emerald)" /> : <Copy size={15} />}
          </button>

          {/* Copy Session Link Button */}
          <button
            id="copy-session-link-btn"
            onClick={handleCopySessionLink}
            disabled={!selectedSessionId || selectedSessionId === 'all'}
            title={
              selectedSessionId === 'all'
                ? 'Select a specific session to copy its link'
                : copiedLink
                ? 'Session link copied!'
                : `Copy link to session (${selectedSessionId})`
            }
            aria-label={copiedLink ? 'Session link copied' : 'Copy Session Link'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: copiedLink
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(255, 255, 255, 0.05)',
              border: copiedLink
                ? '1px solid var(--accent-emerald)'
                : '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: copiedLink
                ? 'var(--accent-emerald)'
                : selectedSessionId === 'all'
                ? 'var(--text-dim)'
                : 'var(--text-main)',
              padding: '7px 9px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: selectedSessionId === 'all' ? 'not-allowed' : 'pointer',
              opacity: selectedSessionId === 'all' ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {copiedLink ? <Check size={15} color="var(--accent-emerald)" /> : <Link size={15} />}
          </button>

          {/* Read-Only Workflow Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <Layers size={15} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>WORKFLOW:</span>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
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
                padding: '6px 12px',
                fontSize: '0.825rem',
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
                padding: '7px 16px',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={15} />
              {isSimulating ? 'Running Multi-Agent Simulation...' : 'Simulate Multi-Agent Workflows'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
