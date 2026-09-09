import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Metric, MetricCategory, MetricType, TargetPeriod } from '../../types';

interface MetricModalProps {
  isOpen: boolean;
  metricToEdit?: Metric | null;
  onClose: () => void;
  onSave: (metric: Omit<Metric, 'id' | 'createdAt'> & { id?: string }) => void;
}

export const MetricModal: React.FC<MetricModalProps> = ({
  isOpen,
  metricToEdit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<MetricType>('duration');
  const [category, setCategory] = useState<MetricCategory>('Work');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState<string>('');
  const [targetPeriod, setTargetPeriod] = useState<TargetPeriod>('week');
  const [color, setColor] = useState('#38bdf8');

  useEffect(() => {
    if (metricToEdit) {
      setName(metricToEdit.name);
      setType(metricToEdit.type);
      setCategory(metricToEdit.category);
      setUnit(metricToEdit.unit || '');
      setTargetValue(metricToEdit.targetValue ? String(metricToEdit.targetValue) : '');
      setTargetPeriod(metricToEdit.targetPeriod || 'week');
      setColor(metricToEdit.color || '#38bdf8');
    } else {
      setName('');
      setType('duration');
      setCategory('Work');
      setUnit('hrs');
      setTargetValue('25');
      setTargetPeriod('week');
      setColor('#38bdf8');
    }
  }, [metricToEdit, isOpen]);

  // Adjust default unit when type changes
  const handleTypeChange = (newType: MetricType) => {
    setType(newType);
    if (newType === 'duration' && !unit) setUnit('hrs');
    if (newType === 'currency' && !unit) setUnit('Rs.');
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: metricToEdit?.id,
      name: name.trim(),
      type,
      category,
      unit: unit.trim() || undefined,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      targetPeriod: targetValue ? targetPeriod : undefined,
      color,
    });
    onClose();
  };

  const colorPresets = ['#ffffff', '#e4e4e7', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{metricToEdit ? 'Edit Metric' : 'Create Custom Metric'}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Metric Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Deep Work, Books Read, Money Spent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as MetricType)}
              >
                <option value="duration">Duration (Time)</option>
                <option value="number">Number / Count</option>
                <option value="currency">Currency ($ / Rs.)</option>
                <option value="boolean">Yes / No</option>
                <option value="rating">Rating (1-10)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as MetricCategory)}
              >
                <option value="Work">Work</option>
                <option value="Health">Health</option>
                <option value="Learning">Learning</option>
                <option value="Money">Money</option>
                <option value="Personal">Personal</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Target Value (Optional)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder={type === 'duration' ? 'e.g. 25 (hrs)' : 'e.g. 100'}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Cadence</label>
              <select
                className="form-select"
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(e.target.value as TargetPeriod)}
                disabled={!targetValue}
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Annual</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Unit Label (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. hrs, books, Rs., workouts"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Monochrome Shade Indicator</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {colorPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '2px solid #ffffff' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} />
              <span>{metricToEdit ? 'Save Changes' : 'Create Metric'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
