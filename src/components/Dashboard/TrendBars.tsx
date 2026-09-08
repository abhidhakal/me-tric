import React from 'react';
import { MetricRollup } from '../../types';

interface TrendBarsProps {
  rollup: MetricRollup;
}

export const TrendBars: React.FC<TrendBarsProps> = ({ rollup }) => {
  const { dailyValues, metric } = rollup;
  if (!dailyValues || dailyValues.length === 0) return null;

  // Find max daily value to scale the bars nicely
  const maxValue = Math.max(...dailyValues.map((d) => d.value), 1);

  return (
    <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {metric.name} Daily Breakdown
        </span>
        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          Total: {rollup.formattedValue}
        </span>
      </div>

      <div className="trend-container">
        {dailyValues.map((day) => {
          const widthPercent = day.value > 0 ? Math.max(Math.round((day.value / maxValue) * 100), 4) : 0;
          return (
            <div key={day.date} className="trend-row">
              <span className="trend-day-label">{day.dayLabel}</span>
              <div className="trend-bar-track">
                {widthPercent > 0 && (
                  <div
                    className="trend-bar-fill"
                    style={{
                      width: `${widthPercent}%`,
                      background: 'linear-gradient(90deg, #52525b, #ffffff)',
                    }}
                  />
                )}
              </div>
              <span className="trend-value-label">
                {day.value > 0 ? day.formattedValue : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
