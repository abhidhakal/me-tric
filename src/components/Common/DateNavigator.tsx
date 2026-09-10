import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { getTodayIso, shiftDate } from '../../utils/dateUtils';

interface DateNavigatorProps {
  className?: string;
  style?: React.CSSProperties;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({ className, style }) => {
  const { activeDate, setActiveDate } = useTracker();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = getTodayIso();
  const isViewingToday = activeDate === today;

  // State for calendar month navigation
  const activeDateObj = new Date(`${activeDate}T12:00:00`);
  const [viewYear, setViewYear] = useState<number>(activeDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(activeDateObj.getMonth());

  // Keep view in sync when activeDate changes
  useEffect(() => {
    const d = new Date(`${activeDate}T12:00:00`);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [activeDate]);

  // Dismiss calendar on click outside
  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  // Label formatting
  const formattedLabel = (() => {
    if (activeDate === today) {
      const d = new Date(`${today}T12:00:00`);
      return `Today, ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    const yesterday = shiftDate(today, -1);
    if (activeDate === yesterday) {
      const d = new Date(`${yesterday}T12:00:00`);
      return `Yesterday, ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    const tomorrow = shiftDate(today, 1);
    if (activeDate === tomorrow) {
      const d = new Date(`${tomorrow}T12:00:00`);
      return `Tomorrow, ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    const d = new Date(`${activeDate}T12:00:00`);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  })();

  const handlePrevDay = () => {
    setActiveDate(shiftDate(activeDate, -1));
  };

  const handleNextDay = () => {
    setActiveDate(shiftDate(activeDate, 1));
  };

  const handleToday = () => {
    setActiveDate(today);
  };

  // Calendar calculations
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate 42 grid cells
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    calendarDays.push({ dayNum, dateStr, isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ dayNum: i, dateStr, isCurrentMonth: true });
  }
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({ dayNum: i, dateStr, isCurrentMonth: false });
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...style,
      }}
    >
      {/* Date Navigation Stepper Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '2px 4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        {/* Previous Day */}
        <button
          type="button"
          onClick={handlePrevDay}
          title="Previous day (Yesterday)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            width: 26,
            height: 26,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <ChevronLeft size={15} />
        </button>

        {/* Date Display & Picker Trigger */}
        <button
          type="button"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          title="Choose specific date"
          style={{
            background: isCalendarOpen ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: 'none',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            cursor: 'pointer',
            transition: 'all 0.12s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (!isCalendarOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
          onMouseLeave={(e) => {
            if (!isCalendarOpen) e.currentTarget.style.background = 'transparent';
          }}
        >
          <CalendarIcon size={13} style={{ color: 'var(--text-muted)' }} />
          <span>{formattedLabel}</span>
        </button>

        {/* Next Day */}
        <button
          type="button"
          onClick={handleNextDay}
          title="Next day (Tomorrow)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            width: 26,
            height: 26,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Quick Jump to Today (if viewing other date) */}
      {!isViewingToday && (
        <button
          type="button"
          onClick={handleToday}
          style={{
            height: 32,
            padding: '0 10px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 'var(--radius-md)',
            color: '#ffffff',
            fontSize: '0.76rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            transition: 'all 0.12s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
          }}
          title="Return to Today"
        >
          <RotateCcw size={11} />
          <span>Today</span>
        </button>
      )}

      {/* Mini Calendar Dropdown Popover */}
      {isCalendarOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 999,
            width: 250,
            background: '#0d0d10',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '14px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            padding: 12,
            userSelect: 'none',
            animation: 'popoverFadeInUp 0.12s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Calendar Header: Month + Year Stepper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              padding: '0 2px',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
              {monthName}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  width: 24,
                  height: 24,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  width: 24,
                  height: 24,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              marginBottom: 4,
              textAlign: 'center',
            }}
          >
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span
                key={d}
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  padding: '2px 0',
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
            }}
          >
            {calendarDays.map((cDay) => {
              const isSelected = cDay.dateStr === activeDate;
              const isDayToday = cDay.dateStr === today;

              return (
                <button
                  key={cDay.dateStr}
                  type="button"
                  onClick={() => {
                    setActiveDate(cDay.dateStr);
                    setIsCalendarOpen(false);
                  }}
                  style={{
                    height: 28,
                    width: '100%',
                    background: isSelected ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: isSelected
                      ? '#000000'
                      : cDay.isCurrentMonth
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.25)',
                    fontSize: '0.76rem',
                    fontWeight: isSelected ? 700 : isDayToday ? 600 : 400,
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{cDay.dayNum}</span>
                  {isDayToday && !isSelected && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: '#22c55e',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
