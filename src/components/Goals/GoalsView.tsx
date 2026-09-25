import React, { useState } from 'react';
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { formatShortDate } from '../../utils/dateUtils';
import { useTracker } from '../../context/TrackerContext';
import { calculateGoalProgress, computeGoalCascade } from '../../utils/aggregation';
import { GoalModal } from './GoalModal';
import { Goal } from '../../types';

export const GoalsSection: React.FC = () => {
  const { goals, metrics, database, saveGoal, deleteGoal, settings } = useTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries = database?.entries || [];

  const goalItems = goals.map((g) => {
    const metric = metrics.find((m) => m.id === g.metricId);
    const progress = calculateGoalProgress(g, metric, entries, settings.currencySymbol);
    const cascade = metric ? computeGoalCascade(g, metric, entries, settings.currencySymbol) : [];
    return { goal: g, metric, progress, cascade };
  });

  const openEditor = (goal: Goal | null) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="section-block">
        <div className="panel-header">
          <span className="panel-title">Goals</span>
          <button className="btn-secondary" onClick={() => openEditor(null)} style={{ fontSize: 'var(--fs-caption)', padding: '5px 10px' }}>
            <Plus size={13} strokeWidth={2.5} />
            <span>New</span>
          </button>
        </div>

        {goalItems.length === 0 ? (
          <p className="empty-note">No goals yet.</p>
        ) : (
          <div className="item-list">
            {goalItems.map(({ goal, metric, progress, cascade }) => {
              const isExpanded = expandedId === goal.id;
              const canExpand = Boolean(goal.note) || (cascade.length > 0 && !progress.isCompleted && !progress.isOver);
              return (
                <div key={goal.id} className="item-card">
                  <div
                    className="item-head"
                    onClick={() => canExpand && setExpandedId(isExpanded ? null : goal.id)}
                    style={{ cursor: canExpand ? 'pointer' : 'default' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="item-title">{goal.title}</div>
                      <div className="item-sub">
                        {metric?.name || 'Unknown metric'} · by {formatShortDate(goal.endDate)}
                        {progress.isOver && <span style={{ color: 'var(--accent-danger)' }}> · Over budget</span>}
                        {progress.isCompleted && <span style={{ color: '#ffffff' }}> · Done</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={() => openEditor(goal)} title="Edit goal" style={{ color: 'var(--text-muted)' }}>
                          <Pencil size={13} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => window.confirm(`Delete goal "${goal.title}"?`) && deleteGoal(goal.id)}
                          title="Delete goal"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="item-value">
                        {progress.formattedCurrent} <small>/ {progress.formattedTarget}</small>
                      </div>
                      {canExpand && (
                        <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="progress-bar-track" style={{ marginTop: 10 }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${progress.progressPercent}%`,
                        background: progress.isOver ? 'linear-gradient(90deg, #dc2626, #f87171)' : undefined,
                      }}
                    />
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {goal.note && <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{goal.note}</p>}
                      {!progress.isCompleted &&
                        !progress.isOver &&
                        cascade.map((level) => (
                          <div key={level.period}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-caption)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{level.label}</span>
                              <span style={{  color: 'var(--text-secondary)' }}>
                                {level.formattedCurrent} / {level.formattedTarget}
                              </span>
                            </div>
                            <div className="progress-bar-track" style={{ height: 3, marginTop: 4 }}>
                              <div className="progress-bar-fill" style={{ width: `${level.progressPercent}%` }} />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <GoalModal isOpen metrics={metrics} goalToEdit={editingGoal} onClose={() => setIsModalOpen(false)} onSave={saveGoal} />
      )}
    </>
  );
};
