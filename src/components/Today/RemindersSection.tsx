import React, { useState } from 'react';
import { Bell, BellOff, Trash2, Check, Plus } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { Reminder, ReminderRepeat } from '../../types';
import { formatLocalDateTime, formatShortDate, getTodayIso, shiftDate } from '../../utils/dateUtils';
import { requestNotificationPermission } from '../../utils/notifications';

const REPEAT_LABELS: Record<ReminderRepeat, string> = {
  none: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function defaultDateTime(): { date: string; time: string } {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const [date, time] = formatLocalDateTime(d).split('T');
  return { date, time };
}

export function formatWhen(datetime: string): string {
  const [date, time] = datetime.split('T');
  const today = getTodayIso();
  const day = date === today ? 'Today' : date === shiftDate(today, 1) ? 'Tomorrow' : formatShortDate(date);
  return `${day} · ${time}`;
}

export const RemindersSection: React.FC = () => {
  const { reminders, addReminder, editReminder, completeReminder, toggleReminderNotify, deleteReminder } = useTracker();

  const [title, setTitle] = useState('');
  const [{ date, time }, setWhen] = useState(defaultDateTime);
  const [repeat, setRepeat] = useState<ReminderRepeat>('none');
  const [notify, setNotify] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setWhen(defaultDateTime());
    setRepeat('none');
    setNotify(true);
  };

  const startEdit = (r: Reminder) => {
    const [d, t] = r.datetime.split('T');
    setEditingId(r.id);
    setTitle(r.title);
    setWhen({ date: d, time: t });
    setRepeat(r.repeat);
    setNotify(r.notify);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;
    if (notify) await requestNotificationPermission();
    const reminder = { title: title.trim(), datetime: `${date}T${time}`, repeat, notify };
    if (editingId) await editReminder(editingId, reminder);
    else await addReminder(reminder);
    resetForm();
  };

  const sorted = [...reminders].sort(
    (a, b) => Number(!!a.completed) - Number(!!b.completed) || a.datetime.localeCompare(b.datetime)
  );
  const now = formatLocalDateTime(new Date());

  const composing = Boolean(title.trim() || editingId);

  return (
    <div className="section-block">
      <div className="panel-header">
        <span className="panel-title">Reminders</span>
      </div>

      <div className="list-card">
        <form onSubmit={handleSubmit} className="reminder-composer">
          <div className="list-row" style={{ gap: 10 }}>
            <Plus size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              className="inline-input"
              placeholder={editingId ? 'Reminder name' : 'Type a reminder…'}
              aria-label="Reminder name"
              onKeyDown={(e) => e.key === 'Escape' && resetForm()}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Date, time and repeat appear once there's something to schedule. */}
          {composing && (
            <div className="reminder-controls">
              <input type="date" className="form-input" value={date} onChange={(e) => setWhen({ date: e.target.value, time })} aria-label="Date" required />
              <input type="time" className="form-input" value={time} onChange={(e) => setWhen({ date, time: e.target.value })} aria-label="Time" required />
              <select className="form-select" value={repeat} onChange={(e) => setRepeat(e.target.value as ReminderRepeat)} aria-label="Repeat">
                {(Object.keys(REPEAT_LABELS) as ReminderRepeat[]).map((r) => (
                  <option key={r} value={r}>
                    {REPEAT_LABELS[r]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setNotify((n) => !n)}
                title={notify ? 'Notification on' : 'Notification off'}
                aria-pressed={notify}
                style={{ color: notify ? '#ffffff' : 'var(--text-muted)', width: 32, height: 32 }}
              >
                {notify ? <Bell size={15} /> : <BellOff size={15} />}
              </button>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          )}
        </form>

        {sorted.map((r) => {
          const overdue = !r.completed && r.datetime <= now;
          return (
            <div
              key={r.id}
              className="list-row"
              style={{ justifyContent: 'flex-start', gap: 12, background: editingId === r.id ? 'rgba(255, 255, 255, 0.03)' : undefined }}
            >
              <button
                type="button"
                className={`reminder-check${r.completed ? ' is-done' : ''}`}
                onClick={() => completeReminder(r.id)}
                title={r.repeat === 'none' ? 'Mark done' : 'Done, move to next occurrence'}
                aria-label={r.repeat === 'none' ? `Mark ${r.title} done` : `Done, move ${r.title} to next time`}
              >
                {r.completed && <Check size={11} strokeWidth={3} />}
              </button>

              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => startEdit(r)} title="Edit reminder">
                <div
                  style={{
                    fontSize: 'var(--fs-item)',
                    fontWeight: 600,
                    color: r.completed ? 'var(--text-muted)' : '#ffffff',
                    textDecoration: r.completed ? 'line-through' : 'none',
                  }}
                >
                  {r.title}
                </div>
                <div className="item-sub" style={{ color: overdue ? '#f87171' : undefined }}>
                  {formatWhen(r.datetime)}
                  {r.repeat !== 'none' && ` · ${REPEAT_LABELS[r.repeat]}`}
                  {!r.notify && ' · Silent'}
                </div>
              </div>

              <div className="item-actions">
                <button
                  className="icon-btn"
                  onClick={() => toggleReminderNotify(r.id)}
                  title={r.notify ? 'Turn notification off' : 'Turn notification on'}
                  style={{ color: 'var(--text-muted)' }}
                >
                  {r.notify ? <Bell size={13} /> : <BellOff size={13} />}
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (editingId === r.id) resetForm();
                    deleteReminder(r.id);
                  }}
                  title="Delete reminder"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
