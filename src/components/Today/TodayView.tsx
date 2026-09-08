import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, CheckCircle2, Check, CornerDownLeft } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatDateHeader } from '../../utils/dateUtils';
import { formatMetricValue } from '../../utils/formatters';

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
    settings
  } = useTracker();

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

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

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h2 className="view-title">
              {profile?.name ? `${getGreeting()}, ${profile.name.split(' ')[0]}` : formatDateHeader(activeDate)}
            </h2>
            <p className="view-subtitle">
              {profile?.occupation ? `${profile.occupation} · ` : ''}{formatDateHeader(activeDate)}
            </p>
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
    </div>
  );
};
