import React, { useState, useRef, useEffect } from 'react';
import { Bell, Trash2, Check, CornerDownLeft, X, Clock, Repeat, Calendar } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { formatDateHeader, shiftDate, getTodayIso } from '../../utils/dateUtils';
import { ReminderPopover, ReminderSchedule, formatScheduleLabel } from './ReminderPopover';
import { requestNotificationPermission } from '../../utils/notifications';

export const RemindersSection: React.FC = () => {
  const {
    activeDate,
    tomorrowPlans,
    allPlans,
    addPlan,
    togglePlan,
    deletePlan,
    settings,
    updateSettings,
  } = useTracker();

  const [newPlanText, setNewPlanText] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const tomorrowIso = shiftDate(activeDate, 1);
  const tomorrowFormatted = formatDateHeader(tomorrowIso);

  const [schedule, setSchedule] = useState<ReminderSchedule>({
    date: tomorrowIso,
    time: undefined,
    label: 'Tomorrow',
  });

  // Keep default schedule aligned when activeDate changes
  useEffect(() => {
    setSchedule({
      date: shiftDate(activeDate, 1),
      time: undefined,
      label: 'Tomorrow',
    });
  }, [activeDate]);

  const reminderEnabled = Boolean(settings.reminder?.enabled);
  const reminderTime = settings.reminder?.time || '21:00';

  // Other pending timed reminders (not on tomorrow)
  const otherUpcomingReminders = (allPlans || []).filter(
    (p) => !p.completed && p.datetime && p.date !== tomorrowIso
  ).sort((a, b) => {
    const timeA = a.datetime ? new Date(a.datetime).getTime() : 0;
    const timeB = b.datetime ? new Date(b.datetime).getTime() : 0;
    return timeA - timeB;
  });

  const handleAddPlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPlanText.trim()) return;

    await addPlan(newPlanText.trim(), schedule.date, schedule.time);
    setNewPlanText('');
    setSchedule({
      date: tomorrowIso,
      time: undefined,
      label: 'Tomorrow',
    });
    setIsPopoverOpen(false);
  };

  const handleDirectSubmitFromPopover = async (targetSchedule: ReminderSchedule) => {
    if (!newPlanText.trim()) return;
    await addPlan(newPlanText.trim(), targetSchedule.date, targetSchedule.time);
    setNewPlanText('');
    setSchedule({
      date: tomorrowIso,
      time: undefined,
      label: 'Tomorrow',
    });
    setIsPopoverOpen(false);
  };

  const handleResetSchedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSchedule({
      date: tomorrowIso,
      time: undefined,
      label: 'Tomorrow',
    });
  };

  const handleDailyToggle = async () => {
    const nextEnabled = !reminderEnabled;
    if (nextEnabled) {
      await requestNotificationPermission();
    }
    await updateSettings({
      reminder: {
        enabled: nextEnabled,
        time: reminderTime,
        lastNotifiedDate: settings.reminder?.lastNotifiedDate,
      },
    });
  };

  const handleDailyTimeChange = async (newTime: string) => {
    await updateSettings({
      reminder: {
        enabled: true,
        time: newTime,
        lastNotifiedDate: settings.reminder?.lastNotifiedDate,
      },
    });
  };

  const isCustomSchedule = Boolean(schedule.time || schedule.date !== tomorrowIso);

  return (
    <div className="card-panel" style={{ marginTop: 14 }}>
      {/* Header */}
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span className="panel-title">Reminders</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Plans for tomorrow · {tomorrowFormatted}
          </span>
        </div>
      </div>

      {/* Input Row with Integrated Schedule Button & Popover */}
      <form onSubmit={handleAddPlan} style={{ display: 'flex', gap: 10, marginBottom: tomorrowPlans.length > 0 || otherUpcomingReminders.length > 0 ? 12 : 0 }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            style={{
              width: '100%',
              padding: '10px 14px',
              paddingRight: isCustomSchedule ? '170px' : '116px',
              fontSize: '0.9rem',
            }}
            placeholder="Add a reminder or plan... (Press Enter)"
            value={newPlanText}
            onChange={(e) => setNewPlanText(e.target.value)}
          />

          {/* Embedded Schedule Selector Chip/Button */}
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsPopoverOpen((prev) => !prev)}
            style={{
              position: 'absolute',
              right: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              borderRadius: 6,
              border: isCustomSchedule ? '1px solid rgba(255, 255, 255, 0.28)' : '1px solid var(--border-subtle)',
              background: isCustomSchedule ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              color: isCustomSchedule ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.76rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              maxWidth: 155,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={isCustomSchedule ? `Scheduled: ${schedule.label} (Click to change)` : "Set date & time alert"}
          >
            <Clock size={12} style={{ color: isCustomSchedule ? '#ffffff' : 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {schedule.label}
            </span>
            {isCustomSchedule && (
              <span
                onClick={handleResetSchedule}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: 2,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                title="Reset to Tomorrow"
              >
                <X size={11} />
              </span>
            )}
          </button>

          {/* Date/Time Picker Popover */}
          <ReminderPopover
            isOpen={isPopoverOpen}
            onClose={() => setIsPopoverOpen(false)}
            anchorRef={buttonRef}
            currentSchedule={schedule}
            onSelectSchedule={(newSched) => setSchedule(newSched)}
            currentText={newPlanText}
            onDirectSubmit={handleDirectSubmitFromPopover}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 18px', fontWeight: 600, fontSize: '0.86rem' }}
        >
          <span>Add</span>
          <span className="btn-enter-badge" title="Press Enter to add reminder">
            <CornerDownLeft size={11} strokeWidth={2.5} />
          </span>
        </button>
      </form>

      {/* ── Other Scheduled Alerts (Upcoming/Different Dates) ── */}
      {otherUpcomingReminders.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} />
            <span>Scheduled Alerts</span>
          </div>
          <div className="highlight-list" style={{ gap: 4 }}>
            {otherUpcomingReminders.map((r) => (
              <div
                key={r.id}
                className="highlight-item"
                onClick={() => togglePlan(r.id)}
                style={{ cursor: 'pointer', padding: '6px 10px' }}
              >
                <div className="highlight-left" style={{ gap: 8 }}>
                  <div
                    style={{
                      width: 17,
                      height: 17,
                      borderRadius: 4,
                      border: `1px solid ${r.completed ? '#ffffff' : 'var(--border-medium)'}`,
                      background: r.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000000',
                      flexShrink: 0,
                    }}
                  >
                    {r.completed && <Check size={11} strokeWidth={3} />}
                  </div>

                  <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 500,
                        color: r.completed ? 'var(--text-muted)' : '#ffffff',
                        textDecoration: r.completed ? 'line-through' : 'none',
                      }}
                    >
                      {r.title}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                      {formatScheduleLabel(r.date, r.time)}
                    </span>
                  </div>
                </div>

                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePlan(r.id);
                  }}
                  title="Remove reminder"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tomorrow's Reminders List ── */}
      {tomorrowPlans.length > 0 ? (
        <div className="highlight-list">
          {tomorrowPlans.map((plan) => (
            <div
              key={plan.id}
              className="highlight-item"
              onClick={() => togglePlan(plan.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="highlight-left">
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `1px solid ${plan.completed ? '#ffffff' : 'var(--border-medium)'}`,
                    background: plan.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000000',
                    flexShrink: 0,
                    transition: 'all 0.12s ease',
                  }}
                >
                  {plan.completed && <Check size={11} strokeWidth={3} />}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                  <span
                    className="highlight-title"
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      color: plan.completed ? 'var(--text-muted)' : '#ffffff',
                      textDecoration: plan.completed ? 'line-through' : 'none',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {plan.title}
                  </span>

                  {plan.time && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 500,
                      }}
                    >
                      <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                      {formatScheduleLabel(plan.date, plan.time)}
                    </span>
                  )}
                </div>
              </div>

              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePlan(plan.id);
                }}
                title="Remove reminder"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : otherUpcomingReminders.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 2px 2px' }}>
          No reminders set yet. Type above and press Enter, or choose a time to get alerted.
        </p>
      ) : null}

      {/* ── Daily Recurring Toggle ── */}
      <div
        style={{
          marginTop: 14,
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <Repeat size={13} style={{ color: reminderEnabled ? '#ffffff' : 'var(--text-muted)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: reminderEnabled ? '#ffffff' : 'var(--text-secondary)' }}>
              Daily recurring alert
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {reminderEnabled
                ? `Repeats every day at ${reminderTime}`
                : "Get a daily notification for tomorrow's plans"}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Time picker (visible when enabled) */}
          {reminderEnabled && (
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => handleDailyTimeChange(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-medium)',
                borderRadius: 5,
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                padding: '3px 6px',
                width: 80,
              }}
            />
          )}

          {/* Toggle Switch */}
          <div
            onClick={handleDailyToggle}
            style={{
              width: 32,
              height: 18,
              borderRadius: 10,
              background: reminderEnabled ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            title={reminderEnabled ? 'Disable daily reminder' : 'Enable daily reminder'}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: reminderEnabled ? '#000000' : 'rgba(255, 255, 255, 0.4)',
                position: 'absolute',
                top: 2,
                left: reminderEnabled ? 16 : 2,
                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
