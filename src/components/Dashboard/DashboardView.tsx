import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Target,
  Flame,
  RotateCcw,
} from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { localApi } from '../../services/localApi';
import { DashboardCategorySummary, DashboardSummaryStats, MetricRollup } from '../../types';
import { parseIsoDate, formatToIso, shiftDate } from '../../utils/dateUtils';
import { TrendBars } from './TrendBars';

type DashboardPeriod = 'week' | 'month' | 'quarter' | 'year';

// Full bar = success for normal targets, but = limit hit for budgets.
function barColor(r: MetricRollup): 'good' | 'over' | 'neutral' {
  const pct = r.progressPercent ?? 0;
  if (r.metric.lowerIsBetter) return pct > 100 ? 'over' : 'neutral';
  return pct >= 100 ? 'good' : 'neutral';
}

export const DashboardView: React.FC = () => {
  const { activeDate, database } = useTracker();
  const [period, setPeriod] = useState<DashboardPeriod>('week');
  const [refDate, setRefDate] = useState<string>(activeDate);
  const [dateRangeLabel, setDateRangeLabel] = useState<string>('');
  const [categories, setCategories] = useState<DashboardCategorySummary[]>([]);
  const [summaryStats, setSummaryStats] = useState<DashboardSummaryStats | null>(null);
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    localApi.getDashboard(period, refDate).then((res) => {
      if (isMounted) {
        setDateRangeLabel(res.dateRangeLabel);
        setCategories(res.categories);
        if (res.summaryStats) {
          setSummaryStats(res.summaryStats);
        }
        // Auto-expand first metric if none expanded
        if (!expandedMetricId && res.categories[0]?.metrics[0]) {
          setExpandedMetricId(res.categories[0].metrics[0].metric.id);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [period, refDate, database]);

  // Navigate timeframes
  const handlePrevPeriod = () => {
    if (period === 'week') {
      setRefDate((d) => shiftDate(d, -7));
    } else if (period === 'month') {
      const dateObj = parseIsoDate(refDate);
      dateObj.setMonth(dateObj.getMonth() - 1);
      setRefDate(formatToIso(dateObj));
    } else if (period === 'quarter') {
      const dateObj = parseIsoDate(refDate);
      dateObj.setMonth(dateObj.getMonth() - 3);
      setRefDate(formatToIso(dateObj));
    } else {
      const dateObj = parseIsoDate(refDate);
      dateObj.setFullYear(dateObj.getFullYear() - 1);
      setRefDate(formatToIso(dateObj));
    }
  };

  const handleNextPeriod = () => {
    if (period === 'week') {
      setRefDate((d) => shiftDate(d, 7));
    } else if (period === 'month') {
      const dateObj = parseIsoDate(refDate);
      dateObj.setMonth(dateObj.getMonth() + 1);
      setRefDate(formatToIso(dateObj));
    } else if (period === 'quarter') {
      const dateObj = parseIsoDate(refDate);
      dateObj.setMonth(dateObj.getMonth() + 3);
      setRefDate(formatToIso(dateObj));
    } else {
      const dateObj = parseIsoDate(refDate);
      dateObj.setFullYear(dateObj.getFullYear() + 1);
      setRefDate(formatToIso(dateObj));
    }
  };

  const handleResetCurrent = () => {
    setRefDate(activeDate);
  };

  const isCurrentPeriod = refDate === activeDate;

  return (
    <div className="view-container">
      {/* ── View Header ── */}
      <div className="view-header" style={{ marginBottom: 16 }}>
        <div className="view-title-row" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 className="view-title">Progress</h2>
          </div>

          {/* Timeframe Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            {(['week', 'month', 'quarter', 'year'] as DashboardPeriod[]).map((p) => (
              <button
                key={p}
                className="chip-btn"
                style={{
                  background: period === p ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                  color: period === p ? '#ffffff' : 'var(--text-secondary)',
                  borderColor: period === p ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                  boxShadow: period === p ? '0 1px 3px rgba(0, 0, 0, 0.3), inset 0 0.5px 0 rgba(255, 255, 255, 0.25)' : 'none',
                  fontWeight: period === p ? 600 : 500,
                  fontSize: 'var(--fs-caption)',
                  padding: '5px 12px',
                  textTransform: 'capitalize',
                  transition: 'all 0.12s ease',
                }}
                onClick={() => {
                  setPeriod(p);
                  setRefDate(activeDate);
                }}
              >
                {p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'Year'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Timeframe Date Navigation Bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '7px 12px',
            marginTop: 14,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={handlePrevPeriod}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 5,
                width: 26,
                height: 26,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.1s ease',
              }}
              title="Previous period"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleNextPeriod}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 5,
                width: 26,
                height: 26,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.1s ease',
              }}
              title="Next period"
            >
              <ChevronRight size={14} />
            </button>

            <span
              style={{
                fontSize: 'var(--fs-body)',
                fontWeight: 600,
                color: '#ffffff',
                marginLeft: 4,
              }}
            >
              {dateRangeLabel}
            </span>
          </div>

          {!isCurrentPeriod && (
            <button
              type="button"
              onClick={handleResetCurrent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 5,
                padding: '3px 9px',
                color: '#ffffff',
                fontSize: 'var(--fs-caption)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              title="Return to current active period"
            >
              <RotateCcw size={11} />
              <span>Current</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Top Summary KPI Cards ── */}
      {summaryStats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* 1. Consistency / Active Days */}
          <div className="card-panel" style={{ padding: '12px 14px', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 'var(--fs-caption)', fontWeight: 600, marginBottom: 4 }}>
              <Flame size={13} style={{ color: '#fbbf24' }} />
              <span>Active Days</span>
            </div>
            <div style={{ fontSize: 'var(--fs-num-lg)', fontWeight: 700, color: '#ffffff' }}>
              {summaryStats.activeDays} <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-muted)', fontWeight: 500 }}>/ {summaryStats.totalDays} days</span>
            </div>
            <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)', marginTop: 2 }}>
              {summaryStats.totalEntries} {summaryStats.totalEntries === 1 ? 'entry' : 'entries'} logged
            </div>
          </div>

          {/* 2. Targets On Track */}
          <div className="card-panel" style={{ padding: '12px 14px', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 'var(--fs-caption)', fontWeight: 600, marginBottom: 4 }}>
              <Target size={13} style={{ color: '#34d399' }} />
              <span>Goals On Track</span>
            </div>
            <div style={{ fontSize: 'var(--fs-num-lg)', fontWeight: 700, color: '#ffffff' }}>
              {summaryStats.onTrackCount} <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-muted)', fontWeight: 500 }}>/ {summaryStats.totalTrackedMetrics} targets</span>
            </div>
            <div style={{ fontSize: 'var(--fs-caption)', color: summaryStats.onTrackCount >= summaryStats.totalTrackedMetrics ? '#34d399' : 'var(--text-secondary)', marginTop: 2 }}>
              {summaryStats.totalTrackedMetrics > 0
                ? `${Math.round((summaryStats.onTrackCount / summaryStats.totalTrackedMetrics) * 100)}% pacing on track`
                : 'No targets defined'}
            </div>
          </div>

          {/* 3. Overall Progress */}
          <div className="card-panel" style={{ padding: '12px 14px', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 'var(--fs-caption)', fontWeight: 600, marginBottom: 4 }}>
              <TrendingUp size={13} style={{ color: '#60a5fa' }} />
              <span>Target Completion</span>
            </div>
            <div style={{ fontSize: 'var(--fs-num-lg)', fontWeight: 700, color: '#ffffff' }}>
              {summaryStats.completionRate}%
            </div>
          </div>

        </div>
      )}

      {/* ── Categories Grouping ── */}
      {categories.length > 0 ? (
        categories.map((cat) => (
          <div key={cat.category} className="section-block">
            <div className="panel-header">
              <span className="panel-title">{cat.category}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cat.metrics.map((rollup) => {
                const isExpanded = expandedMetricId === rollup.metric.id;
                const hasTrendData = Boolean(
                  (rollup.trendBuckets && rollup.trendBuckets.length > 0) ||
                  (rollup.dailyValues && rollup.dailyValues.length > 0)
                );

                return (
                  <div
                    key={rollup.metric.id}
                    style={{
                      background: isExpanded ? 'rgba(255, 255, 255, 0.035)' : 'rgba(255, 255, 255, 0.018)',
                      border: isExpanded ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-subtle)',
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
                        cursor: hasTrendData ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (hasTrendData) {
                          setExpandedMetricId(isExpanded ? null : rollup.metric.id);
                        }
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 'var(--fs-item)', color: '#ffffff' }}>
                            {rollup.metric.name}
                          </span>
                          {rollup.paceMessage && (
                            <span
                              style={{
                                fontSize: 'var(--fs-caption)',
                                fontWeight: 600,
                                padding: '1px 6px',
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

                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 'var(--fs-num)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
                            {rollup.formattedValue}
                            {rollup.formattedTarget && (
                              <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {' '}/ {rollup.formattedTarget}
                              </span>
                            )}
                          </div>

                          {rollup.progressPercent !== undefined && (
                            <div style={{ fontSize: 'var(--fs-caption)', fontWeight: 700, color: barColor(rollup) === 'good' ? '#34d399' : barColor(rollup) === 'over' ? '#f87171' : '#ffffff', marginTop: 2 }}>
                              {rollup.progressPercent}%{rollup.metric.lowerIsBetter ? ' of budget' : ''}
                            </div>
                          )}
                        </div>

                        {hasTrendData && (
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
                            background: barColor(rollup) === 'good'
                              ? 'linear-gradient(90deg, #10b981, #34d399)'
                              : barColor(rollup) === 'over'
                              ? 'linear-gradient(90deg, #dc2626, #f87171)'
                              : 'linear-gradient(90deg, rgba(255, 255, 255, 0.5), #ffffff)',
                          }}
                        />
                      </div>
                    )}

                    {/* Dynamic Trend Breakdown Chart */}
                    {isExpanded && <TrendBars rollup={rollup} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p className="empty-note">No metrics yet.</p>
      )}
    </div>
  );
};
