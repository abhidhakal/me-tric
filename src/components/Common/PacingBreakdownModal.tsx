import React, { useState, useEffect } from 'react';
import { X, Check, Layers, CornerDownLeft } from 'lucide-react';
import { TargetPeriod } from '../../types';

export interface PacingSubgoal {
  period: TargetPeriod;
  targetValue: number;
  title: string;
}

export interface PacingBreakdownModalProps {
  isOpen: boolean;
  parentGoalTitle: string;
  parentTargetValue: number;
  parentPeriod: TargetPeriod;
  unit: string;
  onConfirm: (subgoals: PacingSubgoal[]) => void;
  onSkip: () => void;
  onClose: () => void;
}

interface BreakdownOption {
  period: TargetPeriod;
  targetValue: number;
  label: string;
  cadenceName: string;
  selected: boolean;
}

function calculatePacingValue(total: number, divisor: number): number {
  const raw = total / divisor;
  if (raw >= 10) {
    return Math.round(raw);
  } else if (raw >= 1) {
    return Math.round(raw * 10) / 10;
  } else {
    return Math.max(Math.round(raw * 10) / 10, 0.1);
  }
}

export const PacingBreakdownModal: React.FC<PacingBreakdownModalProps> = ({
  isOpen,
  parentGoalTitle,
  parentTargetValue,
  parentPeriod,
  unit,
  onConfirm,
  onSkip,
  onClose,
}) => {
  const [options, setOptions] = useState<BreakdownOption[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const list: BreakdownOption[] = [];

    if (parentPeriod === 'year') {
      const monthlyVal = calculatePacingValue(parentTargetValue, 12);
      const weeklyVal = calculatePacingValue(parentTargetValue, 52);
      const dailyVal = calculatePacingValue(parentTargetValue, 365);

      list.push({
        period: 'month',
        targetValue: monthlyVal,
        label: 'Monthly Milestone',
        cadenceName: 'Monthly',
        selected: true,
      });

      list.push({
        period: 'week',
        targetValue: weeklyVal,
        label: 'Weekly Pacing',
        cadenceName: 'Weekly',
        selected: true,
      });

      list.push({
        period: 'day',
        targetValue: dailyVal,
        label: 'Daily Habit',
        cadenceName: 'Daily',
        selected: false,
      });
    } else if (parentPeriod === 'month') {
      const weeklyVal = calculatePacingValue(parentTargetValue, 4.33);
      const dailyVal = calculatePacingValue(parentTargetValue, 30);

      list.push({
        period: 'week',
        targetValue: weeklyVal,
        label: 'Weekly Target',
        cadenceName: 'Weekly',
        selected: true,
      });

      list.push({
        period: 'day',
        targetValue: dailyVal,
        label: 'Daily Habit',
        cadenceName: 'Daily',
        selected: false,
      });
    } else if (parentPeriod === 'week') {
      const dailyVal = calculatePacingValue(parentTargetValue, 7);

      list.push({
        period: 'day',
        targetValue: dailyVal,
        label: 'Daily Habit',
        cadenceName: 'Daily',
        selected: true,
      });
    }

    setOptions(list);
  }, [isOpen, parentPeriod, parentTargetValue]);

  const toggleOption = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, selected: !opt.selected } : opt))
    );
  };

  const updateValue = (index: number, val: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, targetValue: Math.max(val, 0.1) } : opt))
    );
  };

  const handleConfirm = () => {
    const selectedSubgoals: PacingSubgoal[] = options
      .filter((opt) => opt.selected)
      .map((opt) => {
        const titleSuffix = opt.cadenceName;
        return {
          period: opt.period,
          targetValue: opt.targetValue,
          title: `${parentGoalTitle} (${titleSuffix})`,
        };
      });

    onConfirm(selectedSubgoals);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, options, parentGoalTitle]);

  if (!isOpen) return null;

  const selectedCount = options.filter((o) => o.selected).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, padding: 22 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} style={{ color: '#ffffff' }} />
            <h3 className="modal-title" style={{ fontSize: '1.05rem' }}>Pacing Sub-Goals</h3>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: -6 }}>
          Would you like to auto-generate sub-goals according to{' '}
          <strong style={{ color: '#ffffff' }}>"{parentGoalTitle}"</strong> ({parentTargetValue} {unit}/{parentPeriod})?
        </p>

        {/* Choice Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '6px 0' }}>
          {options.map((opt, idx) => (
            <div
              key={opt.period}
              onClick={() => toggleOption(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: opt.selected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${opt.selected ? '#ffffff' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `1px solid ${opt.selected ? '#ffffff' : 'var(--border-medium)'}`,
                    background: opt.selected ? '#ffffff' : 'transparent',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {opt.selected && <Check size={12} strokeWidth={3} />}
                </div>

                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#ffffff' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {opt.cadenceName} pacing breakdown
                  </div>
                </div>
              </div>

              {/* Value display / adjustment */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={opt.targetValue}
                  onChange={(e) => updateValue(idx, parseFloat(e.target.value) || 0)}
                  style={{
                    width: 65,
                    padding: '3px 6px',
                    fontSize: '0.84rem',
                    textAlign: 'right',
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', minWidth: 40 }}>
                  {unit} / {opt.period}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onSkip}
            style={{ fontSize: '0.82rem', padding: '7px 12px' }}
          >
            Just Main Goal
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: '0.84rem',
              padding: '8px 16px',
            }}
          >
            <span>{selectedCount > 0 ? `Create ${selectedCount + 1} Goals` : 'Create Goal'}</span>
            <span className="btn-enter-badge" title="Press Enter to confirm">
              <CornerDownLeft size={11} strokeWidth={2.5} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
