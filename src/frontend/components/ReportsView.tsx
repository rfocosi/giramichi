import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, FileText, Download, Calendar, Sparkles } from 'lucide-react';
import { ReportsData } from '../../server/reportsEngine.js';
import { Session, Task } from '../../db/db.js';
import { buildApiUrl } from '../config.js';
import { ExecutiveKPIRibbon } from './ExecutiveKPIRibbon.js';
import { StageDwellChart } from './StageDwellChart.js';
import { AgentModelDistribution } from './AgentModelDistribution.js';
import { TaskMetricsTable } from './TaskMetricsTable.js';
import { SprintRetroModal } from './SprintRetroModal.js';

interface ReportsViewProps {
  selectedSessionId: string;
  sessionsList: Session[];
  tasks: Task[];
  onSelectTaskId: (taskId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  selectedSessionId,
  sessionsList,
  tasks,
  onSelectTaskId,
}) => {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [timeframe, setTimeframe] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [loading, setLoading] = useState(true);
  const [isRetroModalOpen, setIsRetroModalOpen] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/reports?session_id=${encodeURIComponent(selectedSessionId)}&timeframe=${timeframe}`;
      const res = await fetch(buildApiUrl(url));
      const data = await res.json();
      if (data.success && data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Failed to fetch reports data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId, timeframe]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const currentSession = sessionsList.find((s) => s.id === selectedSessionId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter & Toolbar Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Timeframe selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="var(--accent-indigo)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>TIMEFRAME:</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
            }}
          >
            {(['all', '24h', '7d', '30d'] as const).map((tf) => {
              const label = tf === 'all' ? 'All Time' : tf === '24h' ? '24 Hours' : tf === '7d' ? '7 Days' : '30 Days';
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: timeframe === tf ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                    color: timeframe === tf ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: Retrospective generator, Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsRetroModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '7px 14px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            }}
          >
            <FileText size={14} />
            <span>Generate Sprint Retrospective</span>
          </button>

          <button
            onClick={fetchReports}
            title="Refresh Metrics"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              padding: '7px 10px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Reports Content Body */}
      {loading && !reports ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--accent-cyan)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
          <h3>Computing Intelligence Telemetry...</h3>
        </div>
      ) : reports ? (
        <>
          {/* Executive KPI Stat Cards */}
          <ExecutiveKPIRibbon summary={reports.summary} />

          {/* 2-Column Analytics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '20px',
            }}
          >
            <StageDwellChart dwellTimes={reports.dwellTimes} />
            <AgentModelDistribution
              agentBreakdown={reports.agentBreakdown}
              modelBreakdown={reports.modelBreakdown}
              costByTag={reports.costByTag}
              costByPriority={reports.costByPriority}
              totalCostUsd={reports.summary.totalCostUsd}
            />
          </div>

          {/* Task-Level Cost & Efficiency Drilldown Table */}
          <TaskMetricsTable tasks={reports.tasks} onSelectTask={onSelectTaskId} />

          {/* Sprint Retrospective Markdown Modal */}
          <SprintRetroModal
            reports={reports}
            session={currentSession}
            isOpen={isRetroModalOpen}
            onClose={() => setIsRetroModalOpen(false)}
          />
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No telemetry data available for this selection.
        </div>
      )}
    </div>
  );
};
