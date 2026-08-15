import React from 'react';
import { Layers, AlertTriangle, CheckCircle } from 'lucide-react';
import { StageDwellMetric } from '../../server/reportsEngine.js';

interface StageDwellChartProps {
  dwellTimes: StageDwellMetric[];
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = totalSeconds / 60;
  if (totalMinutes < 60) return `${totalMinutes.toFixed(1)}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return `${hours}h ${mins}m`;
}

export const StageDwellChart: React.FC<StageDwellChartProps> = ({ dwellTimes }) => {
  // Find highest dwell stage excluding 'done'
  const nonDoneStages = dwellTimes.filter((d) => d.statusId !== 'done' && d.statusId !== 'completed');
  const maxDwellStage = nonDoneStages.length > 0
    ? nonDoneStages.reduce((prev, curr) => (curr.avgDurationMs > prev.avgDurationMs ? curr : prev), nonDoneStages[0])
    : null;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan)',
            }}
          >
            <Layers size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Stage Dwell Times & Bottlenecks</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average duration tasks remain in each workflow column</p>
          </div>
        </div>

        {maxDwellStage && maxDwellStage.avgDurationMs > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: 'var(--accent-amber)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={13} />
            <span>Bottleneck: <strong>{maxDwellStage.statusName}</strong> ({formatDuration(maxDwellStage.avgDurationMs)})</span>
          </div>
        )}
      </div>

      {/* Progress Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
        {dwellTimes.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
            No stage transitions recorded yet.
          </div>
        ) : (
          dwellTimes.map((stage) => {
            const isBottleneck = maxDwellStage?.statusId === stage.statusId && stage.avgDurationMs > 0;
            const isDone = stage.statusId === 'done' || stage.statusId === 'completed';

            return (
              <div key={stage.statusId} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: stage.color || 'var(--accent-indigo)',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{stage.statusName}</span>
                    {isDone ? (
                      <span style={{ color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem' }}>
                        <CheckCircle size={11} /> Resolution
                      </span>
                    ) : isBottleneck ? (
                      <span style={{ color: 'var(--accent-amber)', fontSize: '0.7rem', fontWeight: 600 }}>
                        (Pacing Constraint)
                      </span>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{stage.taskCount} touches</span>
                    <span style={{ fontWeight: 700, color: '#ffffff', minWidth: '55px', textAlign: 'right' }}>
                      {formatDuration(stage.avgDurationMs)}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', minWidth: '40px', textAlign: 'right' }}>
                      {stage.percentageOfTotal}%
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(3, Math.min(100, stage.percentageOfTotal))}%`,
                      backgroundColor: stage.color || 'var(--accent-indigo)',
                      borderRadius: '4px',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isBottleneck ? '0 0 8px rgba(245, 158, 11, 0.5)' : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
