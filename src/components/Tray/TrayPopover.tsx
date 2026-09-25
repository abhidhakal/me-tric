import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Pause, Play, Power } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatLocalDateTime } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/formatters';
import { OVER_STYLE, STEPS, useTodayMetrics } from '../Today/useTodayMetrics';
import { formatWhen } from '../Today/RemindersSection';

// Menu bar popover: a compact Today. Log a highlight, bump metrics, tick off reminders.
export const TrayPopover: React.FC = () => {
  const { reminders, completeReminder, logMetric, logEvent, activityStatus, activitySummary, toggleActivityTracking, refreshData } =
    useTracker();
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
        <span className="tray-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        <button
          className="tray-pill"
          onClick={() => toggleActivityTracking()}
          title={tracking ? 'Pause screen time tracking' : 'Resume screen time tracking'}
        >
          <span className={`tray-dot${tracking ? ' is-on' : ''}`} />
          {tracking ? formatDuration(activeMinutes) : 'Paused'}
          {tracking ? <Pause size={10} /> : <Play size={10} />}
        </button>
      </header>

      <div className="tray-body">
        <form onSubmit={submitHighlight} style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 0 }}
            placeholder="What did you do?"
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 14px' }}>
            Log
          </button>
        </form>

        <section>
          <div className="tray-section-title">Metrics</div>
          {tiles.map(({ metric, value, target, percent, over, period }) => (
            <div key={metric.id} className="tray-metric">
              <div className="tray-metric-top">
                <span className="tray-metric-name">{metric.name}</span>
                <span className="tray-metric-value">
                  {value}
                  {target && <span className="metric-target"> / {target}</span>}
                </span>
              </div>
              {percent !== undefined && (
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${percent}%`, ...(over && OVER_STYLE) }} />
                </div>
              )}
              <div className="metric-foot">
                <div className="tile-steps">
                  {STEPS[metric.type]?.map(([amount, label]) => (
                    <button key={amount} className="tile-step" onClick={() => logMetric(metric.id, amount)}>
                      {label}
                    </button>
                  ))}
                </div>
                <span className="metric-period" style={over ? { color: 'var(--accent-danger)' } : undefined}>
                  {over ? 'over' : period}
                </span>
              </div>
            </div>
          ))}
        </section>

        {upcoming.length > 0 && (
          <section>
            <div className="tray-section-title">Reminders</div>
            {upcoming.map((r) => (
              <div key={r.id} className="tray-reminder">
                <button
                  className="reminder-check"
                  onClick={() => completeReminder(r.id)}
                  title="Mark done"
                  aria-label={`Mark ${r.title} done`}
                />
                <span className="tray-reminder-title">{r.title}</span>
                <span className="item-sub" style={{ marginTop: 0, color: r.datetime <= now ? '#f87171' : undefined }}>
                  {formatWhen(r.datetime)}
                </span>
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="tray-footer">
        <button className="tray-open" onClick={() => window.electronAPI?.quitApp?.()}>
          <Power size={13} /> Quit MeTric
        </button>
        <button className="tray-open" onClick={() => window.electronAPI?.openMainWindow?.()}>
          Open MeTric <ArrowUpRight size={13} />
        </button>
      </footer>
    </div>
  );
};
