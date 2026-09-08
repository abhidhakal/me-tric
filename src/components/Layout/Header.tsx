import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatDateHeader, getTodayIso, shiftDate } from '../../utils/dateUtils';

export const Header: React.FC = () => {
  const { activeDate, setActiveDate, openQuickLog } = useTracker();
  const today = getTodayIso();
  const isToday = activeDate === today;

  return (
    <header className="top-header">
      <div className="header-left">
        <div className="date-navigator">
          <button
            className="icon-btn"
            onClick={() => setActiveDate(shiftDate(activeDate, -1))}
            title="Previous Day"
          >
            <ChevronLeft size={13} />
          </button>

          <span className="current-date-text">{formatDateHeader(activeDate)}</span>

          <button
            className="icon-btn"
            onClick={() => setActiveDate(shiftDate(activeDate, 1))}
            title="Next Day"
          >
            <ChevronRight size={13} />
          </button>

          {!isToday && (
            <button
              className="today-chip"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setActiveDate(today)}
              title="Jump to Today"
            >
              Today
            </button>
          )}

          <label
            style={{
              position: 'relative',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Pick a specific date"
          >
            <CalendarIcon size={12} style={{ color: 'var(--text-muted)', marginLeft: 2 }} />
            <input
              type="date"
              value={activeDate}
              onChange={(e) => e.target.value && setActiveDate(e.target.value)}
              style={{
                position: 'absolute',
                opacity: 0,
                width: 16,
                height: 16,
                cursor: 'pointer',
              }}
            />
          </label>
        </div>
      </div>

      <div className="header-right">
        <div className="hotkey-hint">
          <span>Quick Log</span>
          <span className="kbd-badge">L</span>
          <span>or</span>
          <span className="kbd-badge">⌘K</span>
        </div>

        <button className="btn-quick-log" onClick={() => openQuickLog()} id="btn-quick-log-main">
          <Plus size={13} strokeWidth={2.5} />
          <span>Log</span>
        </button>
      </div>
    </header>
  );
};
