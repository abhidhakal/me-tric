import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Clock, Calendar as CalendarIcon, Check, CornerDownLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { requestNotificationPermission } from '../../utils/notifications';
import { getTodayIso, shiftDate } from '../../utils/dateUtils';

export interface ReminderSchedule {
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm format, e.g. "14:30"
  label: string; // Friendly label, e.g. "Today, 3:30 PM" or "Tomorrow"
}

export function formatScheduleLabel(date: string, time?: string): string {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = shiftDate(todayStr, 1);

  let datePrefix = '';
  if (date === todayStr) {
    datePrefix = 'Today';
  } else if (date === tomorrowStr) {
    datePrefix = 'Tomorrow';
  } else {
    const d = new Date(`${date}T12:00:00`);
    datePrefix = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  if (!time) {
    return datePrefix;
  }

  // Format 24h HH:mm to 12h AM/PM
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minFormatted = String(m).padStart(2, '0');

  return `${datePrefix}, ${hour12}:${minFormatted} ${ampm}`;
}

interface ReminderPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  currentSchedule: ReminderSchedule;
  onSelectSchedule: (schedule: ReminderSchedule) => void;
  currentText?: string;
  onDirectSubmit?: (schedule: ReminderSchedule) => void;
}

export const ReminderPopover: React.FC<ReminderPopoverProps> = ({
  isOpen,
  onClose,
  anchorRef,
  currentSchedule,
  onSelectSchedule,
  currentText,
  onDirectSubmit,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');

  const [reminderDate, setReminderDate] = useState(currentSchedule.date);
  const [reminderTime, setReminderTime] = useState(currentSchedule.time || '');

  // Calendar month/year navigation state
  const initialDate = currentSchedule.date ? new Date(`${currentSchedule.date}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  const todayIso = getTodayIso();
  const tomorrowIso = shiftDate(todayIso, 1);

  // Sync state when currentSchedule changes or popover opens
  useEffect(() => {
    if (!isOpen) return;
    setReminderDate(currentSchedule.date);
    setReminderTime(currentSchedule.time || '');
    if (currentSchedule.date) {
      const d = new Date(`${currentSchedule.date}T12:00:00`);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [isOpen, currentSchedule]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const checkPosition = () => {
      const targetEl = anchorRef?.current || popoverRef.current?.parentElement;
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const popoverHeight = popoverRef.current?.offsetHeight || 370;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < popoverHeight + 20 && spaceAbove > spaceBelow) {
          setPlacement('top');
        } else {
          setPlacement('bottom');
        }
      }
    };
    checkPosition();
    window.addEventListener('resize', checkPosition);
    window.addEventListener('scroll', checkPosition, true);
    return () => {
      window.removeEventListener('resize', checkPosition);
      window.removeEventListener('scroll', checkPosition, true);
    };
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        (!anchorRef?.current || !anchorRef.current.contains(e.target as Node))
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const handleSelectDate = (dateIso: string) => {
    setReminderDate(dateIso);
    const d = new Date(`${dateIso}T12:00:00`);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    const newSchedule: ReminderSchedule = {
      date: dateIso,
      time: reminderTime || undefined,
      label: formatScheduleLabel(dateIso, reminderTime || undefined),
    };
    onSelectSchedule(newSchedule);
  };

  const handleTimeChange = (val: string) => {
    setReminderTime(val);
    const newSchedule: ReminderSchedule = {
      date: reminderDate,
      time: val || undefined,
      label: formatScheduleLabel(reminderDate, val || undefined),
    };
    onSelectSchedule(newSchedule);
  };

  const handleClearTime = () => {
    setReminderTime('');
    const newSchedule: ReminderSchedule = {
      date: reminderDate,
      time: undefined,
      label: formatScheduleLabel(reminderDate, undefined),
    };
    onSelectSchedule(newSchedule);
  };

  const handleSave = async () => {
    if (!reminderDate) return;
    if (reminderTime) {
      await requestNotificationPermission();
    }
    const schedule: ReminderSchedule = {
      date: reminderDate,
      time: reminderTime || undefined,
      label: formatScheduleLabel(reminderDate, reminderTime || undefined),
    };

    onSelectSchedule(schedule);

    if (currentText?.trim() && onDirectSubmit) {
      onDirectSubmit(schedule);
    }
    onClose();
  };

  // Calendar calculations
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon = 0, Sun = 6
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const hasText = Boolean(currentText?.trim());
  const activeLabel = formatScheduleLabel(reminderDate, reminderTime || undefined);

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: placement === 'bottom' ? 'calc(100% + 8px)' : 'auto',
        bottom: placement === 'top' ? 'calc(100% + 8px)' : 'auto',
        right: 0,
        width: 280,
        maxWidth: 'calc(100vw - 32px)',
        background: '#111115',
        border: '1px solid rgba(255, 255, 255, 0.13)',
        boxShadow: '0 24px 56px rgba(0, 0, 0, 0.94), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        animation: placement === 'top' ? 'popoverFadeInUp 0.12s cubic-bezier(0.16, 1, 0.3, 1)' : 'popoverFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Top Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarIcon size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em' }}>
            Schedule
          </span>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            color: '#ffffff',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 8px',
            borderRadius: 5,
            border: '1px solid var(--border-subtle)',
            maxWidth: 145,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={activeLabel}
        >
          {activeLabel}
        </span>
      </div>

      {/* ── Body: Quick Jump & Calendar ── */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Quick Date Pills: Today & Tomorrow */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button
            type="button"
            onClick={() => handleSelectDate(todayIso)}
            style={{
              padding: '5px 0',
              borderRadius: 6,
              border: reminderDate === todayIso ? '1px solid #ffffff' : '1px solid var(--border-subtle)',
              background: reminderDate === todayIso ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
              color: reminderDate === todayIso ? '#000000' : 'var(--text-secondary)',
              fontSize: '0.74rem',
              fontWeight: reminderDate === todayIso ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.1s ease',
            }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleSelectDate(tomorrowIso)}
            style={{
              padding: '5px 0',
              borderRadius: 6,
              border: reminderDate === tomorrowIso ? '1px solid #ffffff' : '1px solid var(--border-subtle)',
              background: reminderDate === tomorrowIso ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
              color: reminderDate === tomorrowIso ? '#000000' : 'var(--text-secondary)',
              fontSize: '0.74rem',
              fontWeight: reminderDate === tomorrowIso ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.1s ease',
            }}
          >
            Tomorrow
          </button>
        </div>

        {/* Month/Year Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
            {monthNames[viewMonth]} {viewYear}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                width: 22,
                height: 22,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.1s ease',
              }}
              title="Previous month"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                width: 22,
                height: 22,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.1s ease',
              }}
              title="Next month"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <span
              key={d}
              style={{
                fontSize: '0.66rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                padding: '2px 0',
              }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: 26 }} />
          ))}

          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayIso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = reminderDate === dayIso;
            const isToday = todayIso === dayIso;

            return (
              <button
                key={dayIso}
                type="button"
                onClick={() => handleSelectDate(dayIso)}
                style={{
                  height: 26,
                  borderRadius: 6,
                  border: isSelected
                    ? '1px solid #ffffff'
                    : isToday
                    ? '1px solid rgba(255, 255, 255, 0.35)'
                    : '1px solid transparent',
                  background: isSelected
                    ? '#ffffff'
                    : isToday
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
                  color: isSelected ? '#000000' : isToday ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'all 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = isToday ? 'rgba(255, 255, 255, 0.08)' : 'transparent';
                  }
                }}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '2px 0' }} />

        {/* ── Time of Alert (Directly Clickable Time Picker) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            onClick={() => {
              try {
                timeInputRef.current?.showPicker?.();
              } catch {
                timeInputRef.current?.focus();
              }
            }}
          >
            <Clock size={13} style={{ color: reminderTime ? '#ffffff' : 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.76rem', color: reminderTime ? '#ffffff' : 'var(--text-secondary)', fontWeight: 500 }}>
              {reminderTime ? 'Alert at' : 'Time'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* Interactive Time Picker: clicking opens the picker immediately */}
            <div
              onClick={() => {
                try {
                  timeInputRef.current?.showPicker?.();
                } catch {
                  timeInputRef.current?.focus();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: reminderTime ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: reminderTime ? '1px solid rgba(255, 255, 255, 0.28)' : '1px solid var(--border-subtle)',
                borderRadius: 6,
                padding: '2px 7px',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              title="Click to choose alert time"
            >
              <input
                ref={timeInputRef}
                type="time"
                value={reminderTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {}
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: reminderTime ? '#ffffff' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  colorScheme: 'dark',
                  padding: 0,
                  width: 82,
                }}
              />
            </div>

            {/* Clear time button (revert to All-day) */}
            {reminderTime && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearTime();
                }}
                title="Remove time alert (All-day)"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 5,
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Footer Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', marginRight: 8 }}>
          <Clock size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong style={{ color: '#ffffff', fontWeight: 600 }}>{activeLabel}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!reminderDate}
          style={{
            background: reminderDate ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: 6,
            padding: '5px 12px',
            color: reminderDate ? '#000000' : 'var(--text-muted)',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: reminderDate ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            transition: 'all 0.12s ease',
          }}
        >
          <span>{hasText ? 'Set Reminder' : 'Apply'}</span>
          {hasText ? (
            <CornerDownLeft size={11} strokeWidth={2.5} />
          ) : (
            <Check size={11} strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
};
