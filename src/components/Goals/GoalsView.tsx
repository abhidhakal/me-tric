import React, { useState } from 'react';
import { Plus, Target, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { calculateGoalProgress } from '../../utils/aggregation';
import { GoalModal } from './GoalModal';

export const GoalsView: React.FC = () => {
  const { goals, metrics, database, saveGoal, deleteGoal, settings } = useTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const entries = database?.entries || [];

  const goalItems = goals.map((g) => {
    const metric = metrics.find((m) => m.id === g.metricId);
    const progress = calculateGoalProgress(g, metric, entries, settings.currencySymbol);
    return {
      goal: g,
      metric,
      progress,
    };
  });

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h2 className="view-title">Goals</h2>
            <p className="view-subtitle">Active targets & milestones</p>
          </div>

          <button
            className="btn-primary"
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '7px 14px' }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      <div className="card-panel">
        <div className="panel-header">
          <span className="panel-title">
            <Target size={15} style={{ color: 'var(--text-secondary)' }} />
            Goals ({goals.length})
          </span>
        </div>

        {goalItems.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No goals created yet. Click "New Goal" to add one.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {goalItems.map(({ goal, metric, progress }) => (
              <div
                key={goal.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                        {goal.title}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Linked metric:
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(255,255,255,0.06)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: '#ffffff',
                          }}
                        >
                          {metric?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {progress.isCompleted && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: '#ffffff',
                          color: '#000000',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        Completed
                      </span>
                    )}
                  </div>

                  {goal.note && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '6px',
                        borderLeft: '2px solid var(--border-subtle)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        fontStyle: 'italic',
                      }}
                    >
                      "{goal.note}"
                    </div>
                  )}

                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                        Progress
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                        {progress.formattedCurrent} / {progress.formattedTarget}
                      </span>
                    </div>

                    <div className="progress-bar-track" style={{ height: 8, marginTop: 8 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${progress.progressPercent}%`,
                          background: 'linear-gradient(90deg, #71717a, #ffffff)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 20,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <Calendar size={13} />
                    <span>Deadline: {goal.endDate}</span>
                  </div>

                  <button
                    className="icon-btn"
                    onClick={() => {
                      if (window.confirm(`Delete goal "${goal.title}"?`)) {
                        deleteGoal(goal.id);
                      }
                    }}
                    title="Delete goal"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <GoalModal
        isOpen={isModalOpen}
        metrics={metrics}
        onClose={() => setIsModalOpen(false)}
        onSave={async (saved, subgoals) => {
          await saveGoal(saved);
          if (subgoals && subgoals.length > 0) {
            for (const sg of subgoals) {
              await saveGoal(sg);
            }
          }
        }}
      />
    </div>
  );
};
