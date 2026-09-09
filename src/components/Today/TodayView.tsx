import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, CheckCircle2, Check, CornerDownLeft, Clock } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatDateHeader, getTodayIso } from '../../utils/dateUtils';
import { formatMetricValue } from '../../utils/formatters';
import { RemindersSection } from './RemindersSection';

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
    activePlans,
    togglePlan,
    deletePlan,
    settings,
    activitySummary,
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
    return {
      metric: m,
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
                padding: '6px 12px',
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

      {/* TODAY'S REMINDERS & PRIORITIES (FROM YESTERDAY'S PLAN) */}
      {activePlans.length > 0 && (
        <div className="card-panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <span className="panel-title">Today's Reminders</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {activePlans.filter((p) => p.completed).length} of {activePlans.length} done
            </span>
          </div>

          <div className="highlight-list">
            {activePlans.map((plan) => (
              <div
                key={plan.id}
                className="highlight-item"
                onClick={() => togglePlan(plan.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="highlight-left">
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1px solid ${plan.completed ? '#ffffff' : 'var(--border-medium)'}`,
                      background: plan.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000000',
                      flexShrink: 0,
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {plan.completed && <Check size={11} strokeWidth={3} />}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      className="highlight-title"
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: plan.completed ? 'var(--text-muted)' : '#ffffff',
                        textDecoration: plan.completed ? 'line-through' : 'none',
                      }}
                    >
                      {plan.title}
                    </span>
                    {plan.time && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 500,
                        }}
                      >
                        <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                        {plan.time}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  {!plan.completed && (
                    <button
                      type="button"
                      className="chip-btn"
                      style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#ffffff' }}
                      onClick={async () => {
                        await togglePlan(plan.id);
                        await logEvent(plan.title);
                      }}
                      title="Mark done and log to Today's Accomplishments"
                    >
                      Done & Log
                    </button>
                  )}
                  <button
                    className="icon-btn"
                    onClick={() => deletePlan(plan.id)}
                    title="Remove"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. METRICS */}
      <div className="card-panel">
        <div className="panel-header">
          <span className="panel-title">Metrics</span>
        </div>

        {visibleMetrics.length > 0 ? (
          <div className="metric-grid">
            {metricValuesToday.map(({ metric, formatted, hasLogged, total }) => (
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

                  {metric.targetValue && (
                    <div className="metric-target-sub">
                      Target: {metric.targetValue} {metric.unit || ''} / {metric.targetPeriod}
                    </div>
                  )}
                </div>

                {/* Visual progress bar if target is set */}
                {metric.targetValue && metric.type === 'duration' && (
                  <div className="progress-bar-track" style={{ margin: '8px 0' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(Math.round((total / (metric.targetValue * 60)) * 100), 100)}%`,
                      }}
                    />
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
