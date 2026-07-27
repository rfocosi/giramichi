import React from 'react';
import { Tag, Filter, X, SlidersHorizontal } from 'lucide-react';

interface TagCount {
  tag: string;
  count: number;
}

interface TagFilterBarProps {
  availableTags: TagCount[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  matchMode: 'OR' | 'AND';
  onToggleMatchMode: () => void;
  totalFilteredCount: number;
  totalCount: number;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  availableTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  matchMode,
  onToggleMatchMode,
  totalFilteredCount,
  totalCount,
}) => {
  if (availableTags.length === 0) {
    return null;
  }

  const isFiltering = selectedTags.length > 0;

  return (
    <div className="tag-filter-bar glass-panel" style={{ padding: '12px 16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Left section: Filter Label & Tag Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-indigo)', fontWeight: 600, fontSize: '0.85rem' }}>
            <Filter size={16} />
            <span>Filter by Tag:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {availableTags.map(({ tag, count }) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={`tag-chip ${isSelected ? 'active' : ''}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected
                      ? '1px solid rgba(99, 102, 241, 0.8)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(139, 92, 246, 0.35))'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none',
                  }}
                >
                  <Tag size={12} color={isSelected ? '#a5b4fc' : 'var(--text-dim)'} />
                  <span>#{tag}</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      color: isSelected ? '#ffffff' : 'var(--text-dim)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right section: Match Mode & Clear Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedTags.length > 1 && (
            <button
              onClick={onToggleMatchMode}
              title={`Switch to ${matchMode === 'OR' ? 'ALL tags (AND)' : 'ANY tag (OR)'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                color: 'var(--accent-cyan)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Match: {matchMode}</span>
            </button>
          )}

          {isFiltering && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--accent-emerald)' }}>{totalFilteredCount}</strong> of {totalCount} tasks
              </span>

              <button
                onClick={onClearTags}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fda4af',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
                <span>Clear Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
