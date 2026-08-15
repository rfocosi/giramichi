import React from 'react';
import { Zap, Clock, Cpu, DollarSign, TrendingUp, CheckCircle2, RotateCcw } from 'lucide-react';
import { ReportsData } from '../../server/reportsEngine.js';

interface ExecutiveKPIRibbonProps {
  summary: ReportsData['summary'];
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

export const ExecutiveKPIRibbon: React.FC<ExecutiveKPIRibbonProps> = ({ summary }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* 1. Velocity Card */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          borderTop: '3px solid var(--accent-indigo)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Agent Velocity
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-indigo)',
            }}
          >
            <Zap size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            {summary.avgVelocityTasksPerHour}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>tasks / hr</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="var(--accent-emerald)" />
            <span>{summary.completedTasks} of {summary.totalTasks} Done</span>
          </div>
          <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
            {summary.completionRate}% Done
          </span>
        </div>
      </div>

      {/* 2. Mean Cycle Time */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          borderTop: '3px solid var(--accent-cyan)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mean Cycle Time
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan)',
            }}
          >
            <Clock size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            {formatDuration(summary.avgCycleTimeMinutes)}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>In Progress ➔ Done</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <span>Lead Time: {formatDuration(summary.avgLeadTimeMinutes)}</span>
          {summary.reworkRate > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--accent-amber)' }}>
              <RotateCcw size={12} /> {summary.reworkRate}% Rework
            </span>
          )}
        </div>
      </div>

      {/* 3. Total Tokens */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          borderTop: '3px solid var(--accent-violet)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Tokens
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.15)',
              color: 'var(--accent-violet)',
            }}
          >
            <Cpu size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            {formatTokens(summary.totalTokens)}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>tokens</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <span>Prompt: {formatTokens(summary.totalPromptTokens)}</span>
          <span style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>Out: {formatTokens(summary.totalCompletionTokens)}</span>
          {summary.totalCachedTokens > 0 && <span>Cache: {formatTokens(summary.totalCachedTokens)}</span>}
        </div>
      </div>

      {/* 4. Total Cost ($ USD) */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          borderTop: '3px solid var(--accent-amber)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Incurred LLM Cost
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-amber)',
            }}
          >
            <DollarSign size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            ${summary.totalCostUsd.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>USD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <span>Avg ${summary.avgCostPerCompletedTaskUsd.toFixed(3)} / task</span>
          <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>Real-time calculated</span>
        </div>
      </div>

      {/* 5. Estimated Engineering ROI */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
          borderTop: '3px solid var(--accent-emerald)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Engineering ROI
          </span>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)',
            }}
          >
            <TrendingUp size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            {summary.estimatedHumanHoursSaved}h
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>saved</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>~${summary.estimatedHumanValueUsd.toLocaleString()} value</span>
          <span
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: 'var(--accent-emerald)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
            }}
          >
            {summary.roiMultiplier > 0 ? `${summary.roiMultiplier}x ROI` : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
};
