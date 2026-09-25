import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { Metric } from '../../types';
import { MetricModal } from './MetricModal';
import { getActiveGoal } from '../../utils/aggregation';
import { formatMetricValue } from '../../utils/formatters';

const TYPE_LABELS: Record<Metric['type'], string> = {
  duration: 'Duration',
  number: 'Count',
  currency: 'Currency',
  boolean: 'Yes / No',
  rating: 'Rating',
};

export const MetricsSection: React.FC = () => {
  const { metrics, goals, saveMetric, deleteMetric, settings } = useTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
  const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null);

  const handleCreate = () => {
    setEditingMetric(null);
    setIsModalOpen(true);
  };

  const handleEdit = (m: Metric) => {
    setEditingMetric(m);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (metricToDelete) {
      deleteMetric(metricToDelete.id);
      setMetricToDelete(null);
    }
  };

  return (
    <>
      <div className="section-block">
        <div className="panel-header">
          <span className="panel-title">Metrics</span>
          <button className="btn-secondary" onClick={handleCreate} style={{ fontSize: 'var(--fs-caption)', padding: '5px 10px' }}>
            <Plus size={13} strokeWidth={2.5} />
            <span>New</span>
          </button>
        </div>

        {metrics.length === 0 ? (
          <p className="empty-note">No metrics yet.</p>
        ) : (
          <div className="list-card">
            {metrics.map((m) => {
              const isEnabled = m.enabled !== false;
              const activeGoal = getActiveGoal(m.id, goals);
              return (
                <div key={m.id} className="list-row" style={{ opacity: isEnabled ? 1 : 0.5 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="item-title" style={{ fontSize: 'var(--fs-item)' }}>{m.name}</div>
                    <div className="item-sub">
                      {activeGoal
                        ? `Goal: ${activeGoal.title}`
                        : m.targetValue
                        ? `${formatMetricValue(m.type === 'duration' ? m.targetValue * 60 : m.targetValue, m, settings.currencySymbol)} / ${m.targetPeriod}`
                        : TYPE_LABELS[m.type]}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="item-actions">
                      <button className="icon-btn" onClick={() => handleEdit(m)} title="Edit metric" style={{ color: 'var(--text-muted)' }}>
                        <Edit2 size={13} />
                      </button>
                      <button className="icon-btn" onClick={() => setMetricToDelete(m)} title="Delete metric" style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => saveMetric({ ...m, enabled: !isEnabled })}
                      title={isEnabled ? 'Shown on Today (click to hide)' : 'Hidden from Today (click to show)'}
                      style={{ color: isEnabled ? 'var(--text-secondary)' : 'var(--text-muted)' }}
                    >
                      {isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MetricModal
        isOpen={isModalOpen}
        metricToEdit={editingMetric}
        goalTitle={editingMetric ? getActiveGoal(editingMetric.id, goals)?.title : undefined}
        onClose={() => setIsModalOpen(false)}
        onSave={(saved) => saveMetric(saved)}
      />

      {/* In-App Delete Confirmation Modal */}
      {metricToDelete && (
        <div className="modal-overlay" onClick={() => setMetricToDelete(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                  }}
                >
                  <AlertTriangle size={15} />
                </div>
                <h3 className="modal-title">Delete Metric</h3>
              </div>
              <button className="icon-btn" onClick={() => setMetricToDelete(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ margin: '14px 0 20px', fontSize: 'var(--fs-item)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong style={{ color: '#ffffff' }}>"{metricToDelete.name}"</strong>?
              This action cannot be undone and will permanently remove all associated historical log entries.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setMetricToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '9px 16px',
                  fontFamily: 'inherit',
                  fontSize: 'var(--fs-body)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'opacity 0.12s ease',
                }}
              >
                <Trash2 size={14} />
                <span>Delete Metric</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
