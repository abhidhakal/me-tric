import React, { useState } from 'react';
import { Bell, BellOff, Trash2, Check, Repeat, CornerDownLeft, Pencil } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { Reminder, ReminderRepeat } from '../../types';
import { formatLocalDateTime, formatShortDate, getTodayIso, shiftDate } from '../../utils/dateUtils';
import { requestNotificationPermission } from '../../utils/notifications';

const REPEAT_LABELS: Record<ReminderRepeat, string> = {
  none: 'Does not repeat',
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

function formatWhen(datetime: string): string {
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

  return (
    <div className="card-panel" style={{ marginTop: 14 }}>
      <div className="panel-header">
        <span className="panel-title">Reminders</span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: sorted.length ? 12 : 0 }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: '1 1 100%', padding: '10px 14px', fontSize: '0.9rem' }}
          placeholder="Reminder name"
          onKeyDown={(e) => e.key === 'Escape' && resetForm()}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="form-input"
          style={{ width: 'auto' }}
          value={date}
          onChange={(e) => setWhen({ date: e.target.value, time })}
          required
        />
        <input
          type="time"
          className="form-input"
          style={{ width: 'auto' }}
          value={time}
          onChange={(e) => setWhen({ date, time: e.target.value })}
          required
        />
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}
          aria-label="Repeat"
        >
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
          style={{ color: notify ? '#ffffff' : 'var(--text-muted)' }}
        >
          {notify ? <Bell size={15} /> : <BellOff size={15} />}
        </button>
        {editingId && (
          <button type="button" className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={resetForm}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 18px', fontWeight: 600, fontSize: '0.86rem', marginLeft: editingId ? 0 : 'auto' }}
        >
          <span>{editingId ? 'Save' : 'Add'}</span>
          <span className="btn-enter-badge">
            <CornerDownLeft size={11} strokeWidth={2.5} />
          </span>
        </button>
      </form>

      {sorted.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 2px 2px' }}>No reminders yet.</p>
      ) : (
        <div className="highlight-list">
          {sorted.map((r) => {
            const overdue = !r.completed && r.datetime <= now;
            return (
              <div
                key={r.id}
                className="highlight-item"
                style={editingId === r.id ? { borderColor: 'var(--border-medium)' } : undefined}
              >
                <div className="highlight-left">
                  <button
                    type="button"
                    onClick={() => completeReminder(r.id)}
                    title={r.repeat === 'none' ? 'Mark done' : 'Done, move to next occurrence'}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1px solid ${r.completed ? '#ffffff' : 'var(--border-medium)'}`,
                      background: r.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000000',
                      flexShrink: 0,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {r.completed && <Check size={11} strokeWidth={3} />}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                    <span
                      className="highlight-title"
                      onClick={() => startEdit(r)}
                      title="Edit reminder"
                      style={{
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        color: r.completed ? 'var(--text-muted)' : '#ffffff',
                        textDecoration: r.completed ? 'line-through' : 'none',
                      }}
                    >
                      {r.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        color: overdue ? '#f87171' : 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {formatWhen(r.datetime)}
                      {r.repeat !== 'none' && (
                        <>
                          <Repeat size={10} />
                          {REPEAT_LABELS[r.repeat]}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button className="icon-btn" onClick={() => startEdit(r)} title="Edit reminder" style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={13} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => toggleReminderNotify(r.id)}
                    title={r.notify ? 'Turn notification off' : 'Turn notification on'}
                    style={{ color: r.notify ? '#ffffff' : 'var(--text-muted)' }}
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
      )}
    </div>
  );
};
