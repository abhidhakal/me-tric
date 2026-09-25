import type React from 'react';
import { useTracker } from '../../context/TrackerContext';
import { Metric } from '../../types';
import { formatMetricValue } from '../../utils/formatters';
import { computeGoalCascade, dailyShare, getActiveGoal } from '../../utils/aggregation';

// Budget metric past its limit.
export const OVER_STYLE: React.CSSProperties = { background: 'linear-gradient(90deg, #dc2626, #f87171)' };

// One-tap increments per metric type; clicking the number logs a custom amount.
export const STEPS: Partial<Record<Metric['type'], [number, string][]>> = {
  duration: [
    [15, '+15m'],
    [30, '+30m'],
    [60, '+1h'],
  ],
  currency: [
    [500, '+500'],
    [1000, '+1k'],
  ],
  number: [
    [1, '+1'],
    [3, '+3'],
  ],
};

// Each tile reads as: name, "value / target", bar, then when that target applies and the quick-adds.
// Shared by the Today tab and the menu bar popover.
export function useTodayMetrics() {
  const { activeDate, metrics, todayEntries, settings, goals, database } = useTracker();

  return metrics
    .filter((m) => m.enabled !== false)
    .map((m) => {
      const fmt = (v: number) => formatMetricValue(v, m, settings.currencySymbol);
      const total = todayEntries.filter((e) => e.metricId === m.id).reduce((acc, e) => acc + e.value, 0);
      // A goal-linked metric shows the goal's current period; a standalone one, today's share of its target.
      const goal = getActiveGoal(m.id, goals, activeDate);
      const level = goal ? computeGoalCascade(goal, m, database?.entries || [], settings.currencySymbol, activeDate)[0] : undefined;
      const share = !goal && m.type !== 'boolean' && m.type !== 'rating' ? dailyShare(m) : undefined;

      if (level) {
        return {
          metric: m,
          value: level.formattedCurrent,
          target: level.formattedTarget as string | undefined,
          percent: level.progressPercent as number | undefined,
          over: level.isOver,
          period: level.label.toLowerCase(),
        };
      }
      if (share) {
        const shareValue = m.type === 'number' ? Math.round(share * 10) / 10 : Math.round(share);
        return {
          metric: m,
          value: fmt(total),
          target: fmt(shareValue),
          percent: Math.min(Math.round((total / share) * 100), 100),
          over: Boolean(m.lowerIsBetter) && total > share,
          period: m.lowerIsBetter ? "today's budget" : 'today',
        };
      }
      return { metric: m, value: fmt(total), target: undefined, percent: undefined, over: false, period: 'today' };
    });
}
