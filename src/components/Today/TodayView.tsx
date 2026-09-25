import React, { useState } from 'react';
import { Trash2, CheckCircle2, CornerDownLeft, Clock } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatDateHeader, getTodayIso } from '../../utils/dateUtils';
import { formatMetricValue } from '../../utils/formatters';
import { computeGoalCascade, dailyShare, getActiveGoal } from '../../utils/aggregation';
import { RemindersSection } from './RemindersSection';
import { DateNavigator } from '../Common/DateNavigator';

function getDynamicGreeting(
  name: string | undefined,
  occupation: string | undefined,
  activeDate: string,
  today: string,
  loggedMetricsCount: number,
  totalMetricsCount: number,
  eventsCount: number
): { title: string; subtitle: string } {
  const firstName = name?.trim() ? name.trim().split(' ')[0] : 'there';
  const isPast = activeDate < today;
  const isFuture = activeDate > today;

  if (isPast) {
    return {
      title: `Looking back, ${firstName}`,
      subtitle: `${eventsCount} ${eventsCount === 1 ? 'item' : 'items'} logged · ${formatDateHeader(activeDate)}`,
    };
  }

  if (isFuture) {
    return {
      title: `Planning ahead, ${firstName}`,
      subtitle: `${formatDateHeader(activeDate)}`,
    };
  }

  // Today logic:
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  let greeting = 'Welcome back';
  if (hour >= 5 && hour < 12) {
    const morningOptions = [
      `Good morning, ${firstName}`,
      `Rise and build, ${firstName}`,
      `Ready to focus, ${firstName}?`,
      `A fresh slate today, ${firstName}`,
    ];
    greeting = morningOptions[dayOfWeek % morningOptions.length];
  } else if (hour >= 12 && hour < 17) {
    const afternoonOptions = [
      `Good afternoon, ${firstName}`,
      `Midday momentum, ${firstName}`,
      `Staying locked in, ${firstName}`,
      `Making things happen, ${firstName}`,
    ];
    greeting = afternoonOptions[dayOfWeek % afternoonOptions.length];
  } else if (hour >= 17 && hour < 22) {
    const eveningOptions = [
      `Good evening, ${firstName}`,
      `Winding down, ${firstName}`,
      `Reflecting on today, ${firstName}`,
    ];
    greeting = eveningOptions[dayOfWeek % eveningOptions.length];
  } else {
    greeting = `Burning the midnight oil, ${firstName}`;
  }

  let subtitle = '';
  const occPrefix = occupation ? `${occupation} · ` : '';

  if (eventsCount > 0 && loggedMetricsCount > 0) {
    subtitle = `${occPrefix}${eventsCount} ${eventsCount === 1 ? 'accomplishment' : 'accomplishments'} & ${loggedMetricsCount}/${totalMetricsCount} habits tracked`;
  } else if (eventsCount > 0) {
    subtitle = `${occPrefix}${eventsCount} ${eventsCount === 1 ? 'accomplishment' : 'accomplishments'} logged today`;
  } else if (loggedMetricsCount > 0) {
    subtitle = `${occPrefix}${loggedMetricsCount} of ${totalMetricsCount} habits logged today`;
  } else {
    if (dayOfWeek === 1) {
      subtitle = `${occPrefix}Start of a new week · Set the pace`;
    } else if (dayOfWeek === 5) {
      subtitle = `${occPrefix}Friday finish · Close the week strong`;
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      subtitle = `${occPrefix}Weekend rhythm · Recharge and calibrate`;
    } else {
      subtitle = `${occPrefix}What's the main focus for today?`;
    }
  }

  return { title: greeting, subtitle };
}

function formatHoursMinutes(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export const TodayView: React.FC = () => {
  const {
    activeDate,
    metrics,
    todayEntries,
    todayEvents,
    profile,
    openQuickLog,
    logMetric,
    logEvent,
    deleteEvent,
    setActiveTab,
    settings,
    activitySummary,
    goals,
    database,
  } = useTracker();

  const today = getTodayIso();

  // Quick event / accomplishment input state
  const [quickEventTitle, setQuickEventTitle] = useState('');

  const handleQuickAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEventTitle.trim()) return;
    await logEvent(quickEventTitle.trim());
    setQuickEventTitle('');
  };

  // Show only metrics that are enabled (or default true)
  const visibleMetrics = metrics.filter((m) => m.enabled !== false);

  // Aggregate today's entries by metric
  const metricValuesToday = visibleMetrics.map((m) => {
    const entries = todayEntries.filter((e) => e.metricId === m.id);
    const sum = entries.reduce((acc, curr) => acc + curr.value, 0);
    // A metric with an active goal shows the goal's current-period number instead of its own target.
    const goal = getActiveGoal(m.id, goals, activeDate);
    const goalLevel = goal ? computeGoalCascade(goal, m, database?.entries || [], settings.currencySymbol, activeDate)[0] : undefined;
    // Standalone metrics: today is measured against the day's share of the target (e.g. 25h/week → ~3h 34m).
    const dayTarget = !goal && m.type !== 'boolean' && m.type !== 'rating' ? dailyShare(m) : undefined;
    return {
      metric: m,
      goal,
      goalLevel,
      dayTarget,
      total: sum,
      formatted: formatMetricValue(sum, m, settings.currencySymbol),
      hasLogged: entries.length > 0,
      entries,
    };
  });

  const loggedMetricsCount = metricValuesToday.filter((m) => m.hasLogged).length;
  const { title: dynamicTitle, subtitle: dynamicSubtitle } = getDynamicGreeting(
    profile?.name,
    profile?.occupation,
    activeDate,
    today,
    loggedMetricsCount,
    visibleMetrics.length,
    todayEvents.length
  );

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="view-title">{dynamicTitle}</h2>
            <p className="view-subtitle">{dynamicSubtitle}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <DateNavigator />

            {activitySummary && activitySummary.totalActiveSeconds > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '5px 12px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.15s ease',
                }}
                title="View detailed Screen Time & Activity Breakdown"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                    <Clock size={12} style={{ color: '#ffffff' }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {formatHoursMinutes(activitySummary.totalActiveSeconds)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {formatHoursMinutes(activitySummary.deepWorkSeconds)} Deep Work
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Standalone Quick Log Field */}
      <form onSubmit={handleQuickAddEvent} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: 1, padding: '12px 16px', fontSize: '0.94rem' }}
          placeholder="What did you do today?"
          value={quickEventTitle}
          onChange={(e) => setQuickEventTitle(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 20px', fontWeight: 600 }}
        >
          <span>Log</span>
          <span className="btn-enter-badge" title="Press Enter to log">
            <CornerDownLeft size={11} strokeWidth={2.5} />
          </span>
        </button>
      </form>

      {/* 1. METRICS */}
      <div className="card-panel">
        <div className="panel-header">
          <span className="panel-title">Metrics</span>
        </div>

        {visibleMetrics.length > 0 ? (
          <div className="metric-grid">
            {metricValuesToday.map(({ metric, formatted, hasLogged, total, goal, goalLevel, dayTarget }) => (
              <div key={metric.id} className="metric-card">
                <div>
                  <div className="metric-top">
                    <span className="metric-name">{metric.name}</span>
                    {hasLogged && (
                      <CheckCircle2 size={15} style={{ color: '#ffffff' }} />
                    )}
                  </div>

                  <div
                    className="metric-value-huge"
                    style={{ cursor: 'pointer' }}
                    onClick={() => openQuickLog(metric.id)}
                    title="Click to enter custom value"
                  >
                    {formatted}
                  </div>

                  {goal ? (
                    <div className="metric-target-sub" title={`From goal: ${goal.title}`}>
                      {goalLevel
                        ? `${goalLevel.label}: ${goalLevel.formattedCurrent} / ${goalLevel.formattedTarget}`
                        : `Goal: ${goal.title}`}
                    </div>
                  ) : metric.targetValue ? (
                    <div className="metric-target-sub">
                      {dayTarget !== undefined && `Today's share: ${formatMetricValue(metric.type === 'number' ? Math.round(dayTarget * 10) / 10 : Math.round(dayTarget), metric, settings.currencySymbol)} · `}
                      {metric.targetValue} {metric.unit || ''} / {metric.targetPeriod}
                    </div>
                  ) : null}
                </div>

                {goalLevel && (
                  <div className="progress-bar-track" style={{ margin: '8px 0' }}>
                    <div className="progress-bar-fill" style={{ width: `${goalLevel.progressPercent}%` }} />
                  </div>
                )}

                {dayTarget !== undefined && dayTarget > 0 && (
                  <div className="progress-bar-track" style={{ margin: '8px 0' }}>
                    <div className="progress-bar-fill" style={{ width: `${Math.min(Math.round((total / dayTarget) * 100), 100)}%` }} />
                  </div>
                )}

                {/* 1-CLICK INLINE STEPPER CHIPS */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {metric.type === 'duration' && (
                    <>
                      <button
                        className="chip-btn"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => logMetric(metric.id, 15)}
                        title="Add 15 minutes"
                      >
                        +15m
                      </button>
                      <button
                        className="chip-btn"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => logMetric(metric.id, 30)}
                        title="Add 30 minutes"
                      >
                        +30m
                      </button>
                      <button
                        className="chip-btn"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => logMetric(metric.id, 60)}
                        title="Add 1 hour"
                      >
                        +1h
                      </button>
                    </>
                  )}

                  {metric.type === 'currency' && (
                    <>
                      <button
                        className="chip-btn"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => logMetric(metric.id, 500)}
                      >
                        +500
                      </button>
                      <button
                        className="chip-btn"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => logMetric(metric.id, 1000)}
                      >
                        +1k
                      </button>
                    </>
                  )}

                  {metric.type === 'number' && (
                    <>
                      <button
                        className="chip-btn"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => logMetric(metric.id, 1)}
                      >
                        +1
                      </button>
                      <button
                        className="chip-btn"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => logMetric(metric.id, 3)}
                      >
                        +3
                      </button>
                    </>
                  )}

                  <button
                    className="chip-btn"
                    style={{ fontSize: '0.74rem', padding: '3px 8px', marginLeft: 'auto' }}
                    onClick={() => openQuickLog(metric.id)}
                    title="Custom log"
                  >
                    Custom
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.88rem', marginBottom: 12, color: 'var(--text-secondary)' }}>
              No active metrics enabled yet.
            </p>
            <button
              className="btn-primary"
              onClick={() => setActiveTab('metrics')}
              style={{ fontSize: '0.82rem', padding: '8px 16px' }}
            >
              + Configure / Add Metrics
            </button>
          </div>
        )}
      </div>

      {/* 2. HIGHLIGHTS */}
      <div className="card-panel">
        <div className="panel-header">
          <span className="panel-title">Highlights</span>
        </div>

        {todayEvents.length > 0 ? (
          <div className="highlight-list">
            {todayEvents.map((event) => (
              <div key={event.id} className="highlight-item">
                <div className="highlight-left">
                  <span className="highlight-bullet">+</span>
                  <div>
                    <div className="highlight-title">{event.title}</div>
                    {event.description && (
                      <div className="highlight-desc">{event.description}</div>
                    )}
                  </div>
                </div>

                <button
                  className="icon-btn"
                  onClick={() => deleteEvent(event.id)}
                  title="Remove"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 2px' }}>
            No highlights logged yet today.
          </p>
        )}
      </div>

      {/* 3. REMINDERS */}
      <RemindersSection />
    </div>
  );
};
