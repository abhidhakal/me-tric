import React, { useState } from 'react';
import { Trash2, CornerDownLeft, Clock } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { getTodayIso } from '../../utils/dateUtils';
import { OVER_STYLE, STEPS, useTodayMetrics } from './useTodayMetrics';
import { RemindersSection } from './RemindersSection';
import { DateNavigator } from '../Common/DateNavigator';
import { FocusWidget } from '../Focus/FocusWidget';

function getDynamicGreeting(name: string | undefined, activeDate: string, today: string): string {
  const firstName = name?.trim() ? name.trim().split(' ')[0] : 'there';
  const isPast = activeDate < today;
  const isFuture = activeDate > today;

  if (isPast) return `Looking back, ${firstName}`;
  if (isFuture) return `Planning ahead, ${firstName}`;

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

  return greeting;
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
    todayEvents,
    profile,
    openQuickLog,
    logMetric,
    logEvent,
    deleteEvent,
    setActiveTab,
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

  const metricValuesToday = useTodayMetrics();

  const dynamicTitle = getDynamicGreeting(profile?.name, activeDate, today);

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="view-title">{dynamicTitle}</h2>
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
                  gap: 6,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '5px 12px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.15s ease',
                }}
                title={`Activity today · ${formatHoursMinutes(activitySummary.deepWorkSeconds)} deep work`}
              >
                <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: '#ffffff' }}>
                  {formatHoursMinutes(activitySummary.totalActiveSeconds)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Focus Mode Sprint Control */}
      {activeDate === today && (
        <div style={{ marginBottom: 20 }}>
          <FocusWidget />
        </div>
      )}

      {/* Standalone Quick Log Field */}
      <form onSubmit={handleQuickAddEvent} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: 1, padding: '12px 16px', fontSize: 'var(--fs-item)' }}
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
      <div className="section-block">
        <div className="panel-header">
          <span className="panel-title">Metrics</span>
        </div>

        {visibleMetrics.length > 0 ? (
          <div className="metric-grid">
            {metricValuesToday.map(({ metric, value, target, percent, over, period }) => (
              <div key={metric.id} className="metric-card">
                <span className="metric-name">{metric.name}</span>

                <div className="metric-figure" onClick={() => openQuickLog(metric.id)} title="Log a custom amount">
                  <span className="metric-value-huge">{value}</span>
                  {target && <span className="metric-target">/ {target}</span>}
                </div>

                {percent !== undefined && (
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${percent}%`, ...(over && OVER_STYLE) }} />
                  </div>
                )}

                <div className="metric-foot">
                  {STEPS[metric.type] ? (
                    <div className="tile-steps">
                      {STEPS[metric.type]!.map(([amount, label]) => (
                        <button key={amount} className="tile-step" onClick={() => logMetric(metric.id, amount)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span />
                  )}
                  <span className="metric-period" style={over ? { color: 'var(--accent-danger)' } : undefined}>
                    {over ? 'over' : period}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button className="btn-secondary" onClick={() => setActiveTab('plan')}>
            Add a metric
          </button>
        )}
      </div>

      {/* 2. HIGHLIGHTS */}
      <div className="section-block">
        <div className="panel-header">
          <span className="panel-title">Highlights</span>
        </div>

        {todayEvents.length > 0 ? (
          <div className="list-card">
            {todayEvents.map((event) => (
              <div key={event.id} className="list-row">
                <div style={{ minWidth: 0 }}>
                  <div className="highlight-title">{event.title}</div>
                  {event.description && <div className="highlight-desc">{event.description}</div>}
                </div>
                <div className="item-actions">
                  <button className="icon-btn" onClick={() => deleteEvent(event.id)} title="Remove" style={{ color: 'var(--text-muted)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-note">Nothing logged yet.</p>
        )}
      </div>

      {/* 3. REMINDERS */}
      <RemindersSection />
    </div>
  );
};
