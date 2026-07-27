import React from 'react';
import { Sparkles, ShieldAlert, Cpu, Layers } from 'lucide-react';

interface WorkflowHeaderProps {
  workflowName: string;
  workflowDesc: string;
  totalTasks: number;
  workflowsList: Array<{ id: string; name: string }>;
  activeWorkflowId: string;
  onSelectWorkflow: (id: string) => void;
  onTriggerSim: () => void;
  isSimulating: boolean;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  workflowName,
  workflowDesc,
  totalTasks,
  workflowsList,
  activeWorkflowId,
  onSelectWorkflow,
  onTriggerSim,
  isSimulating,
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
                <Cpu size={14} /> AI-GUIDED MODE
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Brilliant New Path — AI-Driven Development Lifecycle Engine
            </p>
          </div>
        </div>

        {/* Action Controls & AI Sim Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <Layers size={16} color="var(--accent-cyan)" />
            <select
              value={activeWorkflowId}
              onChange={(e) => onSelectWorkflow(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {workflowsList.map((wf) => (
                <option key={wf.id} value={wf.id} style={{ background: '#1e293b', color: '#fff' }}>
                  {wf.name}
                </option>
              ))}
            </select>
          </div>

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
            {isSimulating ? 'AI Processing MCP Simulation...' : 'Simulate AI Agent Workflow'}
          </button>
        </div>
      </div>

      {/* Read-Only Safeguard Banner */}
      <div className="read-only-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="var(--accent-amber)" />
          <span>
            <strong>Read-Only Workspace:</strong> Only AI agents have write authority via Model Context Protocol (MCP). The board reflects live AI decisions in real-time.
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
