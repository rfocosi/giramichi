import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Sparkles } from 'lucide-react';
import { ReportsData } from '../../server/reportsEngine.js';
import { Session } from '../../db/db.js';

interface SprintRetroModalProps {
  reports: ReportsData;
  session?: Session | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SprintRetroModal: React.FC<SprintRetroModalProps> = ({
  reports,
  session,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sessionTitle = session?.name || 'All Active Agent Sessions';
  const completedTasks = reports.tasks.filter((t) => t.statusId === 'done' || t.statusId === 'completed');

  const markdownContent = `# 🚀 Giramichi AI Execution & Sprint Retrospective Report
**Generated:** ${new Date(reports.generatedAt).toLocaleString()}  
**Scope:** ${sessionTitle} (${reports.timeframe.toUpperCase()})  
**Workflow Engine:** Multi-Agent Autonomous Pipeline  

---

## 📊 Executive Summary & Velocity
- **Completed Deliverables:** ${reports.summary.completedTasks} / ${reports.summary.totalTasks} (${reports.summary.completionRate}% completion)
- **Agent Velocity:** ${reports.summary.avgVelocityTasksPerHour} tasks/hour
- **Mean Cycle Time:** ${reports.summary.avgCycleTimeMinutes} minutes (from In Progress ➔ Done)
- **Mean Lead Time:** ${reports.summary.avgLeadTimeMinutes} minutes
- **Rework / Backward Transitions:** ${reports.summary.reworkCount} (${reports.summary.reworkRate}%)

---

## 🪙 LLM Token & Financial Efficiency
- **Total Tokens Consumed:** ${(reports.summary.totalTokens / 1_000_000).toFixed(3)}M tokens
  - *Prompt (Input):* ${(reports.summary.totalPromptTokens / 1_000_000).toFixed(3)}M tokens
  - *Completion (Output):* ${(reports.summary.totalCompletionTokens / 1_000_000).toFixed(3)}M tokens
  - *Cached Context Read:* ${(reports.summary.totalCachedTokens / 1_000_000).toFixed(3)}M tokens
- **Incurred API Cost:** $${reports.summary.totalCostUsd.toFixed(4)} USD
- **Average Cost per Completed Task:** $${reports.summary.avgCostPerCompletedTaskUsd.toFixed(4)} USD
- **Estimated Human Engineering Hours Saved:** ~${reports.summary.estimatedHumanHoursSaved} hours (~$${reports.summary.estimatedHumanValueUsd.toLocaleString()} value)
- **Financial ROI Multiplier:** ${reports.summary.roiMultiplier}x

---

## ⏱️ Workflow Column Dwell Times (Bottlenecks)
| Status Column | Order | Avg Duration | Touches | % of Total Time |
| :--- | :---: | :---: | :---: | :---: |
${reports.dwellTimes
  .map(
    (d) =>
      `| **${d.statusName}** | ${d.order} | ${(d.avgDurationMs / 60000).toFixed(1)}m | ${d.taskCount} | ${d.percentageOfTotal}% |`
  )
  .join('\n')}

---

## 🤖 Multi-Agent & Model Breakdown
| Agent ID | Tasks (Done/Total) | Tokens | Cost (USD) |
| :--- | :---: | :---: | :---: |
${reports.agentBreakdown
  .map(
    (a) =>
      `| \`${a.agentId}\` | ${a.completedTasks} / ${a.totalTasks} | ${(a.totalTokens / 1000).toFixed(1)}k | $${a.costUsd.toFixed(3)} |`
  )
  .join('\n')}

---

## ✅ Completed Tasks Checklist
${completedTasks
  .map(
    (t) =>
      `- [x] **[${t.taskId}]** ${t.title} *(Agent: ${t.agentId || 'AI'}, Cost: $${t.costUsd.toFixed(4)}, ${(t.cycleTimeMs / 60000).toFixed(1)}m)*`
  )
  .join('\n')}

---
*Report generated automatically by Giramichi (煌道) Autonomous AI Project Engine.*
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giramichi-sprint-retro-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giramichi-reports-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          border: '1px solid var(--border-glow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '6px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                color: '#ffffff',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                Sprint Retrospective Summary
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Exportable markdown report for team retrospectives & executive reviews
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Markdown Preview Box */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <pre
            style={{
              backgroundColor: 'rgba(11, 15, 25, 0.9)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '16px',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '420px',
              overflowY: 'auto',
            }}
          >
            {markdownContent}
          </pre>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleDownloadMarkdown}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-main)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={14} />
              <span>Download .md</span>
            </button>

            <button
              onClick={handleDownloadJson}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-main)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={14} />
              <span>Export Raw JSON</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? 'var(--accent-emerald)' : 'linear-gradient(135deg, #6366f1, #06b6d4)',
              border: 'none',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Markdown Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
