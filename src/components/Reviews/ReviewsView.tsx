import React, { useState, useEffect } from 'react';
import { BookOpen, Check, Award, AlertCircle, Sparkles, Calendar, Save } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { localApi } from '../../services/localApi';
import { ReviewComputedStats, Review } from '../../types';
import {
  getWeekRange,
  getMonthRange,
  getYearRange,
  getIsoWeekKey,
  shiftDate
} from '../../utils/dateUtils';

type ReviewPeriodType = 'week' | 'month' | 'year';

export const ReviewsView: React.FC = () => {
  const { activeDate, database, saveReview, showToast } = useTracker();
  const [periodType, setPeriodType] = useState<ReviewPeriodType>('week');
  const [offset, setOffset] = useState<number>(0); // 0 = current, -1 = previous, etc.

  const [stats, setStats] = useState<ReviewComputedStats | null>(null);
  const [savedReview, setSavedReview] = useState<Review | null>(null);

  const [wentWell, setWentWell] = useState('');
  const [didntGoWell, setDidntGoWell] = useState('');
  const [focus, setFocus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Compute the current target date based on offset
  const targetDate = periodType === 'week'
    ? shiftDate(activeDate, offset * 7)
    : periodType === 'month'
    ? shiftDate(activeDate, offset * 30)
    : shiftDate(activeDate, offset * 365);

  let periodKey = '';
  let startDate = '';
  let endDate = '';
  let periodTitle = '';

  if (periodType === 'week') {
    const w = getWeekRange(targetDate);
    periodKey = w.weekKey;
    startDate = w.start;
    endDate = w.end;
    periodTitle = `Week ${w.weekNum} (${w.start} to ${w.end})`;
  } else if (periodType === 'month') {
    const m = getMonthRange(targetDate);
    periodKey = m.monthKey;
    startDate = m.start;
    endDate = m.end;
    periodTitle = `${m.monthName} ${m.year}`;
  } else {
    const y = getYearRange(targetDate);
    periodKey = y.yearKey;
    startDate = y.start;
    endDate = y.end;
    periodTitle = `Year ${y.year}`;
  }

  // Load computed stats and any saved review reflection
  useEffect(() => {
    let isMounted = true;

    localApi.getReviewStats(periodType, periodKey, startDate, endDate).then((res) => {
      if (isMounted) setStats(res);
    });

    localApi.getReview(periodKey).then((rev) => {
      if (isMounted) {
        setSavedReview(rev);
        if (rev) {
          setWentWell(rev.wentWell || '');
          setDidntGoWell(rev.didntGoWell || '');
          setFocus(rev.focus || '');
        } else {
          setWentWell('');
          setDidntGoWell('');
          setFocus('');
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [periodType, periodKey, startDate, endDate, database]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveReview({
        id: savedReview?.id,
        periodType,
        periodKey,
        periodStart: startDate,
        periodEnd: endDate,
        wentWell,
        didntGoWell,
        focus,
      });
      showToast('Reflection saved successfully');
    } catch {
      showToast('Failed to save review', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title-row">
          <div>
            <h2 className="view-title">Reviews</h2>
            <p className="view-subtitle">{periodTitle}</p>
          </div>

          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: 4, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            {(['week', 'month', 'year'] as ReviewPeriodType[]).map((p) => (
              <button
                key={p}
                className="chip-btn"
                style={{
                  background: periodType === p ? '#ffffff' : 'transparent',
                  color: periodType === p ? '#000000' : 'var(--text-secondary)',
                  borderColor: periodType === p ? '#ffffff' : 'transparent',
                  fontWeight: periodType === p ? 700 : 500,
                  textTransform: 'capitalize',
                }}
                onClick={() => {
                  setPeriodType(p);
                  setOffset(0);
                }}
              >
                {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>
        </div>

        {/* Previous / Current period switcher */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            className="chip-btn"
            style={{ opacity: offset === 0 ? 1 : 0.7 }}
            onClick={() => setOffset(0)}
          >
            Current {periodType}
          </button>
          <button
            className="chip-btn"
            style={{ opacity: offset === -1 ? 1 : 0.7 }}
            onClick={() => setOffset(-1)}
          >
            Previous {periodType}
          </button>
        </div>
      </div>

      {/* 1. AUTO-COMPUTED SCORECARD */}
      {stats && (
        <div className="card-panel">
          <div className="panel-header">
            <span className="panel-title">
              <Award size={15} style={{ color: 'var(--text-secondary)' }} />
              Automated Scorecard · {stats.periodLabel}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Auto-aggregated from your daily logs
            </span>
          </div>

          {/* Headline Summary Bullets */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {stats.headlineSummary.length > 0 ? (
              stats.headlineSummary.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {item}
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No metrics logged for this period yet.
              </div>
            )}
          </div>

          {/* Best Day, Strongest KPI, Missed KPI */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 18,
            }}
          >
            {/* Best Day */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Best Day
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
                {stats.bestDay ? stats.bestDay.dayName : '—'}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {stats.bestDay ? stats.bestDay.highlightReason : 'Log daily entries to reveal your peak day'}
              </p>
            </div>

            {/* Strongest KPI */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Strongest KPI
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
                {stats.strongestKpi ? stats.strongestKpi.metricName : '—'}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {stats.strongestKpi ? `${stats.strongestKpi.percent}% of target achieved` : 'Set targets to track attainment'}
              </p>
            </div>

            {/* Missed KPI */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Friction / Missed
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
                {stats.missedKpi ? stats.missedKpi.metricName : 'None'}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {stats.missedKpi ? `${stats.missedKpi.percent}% of target achieved` : 'All target KPIs were met'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. HIGHLIGHT REEL */}
      {stats && stats.events.length > 0 && (
        <div className="card-panel">
          <div className="panel-header">
            <span className="panel-title">
              <Sparkles size={15} style={{ color: 'var(--text-secondary)' }} />
              Highlight Reel ({stats.events.length})
            </span>
          </div>

          <div className="highlight-list">
            {stats.events.map((ev) => (
              <div key={ev.id} className="highlight-item">
                <div className="highlight-left">
                  <span className="highlight-bullet">+</span>
                  <div>
                    <div className="highlight-title">{ev.title}</div>
                    {ev.description && <div className="highlight-desc">{ev.description}</div>}
                  </div>
                </div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{ev.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. STRUCTURED REFLECTION PROMPTS */}
      <form onSubmit={handleSave} className="card-panel">
        <div className="panel-header">
          <span className="panel-title">
            <BookOpen size={15} style={{ color: 'var(--text-secondary)' }} />
            Personal Reflection
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Manual reflection to drive continuous improvement
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label className="form-label">
              1. What went well?
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="What worked? What habits or wins made you proud?"
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              2. What didn't go well?
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Where was there friction, distraction, or missed targets?"
              value={didntGoWell}
              onChange={(e) => setDidntGoWell(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              3. What should I focus on next {periodType}?
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder={`Key priority and commitments for next ${periodType}...`}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Reflection'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
