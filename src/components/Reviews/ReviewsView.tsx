import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { localApi } from '../../services/localApi';
import { ReviewComputedStats, Review } from '../../types';
import {
  getWeekRange,
  getMonthRange,
  getYearRange,
  shiftDate,
  formatShortDate
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
    periodTitle = `Week ${w.weekNum} · ${formatShortDate(w.start)} – ${formatShortDate(w.end)}`;
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
        <div className="section-block">
          <div className="panel-header">
            <span className="panel-title">Scorecard</span>
          </div>

          {/* Best Day, Strongest KPI, Missed KPI */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
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
              <span style={{ fontSize: 'var(--fs-caption)', fontWeight: 700, color: 'var(--text-muted)' }}>
                Best Day
              </span>
              <div style={{ fontSize: 'var(--fs-num-lg)', fontWeight: 700, color: '#ffffff', marginTop: 4 }}>
                {stats.bestDay ? stats.bestDay.dayName : '—'}
              </div>
              <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', marginTop: 2 }}>
                {stats.bestDay ? stats.bestDay.highlightReason : ''}
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
              <span style={{ fontSize: 'var(--fs-caption)', fontWeight: 700, color: 'var(--text-muted)' }}>
                Strongest
              </span>
              <div style={{ fontSize: 'var(--fs-num-lg)', fontWeight: 700, color: '#ffffff', marginTop: 4 }}>
                {stats.strongestKpi ? stats.strongestKpi.metricName : '—'}
              </div>
              <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', marginTop: 2 }}>
                {stats.strongestKpi ? `${stats.strongestKpi.percent}% of target` : ''}
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
              <span style={{ fontSize: 'var(--fs-caption)', fontWeight: 700, color: 'var(--text-muted)' }}>
                Weakest
              </span>
              <div style={{ fontSize: 'var(--fs-num-lg)', fontWeight: 700, color: '#ffffff', marginTop: 4 }}>
                {stats.missedKpi ? stats.missedKpi.metricName : 'None'}
              </div>
              <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', marginTop: 2 }}>
                {stats.missedKpi ? `${stats.missedKpi.percent}% of target` : 'All targets met'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. HIGHLIGHT REEL */}
      {stats && stats.events.length > 0 && (
        <div className="section-block">
          <div className="panel-header">
            <span className="panel-title">Highlights</span>
          </div>

          <div className="list-card">
            {stats.events.map((ev) => (
              <div key={ev.id} className="list-row">
                <div style={{ minWidth: 0 }}>
                  <div className="highlight-title">{ev.title}</div>
                  {ev.description && <div className="highlight-desc">{ev.description}</div>}
                </div>
                <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatShortDate(ev.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. STRUCTURED REFLECTION PROMPTS */}
      <div className="panel-header">
        <span className="panel-title">Reflection</span>
      </div>
      <form onSubmit={handleSave}>
        <div className="list-card">
          {[
            { label: 'What went well?', value: wentWell, set: setWentWell },
            { label: "What didn't?", value: didntGoWell, set: setDidntGoWell },
            { label: `Focus for next ${periodType}`, value: focus, set: setFocus },
          ].map((field) => (
            <label key={field.label} className="list-row reflection-row">
              <span className="item-title">{field.label}</span>
              <textarea
                className="inline-input reflection-input"
                rows={2}
                placeholder="Write here…"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
              />
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="submit" className="btn-secondary" disabled={isSaving}>
            <Save size={14} />
            <span>{isSaving ? 'Saving…' : 'Save'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
