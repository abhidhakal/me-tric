import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Clock, Calendar as CalendarIcon, Check, CornerDownLeft, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');

  const [reminderDate, setReminderDate] = useState(currentSchedule.date);
  const [reminderTime, setReminderTime] = useState(currentSchedule.time || '');

  // Calendar month/year navigation state
  const initialDate = currentSchedule.date ? new Date(`${currentSchedule.date}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  const todayIso = getTodayIso();

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
        const popoverHeight = popoverRef.current?.offsetHeight || 320;
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

  // Presets definition
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = shiftDate(todayStr, 1);

  const presets = [
    {
      label: 'In 30m',
      getSchedule: () => {
        const d = new Date(Date.now() + 30 * 60000);
        return {
          date: d.toISOString().slice(0, 10),
          time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        };
      },
    },
    {
      label: 'In 1h',
      getSchedule: () => {
        const d = new Date(Date.now() + 60 * 60000);
        return {
          date: d.toISOString().slice(0, 10),
          time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        };
      },
    },
    {
      label: 'Today 5PM',
      getSchedule: () => ({
        date: todayStr,
        time: '17:00',
      }),
    },
    {
      label: 'Tomorrow 9AM',
      getSchedule: () => ({
        date: tomorrowStr,
        time: '09:00',
      }),
    },
  ];

  const handleApplyPreset = (date: string, time?: string) => {
    setReminderDate(date);
    setReminderTime(time || '');
    const d = new Date(`${date}T12:00:00`);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    const newSchedule: ReminderSchedule = {
      date,
      time,
      label: formatScheduleLabel(date, time),
    };
    onSelectSchedule(newSchedule);
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

  const handleSelectDate = (dateIso: string) => {
    setReminderDate(dateIso);
    const newSchedule: ReminderSchedule = {
      date: dateIso,
      time: reminderTime || undefined,
      label: formatScheduleLabel(dateIso, reminderTime || undefined),
    };
    onSelectSchedule(newSchedule);
  };

  // Time calculations
  const parseTimeComponents = (timeStr?: string) => {
    if (!timeStr) {
      return { hour12: 9, minutes: 0, period: 'AM' as const, hasTime: false };
    }
    const [hStr, mStr] = timeStr.split(':');
    const h24 = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h24 >= 12 ? ('PM' as const) : ('AM' as const);
    const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { hour12, minutes: m, period, hasTime: true };
  };

  const timeState = parseTimeComponents(reminderTime);

  const emitTime = (hour12: number, minutes: number, period: 'AM' | 'PM') => {
    let h24 = hour12;
    if (period === 'PM') {
      h24 = hour12 === 12 ? 12 : hour12 + 12;
    } else {
      h24 = hour12 === 12 ? 0 : hour12;
    }
    const timeStr = `${String(h24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    setReminderTime(timeStr);
    const newSchedule: ReminderSchedule = {
      date: reminderDate,
      time: timeStr,
      label: formatScheduleLabel(reminderDate, timeStr),
    };
    onSelectSchedule(newSchedule);
  };

  const handleHourStep = (delta: number) => {
    let next = timeState.hour12 + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    emitTime(next, timeState.minutes, timeState.period);
  };

  const handleMinuteStep = (delta: number) => {
    let next = timeState.minutes + delta;
    if (next >= 60) next = 0;
    if (next < 0) next = 55;
    emitTime(timeState.hour12, next, timeState.period);
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
        width: 440,
        maxWidth: 'calc(100vw - 32px)',
        background: '#121216',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 24px 50px rgba(0, 0, 0, 0.92), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        animation: placement === 'top' ? 'popoverFadeInUp 0.12s cubic-bezier(0.16, 1, 0.3, 1)' : 'popoverFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <CalendarIcon size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em' }}>
            Schedule Reminder
          </span>
        </div>
        <span
          style={{
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid var(--border-subtle)',
          }}
        >
          {activeLabel}
        </span>
      </div>

      {/* ── Two-Column Main Content ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '230px 1fr',
          padding: '14px',
          gap: 16,
        }}
      >
        {/* ── Left Column: Calendar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Month/Year Nav Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
              {monthNames[viewMonth]} {viewYear}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
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
                  fontSize: '0.65rem',
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
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
                    height: 25,
                    borderRadius: 5,
                    border: isSelected
                      ? '1px solid #ffffff'
                      : isToday
                      ? '1px solid rgba(255, 255, 255, 0.28)'
                      : '1px solid transparent',
                    background: isSelected
                      ? '#ffffff'
                      : isToday
                      ? 'rgba(255, 255, 255, 0.07)'
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
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right Column: Presets & Time ── */}
        <div
          style={{
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            paddingLeft: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Quick Presets Section */}
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
              Quick Presets
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              {presets.map((preset) => {
                const sched = preset.getSchedule();
                const isActive = reminderDate === sched.date && reminderTime === sched.time;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(sched.date, sched.time)}
                    style={{
                      background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isActive ? '#ffffff' : 'var(--border-subtle)'}`,
                      borderRadius: 5,
                      padding: '4px 6px',
                      color: isActive ? '#000000' : 'var(--text-secondary)',
                      fontSize: '0.68rem',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.1s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time of Alert Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Time of Alert
                </span>
              </div>
              {timeState.hasTime ? (
                <button
                  type="button"
                  onClick={handleClearTime}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.66rem',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                  title="Make this an all-day reminder"
                >
                  All day
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => emitTime(9, 0, 'AM')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.66rem',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  + Add time
                </button>
              )}
            </div>

            {timeState.hasTime ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Steppers Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '4px 6px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Hours */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => handleHourStep(-1)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 3,
                        width: 18,
                        height: 18,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        padding: 0,
                      }}
                    >
                      -
                    </button>
                    <span style={{ width: 22, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                      {String(timeState.hour12).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleHourStep(1)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 3,
                        width: 18,
                        height: 18,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        padding: 0,
                      }}
                    >
                      +
                    </button>
                  </div>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>:</span>

                  {/* Minutes */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => handleMinuteStep(-5)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 3,
                        width: 18,
                        height: 18,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        padding: 0,
                      }}
                    >
                      -
                    </button>
                    <span style={{ width: 22, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                      {String(timeState.minutes).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMinuteStep(5)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 3,
                        width: 18,
                        height: 18,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        padding: 0,
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* AM/PM toggle */}
                  <div
                    style={{
                      display: 'flex',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 4,
                      padding: 1,
                      marginLeft: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => emitTime(timeState.hour12, timeState.minutes, 'AM')}
                      style={{
                        background: timeState.period === 'AM' ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: 3,
                        padding: '2px 5px',
                        color: timeState.period === 'AM' ? '#000000' : 'var(--text-muted)',
                        fontSize: '0.64rem',
                        fontWeight: timeState.period === 'AM' ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => emitTime(timeState.hour12, timeState.minutes, 'PM')}
                      style={{
                        background: timeState.period === 'PM' ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: 3,
                        padding: '2px 5px',
                        color: timeState.period === 'PM' ? '#000000' : 'var(--text-muted)',
                        fontSize: '0.64rem',
                        fontWeight: timeState.period === 'PM' ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* Quick Time Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                  {[
                    { label: '9AM', h: 9, m: 0, p: 'AM' as const },
                    { label: '1PM', h: 1, m: 0, p: 'PM' as const },
                    { label: '5PM', h: 5, m: 0, p: 'PM' as const },
                    { label: '8PM', h: 8, m: 0, p: 'PM' as const },
                  ].map((slot) => {
                    const isActive =
                      timeState.hour12 === slot.h &&
                      timeState.minutes === slot.m &&
                      timeState.period === slot.p;
                    return (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => emitTime(slot.h, slot.m, slot.p)}
                        style={{
                          background: isActive ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--border-subtle)'}`,
                          borderRadius: 4,
                          padding: '2px 0',
                          color: isActive ? '#ffffff' : 'var(--text-muted)',
                          fontSize: '0.64rem',
                          fontWeight: isActive ? 600 : 400,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '7px 8px',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-subtle)',
                  textAlign: 'center',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                }}
              >
                All-day (No timed alert)
              </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Schedule:{' '}
            <strong style={{ color: '#ffffff', fontWeight: 600 }}>
              {activeLabel}
            </strong>
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
            padding: '5px 14px',
            color: reminderDate ? '#000000' : 'var(--text-muted)',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: reminderDate ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.12s ease',
          }}
        >
          <span>{hasText ? 'Set Reminder' : 'Apply Schedule'}</span>
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
