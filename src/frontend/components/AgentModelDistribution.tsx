import React, { useState } from 'react';
import { Bot, Cpu, Tag, AlertCircle, DollarSign } from 'lucide-react';
import { AgentMetricsSummary, ModelMetricsSummary } from '../../server/reportsEngine.js';

interface AgentModelDistributionProps {
  agentBreakdown: AgentMetricsSummary[];
  modelBreakdown: ModelMetricsSummary[];
  costByTag: Array<{ tag: string; count: number; costUsd: number; tokens: number }>;
  costByPriority: Record<string, { count: number; costUsd: number; tokens: number }>;
  totalCostUsd: number;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

export const AgentModelDistribution: React.FC<AgentModelDistributionProps> = ({
  agentBreakdown,
  modelBreakdown,
  costByTag,
  costByPriority,
  totalCostUsd,
}) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'models' | 'tags' | 'priority'>('agents');

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'var(--accent-rose)';
      case 'high': return 'var(--accent-amber)';
      case 'medium': return 'var(--accent-indigo)';
      case 'low': return 'var(--accent-emerald)';
      default: return 'var(--text-muted)';
    }
  };

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
      {/* Header with Switcher Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.15)',
              color: 'var(--accent-violet)',
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Resource & Spend Breakdown</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Distribution of tokens and cost across workload dimensions</p>
          </div>
        </div>

        {/* Dimension Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid var(--border-glass)',
          }}
        >
          <button
            onClick={() => setActiveTab('agents')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'agents' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
              color: activeTab === 'agents' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <Bot size={12} />
            <span>Agents</span>
          </button>
          <button
            onClick={() => setActiveTab('models')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'models' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
              color: activeTab === 'models' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <Cpu size={12} />
            <span>Models</span>
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'tags' ? 'rgba(6, 182, 212, 0.3)' : 'transparent',
              color: activeTab === 'tags' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <Tag size={12} />
            <span>Tags</span>
          </button>
          <button
            onClick={() => setActiveTab('priority')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'priority' ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
              color: activeTab === 'priority' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <AlertCircle size={12} />
            <span>Priority</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
        {activeTab === 'agents' && (
          agentBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No agent data recorded.</div>
          ) : (
            agentBreakdown.map((item) => {
              const costPercent = totalCostUsd > 0 ? ((item.costUsd / totalCostUsd) * 100).toFixed(1) : '0';
              return (
                <div key={item.agentId} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>{item.agentId}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.completedTasks}/{item.totalTasks} completed)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{formatTokens(item.totalTokens)} tok</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>${item.costUsd.toFixed(3)}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{costPercent}%</span>
                    </div>
                  </div>
                  <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(4, Math.min(100, Number(costPercent)))}%`, backgroundColor: 'var(--accent-indigo)', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })
          )
        )}

        {activeTab === 'models' && (
          modelBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No model data recorded.</div>
          ) : (
            modelBreakdown.map((item) => {
              const costPercent = totalCostUsd > 0 ? ((item.costUsd / totalCostUsd) * 100).toFixed(1) : '0';
              return (
                <div key={item.model} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{item.model}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.totalTasks} tasks)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{formatTokens(item.totalTokens)} tok</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>${item.costUsd.toFixed(3)}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{costPercent}%</span>
                    </div>
                  </div>
                  <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(4, Math.min(100, Number(costPercent)))}%`, backgroundColor: 'var(--accent-violet)', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })
          )
        )}

        {activeTab === 'tags' && (
          costByTag.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No tag metadata found.</div>
          ) : (
            costByTag.map((item) => {
              const costPercent = totalCostUsd > 0 ? ((item.costUsd / totalCostUsd) * 100).toFixed(1) : '0';
              return (
                <div key={item.tag} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          background: 'rgba(6, 182, 212, 0.15)',
                          color: 'var(--accent-cyan)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        #{item.tag}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.count} tasks)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{formatTokens(item.tokens)} tok</span>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>${item.costUsd.toFixed(3)}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{costPercent}%</span>
                    </div>
                  </div>
                  <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(4, Math.min(100, Number(costPercent)))}%`, backgroundColor: 'var(--accent-cyan)', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })
          )
        )}

        {activeTab === 'priority' && (
          Object.entries(costByPriority).map(([p, data]) => {
            const costPercent = totalCostUsd > 0 ? ((data.costUsd / totalCostUsd) * 100).toFixed(1) : '0';
            const color = getPriorityColor(p);
            return (
              <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                    <span style={{ fontWeight: 600, color: '#ffffff', textTransform: 'capitalize' }}>{p}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({data.count} tasks)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{formatTokens(data.tokens)} tok</span>
                    <span style={{ fontWeight: 700, color: '#ffffff' }}>${data.costUsd.toFixed(3)}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{costPercent}%</span>
                  </div>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(4, Math.min(100, Number(costPercent)))}%`, backgroundColor: color, borderRadius: '3px' }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
