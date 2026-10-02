import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Pause, Play, Power } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatLocalDateTime } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { OVER_STYLE, STEPS, useTodayMetrics } from '../Today/useTodayMetrics';
import { formatWhen } from '../Today/RemindersSection';

// Menu bar popover: a compact Today in the exact same theme and style as the main app.
export const TrayPopover: React.FC = () => {
  const {
    reminders,
    completeReminder,
    logMetric,
    logEvent,
    activityStatus,
    activitySummary,
    toggleActivityTracking,
    refreshData,
    activeFocusSession,
    startFocusSession,
    stopFocusSession,
  } = useTracker();
  const tiles = useTodayMetrics();
  const [highlight, setHighlight] = useState('');

  // The popover window stays alive between opens, so refresh whenever it's shown; Escape hides it.
  useEffect(() => {
    const api = window.electronAPI;
    const cleanup = api?.onTrayShown?.(() => refreshData());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && api?.hideTrayPopover?.();
    window.addEventListener('focus', refreshData);
    window.addEventListener('keydown', onKey);
    return () => {
      cleanup?.();
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('keydown', onKey);
    };
  }, [refreshData]);

  const submitHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlight.trim()) return;
    await logEvent(highlight.trim());
    setHighlight('');
  };

  const now = formatLocalDateTime(new Date());
  const upcoming = reminders
    .filter((r) => !r.completed)
    .sort((a, b) => a.datetime.localeCompare(b.datetime))
    .slice(0, 4);
  const tracking = activityStatus?.isTracking;
  const activeMinutes = Math.floor((activitySummary?.totalActiveSeconds || 0) / 60);

  return (
    <div className="tray">
      <header className="tray-header">
        <span className="tray-date">
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <button
          className="tray-pill"
          tabIndex={-1}
          onClick={() => toggleActivityTracking()}
          title={tracking ? 'Pause screen time tracking' : 'Resume screen time tracking'}
        >
          <span className={`tray-dot${tracking ? ' is-on' : ''}`} />
          <span>{tracking ? formatDuration(activeMinutes) : 'Paused'}</span>
          {tracking ? <Pause size={10} /> : <Play size={10} />}
        </button>
      </header>

      <div className="tray-body">
        {/* Active Flow Session Banner */}
        {activeFocusSession ? (
          <div className="tray-focus-card">
            <div className="tray-focus-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span className="tray-focus-dot" />
                <span className="tray-focus-title">{activeFocusSession.title || 'Flow'}</span>
              </div>
              <button
                type="button"
                className="tray-focus-stop"
                onClick={() => stopFocusSession(false)}
                title="Finish flow session"
              >
                Finish
              </button>
            </div>
            <div className="tray-focus-bottom">
              <span className="tray-focus-time">
                {activeFocusSession.targetMinutes > 0
                  ? `${Math.max(0, Math.floor((activeFocusSession.targetMinutes * 60 - activeFocusSession.elapsedSeconds) / 60))}m remaining`
                  : `${Math.floor(activeFocusSession.elapsedSeconds / 60)}m in Flow`}
              </span>
              <span className="tray-focus-flow">
                {Math.min(100, Math.round((activeFocusSession.deepWorkSeconds / Math.max(1, activeFocusSession.elapsedSeconds)) * 100))}% Flow
              </span>
            </div>
          </div>
        ) : (
          <div className="tray-focus-quick">
            <span className="tray-focus-quick-label">Flow</span>
            <div className="tray-focus-quick-chips">
              <button
                type="button"
                className="tray-step-chip"
                onClick={() => startFocusSession({ targetMinutes: 25 })}
                title="Start 25m flow session"
              >
                +25m
              </button>
              <button
                type="button"
                className="tray-step-chip"
                onClick={() => startFocusSession({ targetMinutes: 45 })}
                title="Start 45m flow session"
              >
                +45m
              </button>
              <button
                type="button"
                className="tray-step-chip"
                onClick={() => startFocusSession({ targetMinutes: 0 })}
                title="Start open flow session"
              >
                Open
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submitHighlight} style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 0, padding: '7px 11px', fontSize: 'var(--fs-body)' }}
            placeholder="What did you accomplish?"
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '0 14px', fontSize: 'var(--fs-caption)', whiteSpace: 'nowrap' }}
            disabled={!highlight.trim()}
          >
            Log
          </button>
        </form>

        <section>
          <div className="tray-section-header">
            <span className="tray-section-title">Today's Metrics</span>
            <span className="tray-section-count">{tiles.length} active</span>
          </div>
          <div className="tray-metric-list">
            {tiles.map(({ metric, value, target, percent, over, period }) => (
              <div key={metric.id} className="tray-metric-card">
                <div className="tray-metric-header">
                  <span className="tray-metric-name">{metric.name}</span>
                  <div className="tray-metric-figure">
                    <span className="tray-metric-value">{value}</span>
                    {target && <span className="tray-metric-target">/ {target}</span>}
                  </div>
                </div>

                {percent !== undefined && (
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(percent, 100)}%`,
                        ...(over && OVER_STYLE),
                      }}
                    />
                  </div>
                )}

                <div className="tray-metric-foot">
                  <div className="tile-steps">
                    {STEPS[metric.type]?.map(([amount, label]) => (
                      <button
                        key={amount}
                        type="button"
                        className="tile-step"
                        onClick={() => logMetric(metric.id, amount)}
                        title={`Add ${label}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className={`tray-metric-period${over ? ' is-over' : ''}`}>
                    {over ? 'over' : period}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {upcoming.length > 0 && (
          <section>
            <div className="tray-section-header">
              <span className="tray-section-title">Reminders</span>
              <span className="tray-section-count">{upcoming.length}</span>
            </div>
            <div className="tray-reminder-list">
              {upcoming.map((r) => (
                <div key={r.id} className="tray-reminder-card">
                  <button
                    className="reminder-check"
                    onClick={() => completeReminder(r.id)}
                    title="Mark done"
                    aria-label={`Mark ${r.title} done`}
                  />
                  <span className="tray-reminder-title">{r.title}</span>
                  <span
                    className="item-sub"
                    style={{ marginTop: 0, color: r.datetime <= now ? 'var(--accent-danger)' : undefined }}
                  >
                    {formatWhen(r.datetime)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="tray-footer">
        <button
          type="button"
          className="tray-footer-btn tray-quit-btn"
          onClick={() => window.electronAPI?.quitApp?.()}
        >
          <Power size={13} />
          <span>Quit</span>
        </button>
        <button
          type="button"
          className="tray-footer-btn tray-main-btn"
          onClick={() => window.electronAPI?.openMainWindow?.()}
        >
          <span>Open MeTric</span>
          <ArrowUpRight size={13} />
        </button>
      </footer>
    </div>
  );
};
