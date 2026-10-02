import React from 'react';
import { Target, Sparkles, Clock, Trash2 } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatDuration } from '../../utils/formatters';

interface FocusHistoryListProps {
  date: string;
}

export const FocusHistoryList: React.FC<FocusHistoryListProps> = ({ date }) => {
  const { focusSessions, deleteFocusSession } = useTracker();

  const sessions = focusSessions.filter((s) => s.date === date);

  if (sessions.length === 0) {
    return null;
  }

  const totalFocusSecs = sessions.reduce((acc, s) => acc + s.actualDurationSeconds, 0);

  return (
    <div className="card-panel" style={{ marginBottom: 20 }}>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Target size={15} style={{ color: '#ffffff' }} />
          <span className="panel-title">Flow Sessions Today</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--fs-caption)' }}>
          <span style={{ color: 'var(--text-muted)' }}>{sessions.length} sessions</span>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{formatDuration(totalFocusSecs)}</span>
        </div>
      </div>

      <div className="focus-sessions-list">
        {sessions.map((s) => (
          <div key={s.id} className="focus-session-row">
            <div className="focus-session-left">
              <span className="focus-session-bullet" />
              <div className="focus-session-info">
                <span className="focus-session-title">{s.title || 'Flow'}</span>
                <div className="focus-session-tags">
                  <span className="focus-tag-mini">
                    <Clock size={10} />
                    <span>{formatDuration(s.actualDurationSeconds)}</span>
                  </span>
                  <span className="focus-tag-mini flow">
                    <Sparkles size={10} />
                    <span>{s.flowScore}% Flow</span>
                  </span>
                  <span className="focus-tag-mini switches">
                    <span>{s.contextSwitches} switches</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="list-action-btn"
              onClick={() => deleteFocusSession(s.id)}
              title="Delete flow session"
              aria-label={`Delete flow session ${s.title}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
