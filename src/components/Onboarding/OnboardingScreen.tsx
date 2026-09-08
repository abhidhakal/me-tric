import React, { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, ArrowLeft, Plus, Trash2, X, Target, CornerDownLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTracker } from '../../context/TrackerContext';
import { MetricType, MetricCategory, TargetPeriod, Goal } from '../../types';
import { getTodayIso, getWeekRange, getMonthRange, getYearRange } from '../../utils/dateUtils';
import { PacingBreakdownModal, PacingSubgoal } from '../Common/PacingBreakdownModal';

interface UserDefinedGoal {
  id: string;
  title: string;
  targetValue: number;
  unit: string;
  period: TargetPeriod;
  metricName: string;
  category: MetricCategory;
  metricType: MetricType;
  note?: string;
}

export const OnboardingScreen: React.FC = () => {
  const {
    profile,
    metrics,
    completeOnboarding,
    closeOnboarding,
    saveMetric
  } = useTracker();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Profile
  const [name, setName] = useState(profile?.name || '');
  const [occupation, setOccupation] = useState(profile?.occupation || '');
  const [currency, setCurrency] = useState(profile?.currency || 'Rs.');

  // Step 2: Goals
  const [userGoals, setUserGoals] = useState<UserDefinedGoal[]>([]);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalUnit, setGoalUnit] = useState('hrs');
  const [goalPeriod, setGoalPeriod] = useState<TargetPeriod>('year');
  const [goalNote, setGoalNote] = useState('');
  const [pendingPacingGoal, setPendingPacingGoal] = useState<UserDefinedGoal | null>(null);
  const [isPacingModalOpen, setIsPacingModalOpen] = useState(false);

  // Step 3: Metrics
  const [enabledMetricIds, setEnabledMetricIds] = useState<string[]>([]);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricType, setNewMetricType] = useState<MetricType>('duration');
  const hasInitializedMetricsRef = useRef(false);

  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.occupation) setOccupation(profile.occupation);
      if (profile.currency) setCurrency(profile.currency);
    }
  }, [profile]);

  useEffect(() => {
    if (metrics.length > 0 && !hasInitializedMetricsRef.current) {
      setEnabledMetricIds(metrics.map((m) => m.id));
      hasInitializedMetricsRef.current = true;
    }
  }, [metrics]);

  const toggleMetric = (id: string) => {
    setEnabledMetricIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      setStep(3);
      return;
    }
    if (!goalTarget) return;

    const targetNum = parseFloat(goalTarget);
    if (isNaN(targetNum) || targetNum <= 0) return;

    // Infer type from unit
    const unitLower = goalUnit.trim().toLowerCase();
    let inferredType: MetricType = 'number';
    if (unitLower === 'hrs' || unitLower === 'hours' || unitLower === 'h' || unitLower === 'mins' || unitLower === 'minutes') {
      inferredType = 'duration';
    } else if (unitLower === currency.toLowerCase() || unitLower === '$' || unitLower === 'rs.' || unitLower === '€' || unitLower === '£') {
      inferredType = 'currency';
    }

    const newGoal: UserDefinedGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: goalTitle.trim(),
      targetValue: targetNum,
      unit: goalUnit.trim() || (inferredType === 'duration' ? 'hrs' : inferredType === 'currency' ? currency : 'items'),
      period: goalPeriod,
      metricName: goalTitle.trim(),
      category: 'Work',
      metricType: inferredType,
      note: goalNote.trim() || undefined,
    };

    if (goalPeriod === 'year' || goalPeriod === 'month') {
      setPendingPacingGoal(newGoal);
      setIsPacingModalOpen(true);
      return;
    }

    setUserGoals((prev) => [...prev, newGoal]);
    setGoalTitle('');
    setGoalTarget('');
    setGoalNote('');
  };

  const handlePacingConfirm = (subgoals: PacingSubgoal[]) => {
    if (!pendingPacingGoal) return;
    const createdSubgoals: UserDefinedGoal[] = subgoals.map((sg) => ({
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: sg.title,
      targetValue: sg.targetValue,
      unit: pendingPacingGoal.unit,
      period: sg.period,
      metricName: pendingPacingGoal.metricName,
      category: pendingPacingGoal.category,
      metricType: pendingPacingGoal.metricType,
      note: `Paced from ${pendingPacingGoal.title}`,
    }));

    setUserGoals((prev) => [...prev, pendingPacingGoal, ...createdSubgoals]);
    setPendingPacingGoal(null);
    setIsPacingModalOpen(false);
    setGoalTitle('');
    setGoalTarget('');
    setGoalNote('');
  };

  const handlePacingSkip = () => {
    if (pendingPacingGoal) {
      setUserGoals((prev) => [...prev, pendingPacingGoal]);
    }
    setPendingPacingGoal(null);
    setIsPacingModalOpen(false);
    setGoalTitle('');
    setGoalTarget('');
    setGoalNote('');
  };

  const handleRemoveGoal = (id: string) => {
    setUserGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAddCustomMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetricName.trim()) {
      handleComplete(false);
      return;
    }
    const created = await saveMetric({
      name: newMetricName.trim(),
      type: newMetricType,
      category: 'Personal',
      unit: newMetricType === 'duration' ? 'hrs' : newMetricType === 'currency' ? currency : 'items',
      color: '#ffffff',
      enabled: true,
    });
    if ((created as any)?.id) {
      setEnabledMetricIds((prev) => [...prev, (created as any).id]);
    }
    setNewMetricName('');
  };

  const handleComplete = async (skipMetrics: boolean = false) => {
    const today = getTodayIso();
    const yearRange = getYearRange(today);
    const monthRange = getMonthRange(today);
    const weekRange = getWeekRange(today);

    const generatedGoals: Goal[] = [];
    const createdOrFoundMetricIds = new Set<string>(skipMetrics ? [] : enabledMetricIds);

    for (const ug of userGoals) {
      let matchedMetric = metrics.find(
        (m) => m.name.toLowerCase() === ug.title.toLowerCase() || m.name.toLowerCase() === ug.metricName.toLowerCase()
      );

      if (!matchedMetric) {
        matchedMetric = (await saveMetric({
          name: ug.title,
          type: ug.metricType,
          category: ug.category,
          unit: ug.unit,
          targetValue: ug.targetValue,
          targetPeriod: ug.period,
          color: '#ffffff',
          enabled: true,
        })) as any;
      }

      if (matchedMetric) {
        createdOrFoundMetricIds.add(matchedMetric.id);

        let startDate = yearRange.start;
        let endDate = yearRange.end;
        if (ug.period === 'month') {
          startDate = monthRange.start;
          endDate = monthRange.end;
        } else if (ug.period === 'week') {
          startDate = weekRange.start;
          endDate = weekRange.end;
        } else if (ug.period === 'day') {
          startDate = today;
          endDate = today;
        }

        generatedGoals.push({
          id: `goal-${ug.id}`,
          title: ug.title,
          metricId: matchedMetric.id,
          targetValue: ug.targetValue,
          period: ug.period,
          startDate,
          endDate,
          note: ug.note,
          createdAt: today,
        });
      }
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#a1a1aa', '#71717a'],
      });
    } catch (_) {}

    await completeOnboarding({
      profile: {
        name: name.trim() || 'You',
        occupation: occupation.trim() || undefined,
        currency,
      },
      enabledMetricIds: Array.from(createdOrFoundMetricIds),
      goals: generatedGoals,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPacingModalOpen) return;

      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

        if (step === 1) {
          e.preventDefault();
          setStep(2);
        } else if (step === 2) {
          // If Cmd/Ctrl + Enter, or outside inputs, or empty goal input: advance to Step 3
          if (e.metaKey || e.ctrlKey || !isInput || !goalTitle.trim()) {
            e.preventDefault();
            setStep(3);
          }
        } else if (step === 3) {
          // If Cmd/Ctrl + Enter, or outside inputs, or empty custom metric: start tracking
          if (e.metaKey || e.ctrlKey || !isInput || !newMetricName.trim()) {
            e.preventDefault();
            handleComplete(false);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, goalTitle, newMetricName, name, occupation, currency, userGoals, enabledMetricIds, metrics, isPacingModalOpen]);

  const isExistingProfile = Boolean(profile?.onboardingCompleted);

  return (
    <div className="onboarding-screen">
      {/* Top Bar (38px Native macOS Height) */}
      <div className="onboarding-topbar">
        <div style={{ fontSize: '0.88rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
          MeTric
        </div>

        {/* Steps */}
        <div className="onboarding-progress-steps">
          <div className={`onboarding-step-indicator ${step === 1 ? 'active' : ''}`}>
            <span className="onboarding-step-num">1</span>
            <span>Profile</span>
          </div>
          <span style={{ color: 'var(--border-subtle)' }}>/</span>
          <div className={`onboarding-step-indicator ${step === 2 ? 'active' : ''}`}>
            <span className="onboarding-step-num">2</span>
            <span>Goals</span>
          </div>
          <span style={{ color: 'var(--border-subtle)' }}>/</span>
          <div className={`onboarding-step-indicator ${step === 3 ? 'active' : ''}`}>
            <span className="onboarding-step-num">3</span>
            <span>Metrics</span>
          </div>
        </div>

        <div>
          {isExistingProfile && (
            <button className="onboarding-exit-btn" onClick={closeOnboarding}>
              <X size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="onboarding-body">
        <div className="onboarding-container">
          {/* STEP 1: PROFILE */}
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              <div className="onboarding-header-block">
                <h1 className="onboarding-hero-title">Welcome to <em>MeTric</em></h1>
                <p className="onboarding-hero-subtitle">
                  Set up your profile to start tracking your life with focus and clarity.
                </p>
              </div>

              <div className="onboarding-card-box">
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Your Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Abhinav Dhakal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    style={{ padding: '12px 14px', fontSize: '0.95rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Role / Occupation (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Founder, Developer, Student"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    style={{ padding: '12px 14px', fontSize: '0.95rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Currency</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {['Rs.', '$', '€', '£'].map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        className="chip-btn"
                        style={{
                          padding: '10px 0',
                          fontSize: '0.88rem',
                          background: currency === curr ? '#ffffff' : 'rgba(255,255,255,0.03)',
                          color: currency === curr ? '#000000' : 'var(--text-secondary)',
                          borderColor: currency === curr ? '#ffffff' : 'var(--border-subtle)',
                          fontWeight: 700,
                          justifyContent: 'center',
                        }}
                        onClick={() => setCurrency(curr)}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="onboarding-footer-bar">
                <div />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px' }}
                >
                  <span>Continue</span>
                  <span className="btn-enter-badge" title="Press Enter to continue">
                    <CornerDownLeft size={11} strokeWidth={2.5} />
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: GOALS */}
          {step === 2 && (
            <>
              <div className="onboarding-header-block">
                <h1 className="onboarding-hero-title">Your <em>Goals</em></h1>
                <p className="onboarding-hero-subtitle">
                  Define targets you want to hit, or skip to start right away.
                </p>
              </div>

              {/* Goal Composer */}
              <div className="onboarding-card-box">
                <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Goal Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Gym & Workouts, Read Books, Deep Work"
                      value={goalTitle}
                      onChange={(e) => setGoalTitle(e.target.value)}
                      autoFocus
                      style={{ padding: '11px 14px', fontSize: '0.94rem', width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ minWidth: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target</label>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        placeholder="150"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        style={{ padding: '10px 12px', fontSize: '0.92rem', width: '100%' }}
                      />
                    </div>

                    <div className="form-group" style={{ minWidth: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unit</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="sessions"
                        value={goalUnit}
                        onChange={(e) => setGoalUnit(e.target.value)}
                        style={{ padding: '10px 12px', fontSize: '0.92rem', width: '100%' }}
                      />
                    </div>

                    <div className="form-group" style={{ minWidth: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cadence</label>
                      <select
                        className="form-select"
                        value={goalPeriod}
                        onChange={(e) => setGoalPeriod(e.target.value as TargetPeriod)}
                        style={{ padding: '10px 12px', fontSize: '0.92rem', width: '100%' }}
                      >
                        <option value="year">Yearly</option>
                        <option value="month">Monthly</option>
                        <option value="week">Weekly</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Notes & Strategy (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Focus on consistency 3x a week"
                      value={goalNote}
                      onChange={(e) => setGoalNote(e.target.value)}
                      style={{ padding: '11px 14px', fontSize: '0.92rem', width: '100%' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '11px 0',
                      background: '#ffffff',
                      color: '#000000',
                      fontWeight: 700,
                      width: '100%',
                      cursor: 'pointer',
                      marginTop: 2,
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>Add Goal</span>
                  </button>
                </form>
              </div>

              {/* Goals List */}
              {userGoals.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                    Added Goals ({userGoals.length})
                  </div>
                  {userGoals.map((ug) => (
                    <div
                      key={ug.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Target size={16} style={{ color: '#ffffff', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                            {ug.title} · <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{ug.targetValue} {ug.unit} / {ug.period}</span>
                          </div>
                          {ug.note && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3, fontStyle: 'italic' }}>
                              "{ug.note}"
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRemoveGoal(ug.id)}
                        title="Remove"
                        style={{ color: 'var(--accent-danger)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="onboarding-footer-bar">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setStep(1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setStep(3)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px' }}
                >
                  <span>{userGoals.length > 0 ? 'Continue' : 'Skip Goals'}</span>
                  <span className="btn-enter-badge" title="Press Enter to continue">
                    <CornerDownLeft size={11} strokeWidth={2.5} />
                  </span>
                </button>
              </div>
            </>
          )}

          {/* STEP 3: METRICS */}
          {step === 3 && (
            <>
              <div className="onboarding-header-block">
                <h1 className="onboarding-hero-title">Daily <em>Tracking</em></h1>
                <p className="onboarding-hero-subtitle">
                  Toggle the habits and metrics to keep active, or skip for now.
                </p>
              </div>

              <div className="onboarding-card-box">
                <div className="metric-checklist">
                  {metrics.map((m) => {
                    const isSelected = enabledMetricIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`metric-check-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleMetric(m.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="check-checkbox">
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#ffffff' }}>
                            {m.name}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {m.type}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Metric line */}
                <form onSubmit={handleAddCustomMetric} style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="New metric name..."
                    value={newMetricName}
                    onChange={(e) => setNewMetricName(e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <select
                    className="form-select"
                    value={newMetricType}
                    onChange={(e) => setNewMetricType(e.target.value as MetricType)}
                    style={{ flex: 1 }}
                  >
                    <option value="duration">Duration (hrs)</option>
                    <option value="number">Count (number)</option>
                    <option value="currency">Currency</option>
                  </select>
                  <button type="submit" className="btn-secondary" style={{ padding: '0 12px' }}>
                    <Plus size={15} />
                  </button>
                </form>
              </div>

              <div className="onboarding-footer-bar">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setStep(2)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleComplete(true)}
                    style={{ padding: '9px 16px', fontSize: '0.86rem' }}
                  >
                    Skip for Now
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleComplete(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontSize: '0.86rem' }}
                  >
                    <span>Start Tracking</span>
                    <span className="btn-enter-badge" title="Press Enter to start tracking">
                      <CornerDownLeft size={11} strokeWidth={2.5} />
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {pendingPacingGoal && (
        <PacingBreakdownModal
          isOpen={isPacingModalOpen}
          parentGoalTitle={pendingPacingGoal.title}
          parentTargetValue={pendingPacingGoal.targetValue}
          parentPeriod={pendingPacingGoal.period}
          unit={pendingPacingGoal.unit}
          onConfirm={handlePacingConfirm}
          onSkip={handlePacingSkip}
          onClose={() => setIsPacingModalOpen(false)}
        />
      )}
    </div>
  );
};
