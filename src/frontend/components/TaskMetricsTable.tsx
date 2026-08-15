import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ExternalLink, Bot, Cpu, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { TaskMetrics } from '../../server/reportsEngine.js';

interface TaskMetricsTableProps {
  tasks: TaskMetrics[];
  onSelectTask: (taskId: string) => void;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
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

type SortField = 'taskId' | 'title' | 'priority' | 'statusId' | 'totalTokens' | 'costUsd' | 'cycleTimeMs';

export const TaskMetricsTable: React.FC<TaskMetricsTableProps> = ({ tasks, onSelectTask }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('taskId');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        searchTerm === '' ||
        task.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.agentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || task.statusId === statusFilter;
      const matchPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredTasks, sortField, sortAsc]);

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244, 63, 94, 0.3)' };
      case 'high':
        return { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'medium':
        return { background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', border: '1px solid rgba(99, 102, 241, 0.3)' };
      case 'low':
      default:
        return { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'done' || status === 'completed') {
      return { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
    if (status === 'in_progress') {
      return { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' };
    }
    return { background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', border: '1px solid rgba(99, 102, 241, 0.3)' };
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
      {/* Table Header & Search Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Task-Level Telemetry & Cost Drilldown</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {sortedTasks.length} of {tasks.length} tasks
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
            }}
          >
            <Search size={14} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search tasks, agents, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                width: '180px',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ background: '#1e293b' }}>All Statuses</option>
            <option value="waiting" style={{ background: '#1e293b' }}>Waiting</option>
            <option value="in_progress" style={{ background: '#1e293b' }}>In Progress</option>
            <option value="done" style={{ background: '#1e293b' }}>Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-glass)',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all" style={{ background: '#1e293b' }}>All Priorities</option>
            <option value="urgent" style={{ background: '#1e293b' }}>Urgent</option>
            <option value="high" style={{ background: '#1e293b' }}>High</option>
            <option value="medium" style={{ background: '#1e293b' }}>Medium</option>
            <option value="low" style={{ background: '#1e293b' }}>Low</option>
          </select>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th onClick={() => handleSort('taskId')} style={{ padding: '12px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Task ID</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('title')} style={{ padding: '12px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Title & Tags</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('statusId')} style={{ padding: '12px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Status</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 10px' }}>Agent / Model</th>
              <th onClick={() => handleSort('cycleTimeMs')} style={{ padding: '12px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Cycle Time</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('totalTokens')} style={{ padding: '12px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Tokens</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('costUsd')} style={{ padding: '12px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Cost (USD)</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                  No tasks matching the selected filters.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => (
                <tr
                  key={task.taskId}
                  onClick={() => onSelectTask(task.taskId)}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Task ID */}
                  <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                    {task.taskId}
                  </td>

                  {/* Title & Tags */}
                  <td style={{ padding: '12px 10px', maxWidth: '320px' }}>
                    <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          ...getPriorityBadgeStyle(task.priority),
                        }}
                      >
                        {task.priority}
                      </span>
                      {task.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        display: 'inline-block',
                        ...getStatusBadgeStyle(task.statusId),
                      }}
                    >
                      {task.statusId.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Agent & Model */}
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 500 }}>
                      <Bot size={13} color="var(--accent-indigo)" />
                      <span>{task.agentId || 'AI Agent'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                      <Cpu size={11} />
                      <span>{task.model}</span>
                    </div>
                  </td>

                  {/* Cycle Time */}
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff', fontWeight: 600 }}>
                      <Clock size={13} color="var(--accent-cyan)" />
                      <span>{formatDuration(task.cycleTimeMs)}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {task.transitionCount} transitions
                    </span>
                  </td>

                  {/* Tokens */}
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ color: '#ffffff', fontWeight: 600 }}>
                      {formatTokens(task.totalTokens)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      in: {formatTokens(task.promptTokens)} · out: {formatTokens(task.completionTokens)}
                    </div>
                  </td>

                  {/* Cost */}
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                      ${task.costUsd.toFixed(4)}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTask(task.taskId);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = 'var(--accent-indigo)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.borderColor = 'var(--border-glass)';
                      }}
                    >
                      <span>Inspect</span>
                      <ExternalLink size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
