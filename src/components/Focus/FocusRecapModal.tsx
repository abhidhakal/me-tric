import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Sparkles, X, Layers, Clock, Zap, CornerDownLeft } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatDuration } from '../../utils/formatters';

export const FocusRecapModal: React.FC = () => {
  const { completedRecapSession, closeRecapModal, logEvent } = useTracker();
  const [hasLoggedEvent, setHasLoggedEvent] = useState(false);

  useEffect(() => {
    if (!completedRecapSession) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRecapModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completedRecapSession, closeRecapModal]);

  if (!completedRecapSession) return null;

  const durationMins = Math.floor(completedRecapSession.actualDurationSeconds / 60);
  const durationSecs = completedRecapSession.actualDurationSeconds % 60;
  const timeFormatted = durationMins > 0 ? `${durationMins}m ${durationSecs}s` : `${durationSecs}s`;

  const handleLogAccomplishment = async () => {
    if (hasLoggedEvent) return;
    const text = completedRecapSession.title || 'Flow Session';
    await logEvent(text, `Completed ${timeFormatted} in Flow with ${completedRecapSession.flowScore}% flow score.`);
    setHasLoggedEvent(true);
  };

  const switchesRating =
    completedRecapSession.contextSwitches <= 4
      ? 'Exceptional immersion (minimal multitasking)'
      : completedRecapSession.contextSwitches <= 10
      ? 'Good focus discipline'
      : 'Frequent multitasking detected';

  const modalContent = (
    <div className="modal-backdrop" onClick={closeRecapModal}>
      <div className="modal-card focus-recap-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="focus-recap-header">
          <div className="focus-recap-badge">
            <Sparkles size={16} />
            <span>Flow Complete</span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeRecapModal}
            aria-label="Close recap modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hero Title */}
        <div className="focus-recap-hero">
          <h2 className="focus-recap-title">{completedRecapSession.title || 'Flow'}</h2>
          <p className="focus-recap-subtitle">Here is how your cognitive attention broke down</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="focus-recap-metrics-grid">
          <div className="focus-recap-metric-box">
            <span className="recap-box-label">Duration</span>
            <span className="recap-box-value">{timeFormatted}</span>
            <span className="recap-box-sub">
              {completedRecapSession.targetMinutes > 0
                ? `${completedRecapSession.targetMinutes}m target`
                : 'Open Flow'}
            </span>
          </div>

          <div className="focus-recap-metric-box">
            <span className="recap-box-label">Flow Score</span>
            <span className="recap-box-value" style={{ color: '#ffffff' }}>
              {completedRecapSession.flowScore}%
            </span>
            <span className="recap-box-sub">Deep work ratio</span>
          </div>

          <div className="focus-recap-metric-box">
            <span className="recap-box-label">Context Switches</span>
            <span className="recap-box-value">{completedRecapSession.contextSwitches}</span>
            <span className="recap-box-sub">App changes</span>
          </div>
        </div>

        {/* Switching Assessment Banner */}
        <div className="focus-recap-assessment">
          <span className="assessment-dot" />
          <span className="assessment-text">{switchesRating}</span>
        </div>

        {/* Top Apps Used */}
        {completedRecapSession.appsUsed && completedRecapSession.appsUsed.length > 0 && (
          <div className="focus-recap-apps-section">
            <span className="focus-recap-section-title">Applications In Session</span>
            <div className="focus-recap-apps-list">
              {completedRecapSession.appsUsed.slice(0, 4).map((app) => (
                <div key={app.appName} className="focus-recap-app-row">
                  <span className="recap-app-name">{app.appName}</span>
                  <span className="recap-app-duration">{formatDuration(app.durationSeconds)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="focus-recap-actions">
          <button
            type="button"
            className={`btn-primary focus-recap-log-btn${hasLoggedEvent ? ' is-done' : ''}`}
            onClick={handleLogAccomplishment}
            disabled={hasLoggedEvent}
          >
            <Check size={14} />
            <span>{hasLoggedEvent ? 'Logged to Today!' : 'Log as Accomplishment'}</span>
          </button>

          <button
            type="button"
            className="chip-btn focus-recap-done-btn"
            onClick={closeRecapModal}
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
