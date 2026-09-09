import React, { useState } from 'react';
import { MetricRollup, TrendBucket } from '../../types';

interface TrendBarsProps {
  rollup: MetricRollup;
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export const TrendBars: React.FC<TrendBarsProps> = ({ rollup, period = 'week' }) => {
  const { trendBuckets, dailyValues, metric } = rollup;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Use trendBuckets if available, otherwise adapt dailyValues
  const buckets: TrendBucket[] = (trendBuckets && trendBuckets.length > 0)
    ? trendBuckets
    : (dailyValues || []).map((d) => ({
        label: d.dayLabel,
        value: d.value,
        formattedValue: d.formattedValue,
      }));

  if (!buckets || buckets.length === 0) return null;

  const maxValue = Math.max(...buckets.map((b) => b.value), 1);

  const getPeriodBreakdownTitle = () => {
    switch (period) {
      case 'week':
        return 'Daily Trend (Mon – Sun)';
      case 'month':
        return 'Weekly Milestones';
      case 'quarter':
        return 'Monthly Breakdown';
      case 'year':
        return 'Monthly Pace Across Year';
      default:
        return 'Trend Breakdown';
    }
  };

  return (
    <div
      style={{
        marginTop: 14,
        padding: '14px 16px',
        background: 'rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
            {getPeriodBreakdownTitle()}
          </span>
          {rollup.paceMessage && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 4,
                background: rollup.paceStatus === 'ahead'
                  ? 'rgba(52, 211, 153, 0.12)'
                  : rollup.paceStatus === 'on_track'
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(248, 113, 113, 0.12)',
                color: rollup.paceStatus === 'ahead'
                  ? '#34d399'
                  : rollup.paceStatus === 'on_track'
                  ? '#ffffff'
                  : '#f87171',
                border: `1px solid ${
                  rollup.paceStatus === 'ahead'
                    ? 'rgba(52, 211, 153, 0.25)'
                    : rollup.paceStatus === 'on_track'
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(248, 113, 113, 0.25)'
                }`,
              }}
            >
              {rollup.paceMessage}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          Period Total: <strong style={{ color: '#ffffff' }}>{rollup.formattedValue}</strong>
        </span>
      </div>

      {/* Vertical Columns Bar Chart */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: buckets.length > 8 ? 4 : 8,
          height: 100,
          paddingTop: 18,
          paddingBottom: 4,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
        }}
      >
        {buckets.map((b, idx) => {
          const heightPercent = b.value > 0 ? Math.max(Math.round((b.value / maxValue) * 100), 8) : 0;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={`${b.label}-${idx}`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              {/* Tooltip on Hover */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 4px)',
                    background: '#18181b',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.8)',
                    borderRadius: 5,
                    padding: '3px 7px',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    zIndex: 20,
                    pointerEvents: 'none',
                    animation: 'popoverFadeIn 0.1s ease',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{b.label}</div>
                  {b.subLabel && <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{b.subLabel}</div>}
                  <div style={{ color: '#ffffff', marginTop: 1 }}>{b.value > 0 ? b.formattedValue : '0'}</div>
                </div>
              )}

              {/* Bar Fill */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 32,
                  height: `${heightPercent}%`,
                  minHeight: b.value > 0 ? 6 : 2,
                  borderRadius: '4px 4px 1px 1px',
                  background: b.value > 0
                    ? isHovered
                      ? '#ffffff'
                      : b.isCurrent
                      ? 'linear-gradient(180deg, #ffffff, #a1a1aa)'
                      : 'linear-gradient(180deg, #71717a, #3f3f46)'
                    : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: b.isCurrent && b.value > 0 ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Bar Labels Row */}
      <div
        style={{
          display: 'flex',
          gap: buckets.length > 8 ? 4 : 8,
          marginTop: 6,
        }}
      >
        {buckets.map((b, idx) => (
          <div
            key={`lbl-${b.label}-${idx}`}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: buckets.length > 8 ? '0.62rem' : '0.68rem',
              color: b.isCurrent ? '#ffffff' : hoveredIndex === idx ? '#ffffff' : 'var(--text-muted)',
              fontWeight: b.isCurrent ? 700 : 500,
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={b.subLabel || b.label}
          >
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
};
