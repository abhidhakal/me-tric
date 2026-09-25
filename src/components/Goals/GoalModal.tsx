import React, { useState } from 'react';
import { X, Check, CornerDownLeft } from 'lucide-react';
import { Metric, Goal, TargetPeriod } from '../../types';
import { useTracker } from '../../context/TrackerContext';
import { formatMetricValue } from '../../utils/formatters';
import { getTodayIso, getWeekRange, getMonthRange, getYearRange, getDaysList } from '../../utils/dateUtils';

interface GoalModalProps {
  isOpen: boolean;
  metrics: Metric[];
  goalToEdit?: Goal | null;
  onClose: () => void;
  onSave: (goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string }) => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  metrics,
  goalToEdit,
  onClose,
  onSave,
}) => {
  const { settings, goals } = useTracker();
  const today = getTodayIso();
  const yearInfo = getYearRange(today);

  // One goal per metric at a time: another goal on the same metric with overlapping dates blocks it.
  const conflictFor = (mId: string, start: string, end: string) =>
    goals.find((g) => g.id !== goalToEdit?.id && g.metricId === mId && g.startDate <= end && start <= g.endDate);

  const [title, setTitle] = useState(goalToEdit?.title ?? '');
  const [metricId, setMetricId] = useState(
    () => goalToEdit?.metricId ?? (metrics.find((m) => !conflictFor(m.id, yearInfo.start, yearInfo.end)) ?? metrics[0])?.id ?? ''
  );
  const [targetValue, setTargetValue] = useState(goalToEdit ? String(goalToEdit.targetValue) : '');
  const [period, setPeriod] = useState<TargetPeriod>(goalToEdit?.period ?? 'year');
  const [startDate, setStartDate] = useState(goalToEdit?.startDate ?? yearInfo.start);
  const [endDate, setEndDate] = useState(goalToEdit?.endDate ?? yearInfo.end);
  const [note, setNote] = useState(goalToEdit?.note ?? '');

  if (!isOpen) return null;

  const selectedMetric = metrics.find((m) => m.id === metricId);
  const conflict = conflictFor(metricId, startDate, endDate);

  const handlePeriodChange = (p: TargetPeriod) => {
    setPeriod(p);
    if (p === 'week') {
      const w = getWeekRange(today);
      setStartDate(w.start);
      setEndDate(w.end);
    } else if (p === 'month') {
      const m = getMonthRange(today);
      setStartDate(m.start);
      setEndDate(m.end);
    } else if (p === 'year') {
      const y = getYearRange(today);
      setStartDate(y.start);
      setEndDate(y.end);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !metricId || conflict) return;
    onSave({
      id: goalToEdit?.id,
      title: title.trim(),
      metricId,
      targetValue: parseFloat(targetValue) || 1,
      period,
      startDate,
      endDate,
      note: note.trim() || undefined,
    });
    onClose();
  };

  // Rough even split for the preview; the live cascade adapts to actual progress.
  const target = parseFloat(targetValue) || 0;
  const goalDays = Math.max(1, getDaysList(startDate, endDate).length);
  const perDay = target / goalDays;
  const fmt = (n: number) => {
    if (!selectedMetric) return String(Math.round(n * 10) / 10);
    if (selectedMetric.type === 'duration') return formatMetricValue(n * 60, selectedMetric);
    return formatMetricValue(Math.round(n * 10) / 10, selectedMetric, settings.currencySymbol);
  };
  const preview = [
    goalDays > 31 && `${fmt(perDay * 30.44)} / month`,
    goalDays > 7 && `${fmt(perDay * 7)} / week`,
    goalDays > 1 && `${fmt(perDay)} / day`,
  ].filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{goalToEdit ? 'Edit Goal' : 'Create Goal'}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Goal Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Earn 1 crore this year"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Linked Metric</label>
            <select
              className="form-select"
              value={metricId}
              onChange={(e) => setMetricId(e.target.value)}
              required
            >
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category} · {m.type})
                </option>
              ))}
            </select>
            {conflict && (
              <p style={{ fontSize: '0.78rem', color: '#f87171', margin: '6px 0 0' }}>
                This metric already has the goal "{conflict.title}" for these dates. Pick another metric or change the dates.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Target Quantity</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 10000000"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cadence / Period</label>
              <select
                className="form-select"
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value as TargetPeriod)}
              >
                <option value="year">Annual</option>
                <option value="month">Monthly</option>
                <option value="week">Weekly</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date (Deadline)</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {target > 0 && preview.length > 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Breaks down to about {preview.join(' · ')}. Targets adjust automatically if you fall behind or get ahead.
            </p>
          )}

          <div className="form-group">
            <label className="form-label">Notes & Explanation (Optional)</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Target strategy, personal context, or why this milestone matters..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={Boolean(conflict)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: conflict ? 0.5 : 1 }}
            >
              <Check size={15} />
              <span>Save Goal</span>
              <span className="btn-enter-badge" title="Press Enter to save">
                <CornerDownLeft size={11} strokeWidth={2.5} />
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
