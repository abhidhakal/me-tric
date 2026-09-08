import React, { useState } from 'react';
import { X, Check, CornerDownLeft } from 'lucide-react';
import { Metric, Goal, TargetPeriod } from '../../types';
import { getTodayIso, getWeekRange, getMonthRange, getYearRange } from '../../utils/dateUtils';
import { PacingBreakdownModal, PacingSubgoal } from '../Common/PacingBreakdownModal';

interface GoalModalProps {
  isOpen: boolean;
  metrics: Metric[];
  onClose: () => void;
  onSave: (
    goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string },
    subgoals?: Array<Omit<Goal, 'id' | 'createdAt'>>
  ) => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  metrics,
  onClose,
  onSave,
}) => {
  const today = getTodayIso();
  const weekInfo = getWeekRange(today);

  const [title, setTitle] = useState('');
  const [metricId, setMetricId] = useState(metrics[0]?.id || '');
  const [targetValue, setTargetValue] = useState('3');
  const [period, setPeriod] = useState<TargetPeriod>('week');
  const [startDate, setStartDate] = useState(weekInfo.start);
  const [endDate, setEndDate] = useState(weekInfo.end);
  const [note, setNote] = useState('');

  // Pacing dialog state
  const [isPacingOpen, setIsPacingOpen] = useState(false);
  const [pendingMainGoal, setPendingMainGoal] = useState<{
    title: string;
    metricId: string;
    targetValue: number;
    period: TargetPeriod;
    startDate: string;
    endDate: string;
    note?: string;
  } | null>(null);

  if (!isOpen) return null;

  const selectedMetric = metrics.find((m) => m.id === metricId);

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

  const handleReset = () => {
    setTitle('');
    setNote('');
    setPendingMainGoal(null);
    setIsPacingOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !metricId) return;

    const mainGoal = {
      title: title.trim(),
      metricId,
      targetValue: parseFloat(targetValue) || 1,
      period,
      startDate,
      endDate,
      note: note.trim() || undefined,
    };

    // If goal is yearly or monthly, prompt user with PacingBreakdownModal
    if (period === 'year' || period === 'month') {
      setPendingMainGoal(mainGoal);
      setIsPacingOpen(true);
      return;
    }

    onSave(mainGoal);
    handleReset();
    onClose();
  };

  const handlePacingConfirm = (subgoals: PacingSubgoal[]) => {
    if (!pendingMainGoal) return;

    const generatedSubgoals = subgoals.map((sg) => {
      let sDate = today;
      let eDate = today;
      if (sg.period === 'month') {
        const m = getMonthRange(today);
        sDate = m.start;
        eDate = m.end;
      } else if (sg.period === 'week') {
        const w = getWeekRange(today);
        sDate = w.start;
        eDate = w.end;
      }

      return {
        title: sg.title,
        metricId: pendingMainGoal.metricId,
        targetValue: sg.targetValue,
        period: sg.period,
        startDate: sDate,
        endDate: eDate,
        note: `Auto-generated pacing breakdown according to "${pendingMainGoal.title}"`,
      };
    });

    onSave(pendingMainGoal, generatedSubgoals);
    handleReset();
    onClose();
  };

  const handlePacingSkip = () => {
    if (pendingMainGoal) {
      onSave(pendingMainGoal);
    }
    handleReset();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Create Goal</h3>
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
              placeholder="e.g. Ship 3 meaningful things this week"
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Target Quantity</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 3"
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
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Annual</option>
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
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
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

      {pendingMainGoal && (
        <PacingBreakdownModal
          isOpen={isPacingOpen}
          parentGoalTitle={pendingMainGoal.title}
          parentTargetValue={pendingMainGoal.targetValue}
          parentPeriod={pendingMainGoal.period}
          unit={selectedMetric?.unit || (selectedMetric?.type === 'duration' ? 'hrs' : 'items')}
          onConfirm={handlePacingConfirm}
          onSkip={handlePacingSkip}
          onClose={() => setIsPacingOpen(false)}
        />
      )}
    </div>
  );
};
