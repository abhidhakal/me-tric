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
  MetricCategory
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
    const targetPeriod = metric.targetPeriod || 'week';
    const daysInTargetPeriod =
      targetPeriod === 'day' ? 1 :
      targetPeriod === 'week' ? 7 :
      targetPeriod === 'month' ? 30.4375 :
      targetPeriod === 'quarter' ? 91.25 : 365.25;

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

      if (totalValue >= expectedProgress * 1.05) {
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
    ? Math.round(metricsWithTargets.reduce((acc, r) => acc + (r.progressPercent || 0), 0) / metricsWithTargets.length)
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
