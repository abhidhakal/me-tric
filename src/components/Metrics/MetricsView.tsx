import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Sliders,
  CheckCircle2,
  Clock,
  Hash,
  DollarSign,
  Star,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { Metric } from '../../types';
import { MetricModal } from './MetricModal';

export const MetricsView: React.FC = () => {
  const { metrics, saveMetric, deleteMetric } = useTracker();
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

  const getTypeBadge = (type: Metric['type']) => {
    switch (type) {
      case 'duration':
        return { label: 'Duration', icon: <Clock size={11} strokeWidth={2.5} /> };
      case 'number':
        return { label: 'Count', icon: <Hash size={11} strokeWidth={2.5} /> };
      case 'currency':
        return { label: 'Currency', icon: <DollarSign size={11} strokeWidth={2.5} /> };
      case 'boolean':
        return { label: 'Yes / No', icon: <CheckCircle2 size={11} strokeWidth={2.5} /> };
      case 'rating':
        return { label: 'Rating (1-10)', icon: <Star size={11} strokeWidth={2.5} /> };
      default:
        return { label: type, icon: <Sliders size={11} strokeWidth={2.5} /> };
    }
  };

  const getSteppersPreview = (m: Metric) => {
    if (m.type === 'duration') {
      return ['+15m', '+30m', '+1h', '+2h'];
    }
    if (m.type === 'currency') {
      const u = m.unit ? `${m.unit} ` : '';
      return [`${u}+100`, `${u}+500`, `${u}+1,000`];
    }
    if (m.type === 'boolean') {
      return ['Log Check (✓)'];
    }
    if (m.type === 'rating') {
      return ['Scale: 1 – 10'];
    }
    const unit = m.unit ? ` ${m.unit}` : '';
    return [`+1${unit}`, `+5${unit}`, `+10${unit}`];
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h2 className="view-title">Metrics</h2>
            <p className="view-subtitle">Manage habits, targets & trackers</p>
          </div>

          <button
            className="btn-primary"
            onClick={handleCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              padding: '7px 14px',
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Metric</span>
          </button>
        </div>
      </div>

      <div className="card-panel">
        <div className="panel-header">
          <span className="panel-title">
            <Sliders size={15} style={{ color: 'var(--text-secondary)' }} />
            Configured Metrics ({metrics.length})
          </span>
        </div>

        {metrics.length === 0 ? (
          <div
            style={{
              padding: '52px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.015)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '12px',
              margin: '8px 0',
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: 'var(--text-secondary)',
              }}
            >
              <Sliders size={20} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
              No metrics tracked yet
            </h3>
            <p
              style={{
                fontSize: '0.84rem',
                color: 'var(--text-muted)',
                maxWidth: 380,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Configure deep work hours, book tracking, fitness habits, or custom financials. Your tracked
              metrics will power your daily dashboard and pacing analytics.
            </p>
            <button
              className="btn-primary"
              onClick={handleCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.84rem',
                padding: '8px 18px',
              }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Create Your First Metric</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 14,
            }}
          >
            {metrics.map((m) => {
              const typeInfo = getTypeBadge(m.type);
              const steppers = getSteppersPreview(m);
              const isEnabled = m.enabled !== false;

              return (
                <div
                  key={m.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    opacity: isEnabled ? 1 : 0.65,
                  }}
                >
                  <div>
                    {/* Header: Title + Status indicator */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.name}
                        </h4>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {typeInfo.icon}
                            <span>{typeInfo.label}</span>
                          </span>

                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {m.category}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isEnabled ? '#22c55e' : '#52525b',
                          boxShadow: isEnabled ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none',
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                        title={isEnabled ? 'Active metric' : 'Inactive / Hidden'}
                      />
                    </div>

                    {/* Target info */}
                    <div
                      style={{
                        marginTop: 14,
                        padding: '8px 10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Target Cadence
                        </span>
                        {m.targetValue ? (
                          <span style={{ fontWeight: 700, color: '#ffffff' }}>
                            {m.targetValue} {m.unit || ''} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {m.targetPeriod}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                        )}
                      </div>
                    </div>

                    {/* Steppers preview */}
                    <div style={{ marginTop: 12 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Quick Log Steppers
                      </span>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {steppers.map((step, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.72rem',
                              fontFamily: 'monospace',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              color: 'var(--text-secondary)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            {step}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Active toggle + Edit & Delete */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      className="chip-btn"
                      onClick={() => saveMetric({ ...m, enabled: !isEnabled })}
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: isEnabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        color: isEnabled ? '#ffffff' : 'var(--text-muted)',
                        borderColor: isEnabled ? 'rgba(255, 255, 255, 0.25)' : 'var(--border-subtle)',
                      }}
                      title={isEnabled ? 'Click to hide this metric from daily tracking' : 'Click to activate this metric'}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: isEnabled ? '#22c55e' : '#71717a',
                        }}
                      />
                      {isEnabled ? 'Active' : 'Inactive'}
                    </button>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="icon-btn"
                        onClick={() => handleEdit(m)}
                        title="Edit metric"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => setMetricToDelete(m)}
                        title="Delete metric"
                        style={{ color: 'var(--accent-danger)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Create Metric Modal */}
      <MetricModal
        isOpen={isModalOpen}
        metricToEdit={editingMetric}
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

            <div style={{ margin: '14px 0 20px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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
                  fontSize: '0.86rem',
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
    </div>
  );
};
