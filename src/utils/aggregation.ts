import {
  Metric,
  MetricEntry,
  LifeEvent,
  Goal,
  MetricRollup,
  TrendBucket,
  DashboardCategorySummary,
  DashboardSummaryStats,
  ReviewComputedStats,
  MetricCategory,
  TargetPeriod
} from '../types';
import {
  getDayShortName,
  getDayOfWeekName,
  getDaysList,
  getWeekRange,
  getMonthRange,
  getQuarterRange,
  getYearRange,
  shiftDate,
  parseIsoDate,
  formatToIso,
  getTodayIso
} from './dateUtils';
import { formatMetricValue, formatDuration } from './formatters';

/**
 * How well a rollup met its target, 0–100+ where 100 = success.
 * For budgets (lowerIsBetter) staying under the limit is 100; overspending scores limit / spent.
 */
export function attainmentPercent(r: MetricRollup): number {
  if (!r.targetValue) return 0;
  if (!r.metric.lowerIsBetter) return r.progressPercent || 0;
  return r.totalValue <= r.targetValue ? 100 : Math.round((r.targetValue / r.totalValue) * 100);
}

export const PERIOD_DAYS: Record<TargetPeriod, number> = {
  day: 1,
  week: 7,
  month: 30.4375,
  quarter: 91.25,
  year: 365.25,
};

/** A standalone metric's target scaled down to one day, in entry units (minutes for duration). */
export function dailyShare(metric: Metric): number | undefined {
  if (!metric.targetValue) return undefined;
  const base = metric.type === 'duration' ? metric.targetValue * 60 : metric.targetValue;
  return base / PERIOD_DAYS[metric.targetPeriod || 'week'];
}

/**
 * Computes a rollup for a single metric across a specific date window
 */
export function computeMetricRollup(
  metric: Metric,
  entries: MetricEntry[],
  startDate: string,
  endDate: string,
  currencySymbol: string = 'Rs.',
  period: 'week' | 'month' | 'quarter' | 'year' = 'week'
): MetricRollup {
  const matchingEntries = entries.filter(
    (e) => e.metricId === metric.id && e.date >= startDate && e.date <= endDate
  );

  let totalValue = 0;
  if (metric.type === 'rating') {
    if (matchingEntries.length > 0) {
      const sum = matchingEntries.reduce((acc, curr) => acc + curr.value, 0);
      totalValue = Math.round((sum / matchingEntries.length) * 10) / 10;
    }
  } else {
    totalValue = matchingEntries.reduce((acc, curr) => acc + curr.value, 0);
  }

  const days = getDaysList(startDate, endDate);
  const periodDays = Math.max(days.length, 1);
  const today = getTodayIso();

  // 1. Daily values (legacy & sparkline)
  const dailyValues = days.map((d) => {
    const dayEntries = matchingEntries.filter((e) => e.date === d);
    const dayTotal = dayEntries.reduce((sum, e) => sum + e.value, 0);
    return {
      date: d,
      dayLabel: getDayShortName(d),
      value: dayTotal,
      formattedValue: formatMetricValue(dayTotal, metric, currencySymbol),
    };
  });

  // 2. Scaled target based on period
  let targetValue: number | undefined;
  let progressPercent: number | undefined;
  let formattedTarget: string | undefined;

  if (metric.targetValue) {
    const baseTarget = metric.type === 'duration' ? metric.targetValue * 60 : metric.targetValue;
    const daysInTargetPeriod = PERIOD_DAYS[metric.targetPeriod || 'week'];

    const factor = periodDays / daysInTargetPeriod;
    targetValue = Math.max(1, Math.round(baseTarget * factor));

    if (targetValue > 0) {
      progressPercent = Math.min(Math.round((totalValue / targetValue) * 100), 999);
    }
    formattedTarget = formatMetricValue(targetValue, metric, currencySymbol);
  }

  // 3. Pace Status
  let paceStatus: 'ahead' | 'on_track' | 'behind' | 'none' = 'none';
  let paceMessage: string | undefined;

  if (targetValue && targetValue > 0) {
    if (today < startDate) {
      paceStatus = 'none';
      paceMessage = 'Upcoming';
    } else {
      const effectiveEndDate = today < endDate ? today : endDate;
      const elapsedDays = Math.min(periodDays, Math.max(1, getDaysList(startDate, effectiveEndDate).length));
      const elapsedPercent = elapsedDays / periodDays;
      const expectedProgress = targetValue * elapsedPercent;

      if (metric.lowerIsBetter) {
        // Budget: spending slower than the elapsed share is good.
        if (totalValue > targetValue) {
          paceStatus = 'behind';
          paceMessage = 'Over budget';
        } else if (totalValue > expectedProgress * 1.05) {
          paceStatus = 'behind';
          paceMessage = 'Spending too fast';
        } else if (totalValue > expectedProgress * 0.85) {
          paceStatus = 'on_track';
          paceMessage = 'Within budget';
        } else {
          paceStatus = 'ahead';
          paceMessage = 'Under budget';
        }
      } else if (totalValue >= expectedProgress * 1.05) {
        paceStatus = 'ahead';
        paceMessage = 'Ahead of pace';
      } else if (totalValue >= expectedProgress * 0.85) {
        paceStatus = 'on_track';
        paceMessage = 'On track';
      } else {
        paceStatus = 'behind';
        paceMessage = 'Behind pace';
      }
    }
  }

  // 4. Trend Buckets according to period
  let trendBuckets: TrendBucket[] = [];

  if (period === 'week') {
    trendBuckets = days.map((d) => {
      const dayEntries = matchingEntries.filter((e) => e.date === d);
      const dayTotal = dayEntries.reduce((sum, e) => sum + e.value, 0);
      return {
        label: getDayShortName(d),
        subLabel: d.slice(5),
        dateStart: d,
        dateEnd: d,
        value: dayTotal,
        formattedValue: formatMetricValue(dayTotal, metric, currencySymbol),
        isCurrent: d === today,
      };
    });
  } else if (period === 'month') {
    // 4-5 weekly milestone buckets
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const start = chunk[0];
      const end = chunk[chunk.length - 1];
      const weekIdx = Math.floor(i / 7) + 1;
      const bEntries = matchingEntries.filter((e) => e.date >= start && e.date <= end);
      const bTotal = metric.type === 'rating'
        ? (bEntries.length > 0 ? Math.round((bEntries.reduce((s, e) => s + e.value, 0) / bEntries.length) * 10) / 10 : 0)
        : bEntries.reduce((s, e) => s + e.value, 0);

      trendBuckets.push({
        label: `W${weekIdx}`,
        subLabel: `${start.slice(5)} – ${end.slice(5)}`,
        dateStart: start,
        dateEnd: end,
        value: bTotal,
        formattedValue: formatMetricValue(bTotal, metric, currencySymbol),
        isCurrent: today >= start && today <= end,
      });
    }
  } else if (period === 'quarter') {
    // 3 month buckets
    for (let idx = 0; idx < 3; idx++) {
      const d = parseIsoDate(startDate);
      d.setMonth(d.getMonth() + idx);
      const mRange = getMonthRange(formatToIso(d));
      const bEntries = matchingEntries.filter((e) => e.date >= mRange.start && e.date <= mRange.end);
      const bTotal = metric.type === 'rating'
        ? (bEntries.length > 0 ? Math.round((bEntries.reduce((s, e) => s + e.value, 0) / bEntries.length) * 10) / 10 : 0)
        : bEntries.reduce((s, e) => s + e.value, 0);

      trendBuckets.push({
        label: mRange.monthName.slice(0, 3),
        subLabel: mRange.monthName,
        dateStart: mRange.start,
        dateEnd: mRange.end,
        value: bTotal,
        formattedValue: formatMetricValue(bTotal, metric, currencySymbol),
        isCurrent: today >= mRange.start && today <= mRange.end,
      });
    }
  } else {
    // 12 months for year
    for (let idx = 0; idx < 12; idx++) {
      const d = parseIsoDate(startDate);
      d.setMonth(idx);
      const mRange = getMonthRange(formatToIso(d));
      const bEntries = matchingEntries.filter((e) => e.date >= mRange.start && e.date <= mRange.end);
      const bTotal = metric.type === 'rating'
        ? (bEntries.length > 0 ? Math.round((bEntries.reduce((s, e) => s + e.value, 0) / bEntries.length) * 10) / 10 : 0)
        : bEntries.reduce((s, e) => s + e.value, 0);

      trendBuckets.push({
        label: mRange.monthName.slice(0, 3),
        subLabel: mRange.monthName,
        dateStart: mRange.start,
        dateEnd: mRange.end,
        value: bTotal,
        formattedValue: formatMetricValue(bTotal, metric, currencySymbol),
        isCurrent: today >= mRange.start && today <= mRange.end,
      });
    }
  }

  return {
    metric,
    totalValue,
    entryCount: matchingEntries.length,
    targetValue,
    progressPercent,
    formattedValue: formatMetricValue(totalValue, metric, currencySymbol),
    formattedTarget,
    dailyValues,
    trendBuckets,
    paceStatus,
    paceMessage,
  };
}

/**
 * Computes the dashboard categories and rollups
 */
export function computeDashboard(
  metrics: Metric[],
  entries: MetricEntry[],
  period: 'week' | 'month' | 'quarter' | 'year',
  activeDate: string,
  currencySymbol: string = 'Rs.'
): {
  dateRangeLabel: string;
  categories: DashboardCategorySummary[];
  startDate: string;
  endDate: string;
  summaryStats: DashboardSummaryStats;
} {
  let startDate = '';
  let endDate = '';
  let dateRangeLabel = '';

  if (period === 'week') {
    const w = getWeekRange(activeDate);
    startDate = w.start;
    endDate = w.end;
    const startObj = parseIsoDate(w.start);
    const endObj = parseIsoDate(w.end);
    const startMonth = startObj.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endObj.toLocaleDateString('en-US', { month: 'short' });
    const rangeText = startMonth === endMonth
      ? `${startMonth} ${startObj.getDate()} – ${endObj.getDate()}, ${startObj.getFullYear()}`
      : `${startMonth} ${startObj.getDate()} – ${endMonth} ${endObj.getDate()}, ${endObj.getFullYear()}`;
    dateRangeLabel = `Week ${w.weekNum} · ${rangeText}`;
  } else if (period === 'month') {
    const m = getMonthRange(activeDate);
    startDate = m.start;
    endDate = m.end;
    dateRangeLabel = `${m.monthName} ${m.year} · ${m.start} to ${m.end}`;
  } else if (period === 'quarter') {
    const q = getQuarterRange(activeDate);
    startDate = q.start;
    endDate = q.end;
    const startObj = parseIsoDate(q.start);
    const endObj = parseIsoDate(q.end);
    dateRangeLabel = `Q${q.quarter} ${q.year} · ${startObj.toLocaleDateString('en-US', { month: 'short' })} – ${endObj.toLocaleDateString('en-US', { month: 'short' })} ${q.year}`;
  } else {
    const y = getYearRange(activeDate);
    startDate = y.start;
    endDate = y.end;
    dateRangeLabel = `Full Year ${y.year} · ${y.start} to ${y.end}`;
  }

  const categoryOrder: MetricCategory[] = ['Work', 'Health', 'Learning', 'Money', 'Personal'];
  const categories: DashboardCategorySummary[] = [];

  categoryOrder.forEach((cat) => {
    const catMetrics = metrics.filter((m) => m.category === cat && m.enabled !== false);
    if (catMetrics.length > 0) {
      const rollups = catMetrics.map((m) =>
        computeMetricRollup(m, entries, startDate, endDate, currencySymbol, period)
      );
      categories.push({
        category: cat,
        metrics: rollups,
      });
    }
  });

  const matchingEntriesInWindow = entries.filter((e) => e.date >= startDate && e.date <= endDate);
  const uniqueActiveDays = new Set(matchingEntriesInWindow.map((e) => e.date)).size;
  const days = getDaysList(startDate, endDate);
  const periodDays = Math.max(days.length, 1);
  const allRollups = categories.flatMap((c) => c.metrics);
  const metricsWithTargets = allRollups.filter((r) => r.targetValue && r.targetValue > 0);
  const onTrackCount = metricsWithTargets.filter((r) => r.paceStatus === 'ahead' || r.paceStatus === 'on_track').length;
  const completionRate = metricsWithTargets.length > 0
    ? Math.round(metricsWithTargets.reduce((acc, r) => acc + attainmentPercent(r), 0) / metricsWithTargets.length)
    : 0;

  const summaryStats: DashboardSummaryStats = {
    totalEntries: matchingEntriesInWindow.length,
    activeDays: uniqueActiveDays,
    totalDays: periodDays,
    onTrackCount,
    totalTrackedMetrics: metricsWithTargets.length,
    completionRate,
  };

  return {
    dateRangeLabel,
    categories,
    startDate,
    endDate,
    summaryStats,
  };
}

/**
 * Computes automated review statistics for a chosen week/month/year
 */
export function computeReviewStats(
  metrics: Metric[],
  entries: MetricEntry[],
  events: LifeEvent[],
  periodType: 'week' | 'month' | 'year',
  periodKey: string,
  startDate: string,
  endDate: string,
  currencySymbol: string = 'Rs.'
): ReviewComputedStats {
  const periodRollups = metrics
    .filter((m) => m.enabled !== false)
    .map((m) =>
      computeMetricRollup(m, entries, startDate, endDate, currencySymbol)
    );

  // Period events
  const periodEvents = events.filter((e) => e.date >= startDate && e.date <= endDate);

  // Best day: calculate total duration/activity per day
  const days = getDaysList(startDate, endDate);
  let bestDayScore = -1;
  let bestDayObj: { dayName: string; date: string; highlightReason: string } | undefined;

  days.forEach((day) => {
    const dayEntries = entries.filter((e) => e.date === day);
    const dayEvents = events.filter((e) => e.date === day);

    // Productivity score based on duration + accomplishments
    let score = 0;
    let workMinutes = 0;
    dayEntries.forEach((e) => {
      const metric = metrics.find((m) => m.id === e.metricId);
      if (metric?.type === 'duration') {
        score += e.value;
        if (metric.category === 'Work') {
          workMinutes += e.value;
        }
      } else if (metric?.type === 'number') {
        score += e.value * 20;
      }
    });
    score += dayEvents.length * 60;

    if (score > bestDayScore && score > 0) {
      bestDayScore = score;
      bestDayObj = {
        dayName: getDayOfWeekName(day),
        date: day,
        highlightReason: workMinutes > 0 ? `${formatDuration(workMinutes)} focused work` : `${dayEvents.length} events logged`,
      };
    }
  });

  // Strongest KPI & Missed KPI based on target attainment
  const metricsWithTargets = periodRollups.filter((r) => r.targetValue && r.targetValue > 0);
  let strongestKpi: { metricName: string; percent: number } | undefined;
  let missedKpi: { metricName: string; percent: number } | undefined;

  if (metricsWithTargets.length > 0) {
    const sorted = [...metricsWithTargets].sort((a, b) => attainmentPercent(b) - attainmentPercent(a));
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    if (highest) {
      strongestKpi = { metricName: highest.metric.name, percent: attainmentPercent(highest) };
    }
    if (lowest && attainmentPercent(lowest) < 100) {
      missedKpi = { metricName: lowest.metric.name, percent: attainmentPercent(lowest) };
    }
  }

  // Headline Summary items
  const headlineSummary: string[] = [];
  periodRollups.forEach((r) => {
    if (r.totalValue > 0) {
      if (r.metric.type === 'duration') {
        headlineSummary.push(`${r.metric.name}: ${r.formattedValue}`);
      } else if (r.metric.name.toLowerCase().includes('workout') || r.metric.name.toLowerCase().includes('exercise')) {
        headlineSummary.push(`Exercised ${r.totalValue} times`);
      } else if (r.metric.name.toLowerCase().includes('project') || r.metric.name.toLowerCase().includes('ship')) {
        headlineSummary.push(`Shipped ${r.totalValue} milestones`);
      }
    }
  });

  if (periodEvents.length > 0) {
    headlineSummary.push(`${periodEvents.length} memorable events & highlights`);
  }

  let periodLabel = periodKey;
  if (periodType === 'week') {
    periodLabel = `Week ${periodKey.split('-W')[1] || periodKey}`;
  }

  return {
    periodKey,
    periodLabel,
    periodStart: startDate,
    periodEnd: endDate,
    metrics: periodRollups,
    bestDay: bestDayObj,
    strongestKpi,
    missedKpi,
    events: periodEvents,
    headlineSummary,
  };
}

/**
 * Calculates current progress for a goal linked to a metric
 */
export function calculateGoalProgress(
  goal: Goal,
  metric: Metric | undefined,
  entries: MetricEntry[],
  currencySymbol: string = 'Rs.'
): {
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  formattedCurrent: string;
  formattedTarget: string;
  isCompleted: boolean;
  isOver: boolean; // Budget goal already exceeded
} {
  if (!metric) {
    return {
      currentValue: 0,
      targetValue: goal.targetValue,
      progressPercent: 0,
      formattedCurrent: '0',
      formattedTarget: String(goal.targetValue),
      isCompleted: false,
      isOver: false,
    };
  }

  const matchingEntries = entries.filter(
    (e) => e.metricId === goal.metricId && e.date >= goal.startDate && e.date <= goal.endDate
  );

  let currentValue = 0;
  if (metric.type === 'duration') {
    currentValue = matchingEntries.reduce((sum, e) => sum + e.value, 0);
  } else {
    currentValue = matchingEntries.reduce((sum, e) => sum + e.value, 0);
  }

  let targetValue = goal.targetValue;
  if (metric.type === 'duration') {
    // If target in goal is specified in hours, convert to minutes
    targetValue = goal.targetValue * 60;
  }

  const progressPercent = targetValue > 0 ? Math.min(Math.round((currentValue / targetValue) * 100), 100) : 0;
  // A budget goal is only "done" once its window closes without overspending.
  const isOver = Boolean(metric.lowerIsBetter) && currentValue > targetValue;
  const isCompleted = metric.lowerIsBetter ? !isOver && getTodayIso() > goal.endDate : currentValue >= targetValue;

  return {
    currentValue,
    targetValue,
    progressPercent,
    formattedCurrent: formatMetricValue(currentValue, metric, currencySymbol),
    formattedTarget: formatMetricValue(targetValue, metric, currencySymbol),
    isCompleted,
    isOver,
  };
}

/** The goal currently driving a metric's target, if any. */
export function getActiveGoal(metricId: string, goals: Goal[], date: string = getTodayIso()): Goal | undefined {
  return goals.find((g) => g.metricId === metricId && g.startDate <= date && date <= g.endDate);
}

/**
 * Metrics with an active goal take their target from that goal (goal wins over the metric's own target).
 */
export function applyGoalTargets(metrics: Metric[], goals: Goal[], date: string = getTodayIso()): Metric[] {
  return metrics.map((m) => {
    const goal = getActiveGoal(m.id, goals, date);
    return goal ? { ...m, targetValue: goal.targetValue, targetPeriod: goal.period } : m;
  });
}

export interface GoalCascadeLevel {
  period: 'month' | 'week' | 'day';
  label: string;
  target: number;
  current: number;
  progressPercent: number;
  isOver: boolean; // Budget level exceeded (lowerIsBetter only)
  formattedTarget: string;
  formattedCurrent: string;
}

const CASCADE_LEVELS: Record<string, GoalCascadeLevel['period'][]> = {
  year: ['month', 'week', 'day'],
  quarter: ['month', 'week', 'day'],
  month: ['week', 'day'],
  week: ['day'],
  day: [],
};

/**
 * Breaks a goal down into this month / this week / today.
 * Each level's target = what's still left of the goal, spread evenly over the days left,
 * so falling behind raises the next period's target and getting ahead lowers it.
 */
export function computeGoalCascade(
  goal: Goal,
  metric: Metric,
  entries: MetricEntry[],
  currencySymbol: string = 'Rs.',
  today: string = getTodayIso()
): GoalCascadeLevel[] {
  if (today < goal.startDate || today > goal.endDate) return [];

  const scale = metric.type === 'duration' ? 60 : 1;
  const total = goal.targetValue * scale;
  const sum = (start: string, end: string) =>
    entries
      .filter((e) => e.metricId === goal.metricId && e.date >= start && e.date <= end)
      .reduce((acc, e) => acc + e.value, 0);

  return (CASCADE_LEVELS[goal.period] || []).map((period) => {
    const range =
      period === 'month' ? getMonthRange(today) : period === 'week' ? getWeekRange(today) : { start: today, end: today };
    const start = range.start > goal.startDate ? range.start : goal.startDate;
    const end = range.end < goal.endDate ? range.end : goal.endDate;

    const remaining = Math.max(0, total - sum(goal.startDate, shiftDate(start, -1)));
    const daysLeft = getDaysList(start, goal.endDate).length;
    const rawTarget = (remaining / daysLeft) * getDaysList(start, end).length;
    const target = metric.type === 'number' ? Math.ceil(rawTarget * 10) / 10 : Math.ceil(rawTarget);
    const current = sum(start, end);

    return {
      period,
      label: period === 'month' ? 'This month' : period === 'week' ? 'This week' : 'Today',
      target,
      current,
      progressPercent: target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 100,
      isOver: Boolean(metric.lowerIsBetter) && current > target,
      formattedTarget: formatMetricValue(target, metric, currencySymbol),
      formattedCurrent: formatMetricValue(current, metric, currencySymbol),
    };
  });
}
