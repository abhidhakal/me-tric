import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { localApi } from '../../services/localApi';
import { DashboardCategorySummary } from '../../types';
import { TrendBars } from './TrendBars';

type DashboardPeriod = 'week' | 'month' | 'quarter' | 'year';

export const DashboardView: React.FC = () => {
  const { activeDate, database } = useTracker();
  const [period, setPeriod] = useState<DashboardPeriod>('week');
  const [dateRangeLabel, setDateRangeLabel] = useState<string>('');
  const [categories, setCategories] = useState<DashboardCategorySummary[]>([]);
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>('metric-deep-work');

  useEffect(() => {
    let isMounted = true;
    localApi.getDashboard(period, activeDate).then((res) => {
      if (isMounted) {
        setDateRangeLabel(res.dateRangeLabel);
        setCategories(res.categories);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [period, activeDate, database]);

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h2 className="view-title">Dashboard</h2>
            <p className="view-subtitle">{dateRangeLabel}</p>
          </div>

          {/* Timeframe Selector */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            {(['week', 'month', 'quarter', 'year'] as DashboardPeriod[]).map((p) => (
              <button
                key={p}
                className="chip-btn"
                style={{
                  background: period === p ? '#ffffff' : 'transparent',
                  color: period === p ? '#000000' : 'var(--text-secondary)',
                  borderColor: period === p ? '#ffffff' : 'transparent',
                  fontWeight: period === p ? 700 : 500,
                  textTransform: 'capitalize',
                }}
                onClick={() => setPeriod(p)}
              >
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'quarter' ? 'This Quarter' : 'This Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Grouping */}
      {categories.map((cat) => (
        <div key={cat.category} className="card-panel">
          <div className="panel-header">
            <span className="panel-title">
              <TrendingUp size={15} style={{ color: 'var(--text-secondary)' }} />
              {cat.category}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {cat.metrics.length} {cat.metrics.length === 1 ? 'metric' : 'metrics'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cat.metrics.map((rollup) => {
              const isExpanded = expandedMetricId === rollup.metric.id;
              const hasDailyValues = rollup.dailyValues && rollup.dailyValues.length > 0;

              return (
                <div
                  key={rollup.metric.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: hasDailyValues ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (hasDailyValues) {
                        setExpandedMetricId(isExpanded ? null : rollup.metric.id);
                      }
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>
                          {rollup.metric.name}
                        </span>
                        {rollup.metric.unit && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({rollup.metric.unit})
                          </span>
                        )}
                      </div>

                      {rollup.formattedTarget && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Target: {rollup.formattedTarget}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                          {rollup.formattedValue}
                          {rollup.formattedTarget && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              {' '}/ {rollup.formattedTarget}
                            </span>
                          )}
                        </div>

                        {rollup.progressPercent !== undefined && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: rollup.progressPercent >= 100 ? '#ffffff' : 'var(--text-secondary)', marginTop: 2 }}>
                            {rollup.progressPercent}% of target
                          </div>
                        )}
                      </div>

                      {hasDailyValues && (
                        <button className="icon-btn" style={{ color: 'var(--text-muted)' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {rollup.progressPercent !== undefined && (
                    <div className="progress-bar-track" style={{ marginTop: 10 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(rollup.progressPercent, 100)}%`,
                          background: 'linear-gradient(90deg, #71717a, #ffffff)',
                        }}
                      />
                    </div>
                  )}

                  {/* Daily Trend Breakdown (Expandable) */}
                  {isExpanded && <TrendBars rollup={rollup} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
