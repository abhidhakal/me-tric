import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Sliders, CheckCircle2 } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { Metric } from '../../types';
import { MetricModal } from './MetricModal';

export const MetricsView: React.FC = () => {
  const { metrics, saveMetric, deleteMetric } = useTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);

  const handleCreate = () => {
    setEditingMetric(null);
    setIsModalOpen(true);
  };

  const handleEdit = (m: Metric) => {
    setEditingMetric(m);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This will also remove associated historical entries.`)) {
      deleteMetric(id);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h2 className="view-title">Metrics</h2>
            <p className="view-subtitle">Manage what you track</p>
          </div>

          <button className="btn-quick-log" onClick={handleCreate}>
            <Plus size={15} strokeWidth={2.5} />
            <span>New Metric</span>
          </button>
        </div>
      </div>

      <div className="card-panel">
        <div className="panel-header">
          <span className="panel-title">
            <Sliders size={15} style={{ color: 'var(--text-secondary)' }} />
            Metrics ({metrics.length})
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {metrics.map((m) => (
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
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      {m.name}
                    </h4>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-muted)',
                        marginTop: 4,
                      }}
                    >
                      {m.category} · {m.type}
                    </span>
                  </div>

                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: m.enabled === false ? '#52525b' : '#ffffff',
                    }}
                  />
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Target:{' '}
                    {m.targetValue ? (
                      <strong style={{ color: '#ffffff' }}>
                        {m.targetValue} {m.unit || ''} / {m.targetPeriod}
                      </strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No target set</span>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 16,
                  paddingTop: 10,
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => saveMetric({ ...m, enabled: m.enabled === false ? true : false })}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '100px',
                    background: m.enabled === false ? 'rgba(255, 255, 255, 0.04)' : '#ffffff',
                    color: m.enabled === false ? 'var(--text-muted)' : '#000000',
                    border: `1px solid ${m.enabled === false ? 'var(--border-subtle)' : '#ffffff'}`,
                    cursor: 'pointer',
                  }}
                  title={m.enabled === false ? 'Click to activate this metric' : 'Click to hide this metric from daily tracking'}
                >
                  {m.enabled === false ? '○ Inactive' : '● Active'}
                </button>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="icon-btn"
                    onClick={() => handleEdit(m)}
                    title="Edit metric"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => handleDelete(m.id, m.name)}
                    title="Delete metric"
                    style={{ color: 'var(--accent-danger)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MetricModal
        isOpen={isModalOpen}
        metricToEdit={editingMetric}
        onClose={() => setIsModalOpen(false)}
        onSave={(saved) => saveMetric(saved)}
      />
    </div>
  );
};
