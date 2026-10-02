import React, { useState } from 'react';
import { Play, Pause, Square, Sparkles, X } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatDuration } from '../../utils/formatters';

const DURATION_PRESETS = [
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
  { label: 'Open', minutes: 0 },
];

export const FocusWidget: React.FC = () => {
  const {
    activeFocusSession,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    stopFocusSession,
  } = useTracker();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(45);
  const [intention, setIntention] = useState<string>('');

  const handleStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startFocusSession({
      title: intention.trim() || undefined,
      targetMinutes: selectedMinutes,
    });
    setIntention('');
  };

  if (!activeFocusSession) {
    // Idle state: Configure and start flow
    return (
      <div className="focus-widget-card">
        <div className="focus-widget-header">
          <div className="focus-widget-title-group">
            <div>
              <h3 className="focus-title">Flow</h3>
              <p className="focus-subtitle">Lock in, reach deep cognitive flow, and eliminate context switches</p>
            </div>
          </div>

          {/* Duration Chips */}
          <div className="focus-duration-chips">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`focus-chip${selectedMinutes === preset.minutes ? ' is-selected' : ''}`}
                onClick={() => setSelectedMinutes(preset.minutes)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleStart} className="focus-input-row">
          <input
            type="text"
            className="form-input focus-input"
            placeholder="What are you locking in on? (e.g. Core API Refactor)"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
          />

          <button type="submit" className="btn-primary focus-start-btn">
            <Play size={13} fill="currentColor" />
            <span>Enter Flow</span>
          </button>
        </form>
      </div>
    );
  }

  // Active state: Live Countdown & Stats
  const targetSeconds = activeFocusSession.targetMinutes * 60;
  const elapsed = activeFocusSession.elapsedSeconds;
  const isCountdown = targetSeconds > 0;
  const remaining = Math.max(0, targetSeconds - elapsed);

  const displayTime = isCountdown ? remaining : elapsed;
  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progressPercent = isCountdown
    ? Math.min(100, Math.round((elapsed / targetSeconds) * 100))
    : 100;

  const flowScore = Math.min(
    100,
    Math.round((activeFocusSession.deepWorkSeconds / Math.max(1, elapsed)) * 100)
  );

  return (
    <div className={`focus-widget-card is-active${activeFocusSession.isPaused ? ' is-paused' : ''}`}>
      <div className="focus-active-layout">
        <div className="focus-active-left">
          <div className="focus-active-status">
            <span className={`focus-live-dot${activeFocusSession.isPaused ? ' is-paused' : ''}`} />
            <span className="focus-session-name">
              {activeFocusSession.title || 'Flow'}
            </span>
            {activeFocusSession.targetMinutes > 0 && (
              <span className="focus-target-pill">{activeFocusSession.targetMinutes}m target</span>
            )}
          </div>

          <div className="focus-clock-row">
            <span className="focus-clock">{formattedTime}</span>
            <div className="focus-meta-tags">
              <span className="focus-tag flow-tag" title="Ratio of time spent in development, design, and writing apps">
                <Sparkles size={11} />
                <span>{flowScore}% Flow</span>
              </span>
              <span className="focus-tag switches-tag" title="Total window switches detected during this flow session">
                <span>{activeFocusSession.contextSwitches} switches</span>
              </span>
              {activeFocusSession.lastApp && (
                <span className="focus-tag app-tag">
                  <span>In: {activeFocusSession.lastApp}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="focus-active-actions">
          {activeFocusSession.isPaused ? (
            <button
              type="button"
              className="chip-btn focus-action-btn"
              onClick={resumeFocusSession}
              title="Resume flow session"
            >
              <Play size={13} fill="currentColor" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              type="button"
              className="chip-btn focus-action-btn"
              onClick={pauseFocusSession}
              title="Pause flow session"
            >
              <Pause size={13} />
              <span>Pause</span>
            </button>
          )}

          <button
            type="button"
            className="btn-primary focus-finish-btn"
            onClick={() => stopFocusSession(false)}
            title="Finish flow and view recap"
          >
            <Square size={12} fill="currentColor" />
            <span>Finish & Save</span>
          </button>

          <button
            type="button"
            className="chip-btn focus-action-btn focus-cancel-btn"
            onClick={() => {
              if (activeFocusSession.elapsedSeconds < 60 || window.confirm('Discard this flow session without saving?')) {
                stopFocusSession(true);
              }
            }}
            title="Discard flow session"
            aria-label="Discard flow session"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {isCountdown && (
        <div className="focus-progress-track">
          <div
            className="focus-progress-bar"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};
