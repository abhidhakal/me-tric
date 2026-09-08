import {
  Metric,
  MetricEntry,
  LifeEvent,
  Goal,
  MetricRollup,
  DashboardCategorySummary,
  ReviewComputedStats,
  MetricCategory
} from '../types';
import {
  getDayShortName,
  getDayOfWeekName,
  getDaysList,
  getWeekRange,
  getMonthRange,
  getQuarterRange,
  getYearRange
} from './dateUtils';
import { formatMetricValue, formatDuration } from './formatters';

/**
 * Computes a rollup for a single metric across a specific date window
 */
export function computeMetricRollup(
  metric: Metric,
  entries: MetricEntry[],
  startDate: string,
  endDate: string,
  currencySymbol: string = 'Rs.'
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

  // Daily values for sparklines / trend bars
  const days = getDaysList(startDate, endDate);
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

  // Calculate target for this period if defined
  let targetValue = metric.targetValue;
  if (metric.type === 'duration' && metric.targetValue) {
    // Target value is usually given in hours (e.g. 25h/week), convert to minutes
    targetValue = metric.targetValue * 60;
  }

  let progressPercent: number | undefined;
  if (targetValue && targetValue > 0) {
    progressPercent = Math.min(Math.round((totalValue / targetValue) * 100), 999);
  }

  let formattedTarget: string | undefined;
  if (targetValue) {
    formattedTarget = formatMetricValue(targetValue, metric, currencySymbol);
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
} {
  let startDate = '';
  let endDate = '';
  let dateRangeLabel = '';

  if (period === 'week') {
    const w = getWeekRange(activeDate);
    startDate = w.start;
    endDate = w.end;
    dateRangeLabel = `Week ${w.weekNum} (${w.start} to ${w.end})`;
  } else if (period === 'month') {
    const m = getMonthRange(activeDate);
    startDate = m.start;
    endDate = m.end;
    dateRangeLabel = `${m.monthName} ${m.year}`;
  } else if (period === 'quarter') {
    const q = getQuarterRange(activeDate);
    startDate = q.start;
    endDate = q.end;
    dateRangeLabel = `Q${q.quarter} ${q.year}`;
  } else {
    const y = getYearRange(activeDate);
    startDate = y.start;
    endDate = y.end;
    dateRangeLabel = `Year ${y.year}`;
  }

  const categoryOrder: MetricCategory[] = ['Work', 'Health', 'Learning', 'Money', 'Personal'];
  const categories: DashboardCategorySummary[] = [];

  categoryOrder.forEach((cat) => {
    const catMetrics = metrics.filter((m) => m.category === cat && m.enabled !== false);
    if (catMetrics.length > 0) {
      const rollups = catMetrics.map((m) =>
        computeMetricRollup(m, entries, startDate, endDate, currencySymbol)
      );
      categories.push({
        category: cat,
        metrics: rollups,
      });
    }
  });

  return {
    dateRangeLabel,
    categories,
    startDate,
    endDate,
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
    const sorted = [...metricsWithTargets].sort((a, b) => (b.progressPercent || 0) - (a.progressPercent || 0));
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    if (highest && (highest.progressPercent || 0) >= 100) {
      strongestKpi = {
        metricName: highest.metric.name,
        percent: highest.progressPercent || 0,
      };
    } else if (highest) {
      strongestKpi = {
        metricName: highest.metric.name,
        percent: highest.progressPercent || 0,
      };
    }

    if (lowest && (lowest.progressPercent || 0) < 100) {
      missedKpi = {
        metricName: lowest.metric.name,
        percent: lowest.progressPercent || 0,
      };
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
} {
  if (!metric) {
    return {
      currentValue: 0,
      targetValue: goal.targetValue,
      progressPercent: 0,
      formattedCurrent: '0',
      formattedTarget: String(goal.targetValue),
      isCompleted: false,
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
  const isCompleted = currentValue >= targetValue;

  return {
    currentValue,
    targetValue,
    progressPercent,
    formattedCurrent: formatMetricValue(currentValue, metric, currencySymbol),
    formattedTarget: formatMetricValue(targetValue, metric, currencySymbol),
    isCompleted,
  };
}
