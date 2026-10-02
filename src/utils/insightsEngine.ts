import {
  FocusSession,
  SmartInsight,
  DailyActivitySummary,
  Metric,
  MetricEntry,
  LifeEvent,
  Goal,
} from '../types';

interface InsightsInput {
  focusSessions: FocusSession[];
  activitySummary: DailyActivitySummary | null;
  metrics: Metric[];
  entries: MetricEntry[];
  events: LifeEvent[];
  goals: Goal[];
}

/**
 * Computes contextual, actionable smart insights from focus sessions,
 * screen time activity, metric entries, and daily accomplishments.
 */
export function computeSmartInsights(input: InsightsInput): SmartInsight[] {
  const { focusSessions, activitySummary, metrics, entries, events } = input;
  const insights: SmartInsight[] = [];

  // 1. Focus Multiplier on Goal / Metric Progress
  if (focusSessions.length > 0) {
    const datesWithFocus = new Set(focusSessions.map((s) => s.date));
    const entriesOnFocusDays = entries.filter((e) => datesWithFocus.has(e.date));
    const entriesOnNonFocusDays = entries.filter((e) => !datesWithFocus.has(e.date));

    const avgEntriesFocus = datesWithFocus.size > 0 ? entriesOnFocusDays.length / datesWithFocus.size : 0;
    const nonFocusDaysCount = Math.max(1, new Set(entries.map((e) => e.date)).size - datesWithFocus.size);
    const avgEntriesNonFocus = entriesOnNonFocusDays.length / nonFocusDaysCount;

    if (avgEntriesFocus > avgEntriesNonFocus && avgEntriesNonFocus > 0) {
      const multiplier = (avgEntriesFocus / avgEntriesNonFocus).toFixed(1);
      insights.push({
        id: 'focus-multiplier',
        type: 'focus_multiplier',
        title: 'Flow Multiplier',
        badge: `${multiplier}x Output`,
        metric: `${multiplier}x`,
        description: `On days you enter Flow, you log ${multiplier}x more progress across your target metrics.`,
        confidence: 'high',
        actionableRecommendation: 'Start your workday with a 45m Flow session before checking notifications.',
      });
    } else {
      const totalFocusMins = Math.round(focusSessions.reduce((acc, s) => acc + s.actualDurationSeconds, 0) / 60);
      const avgFlow = Math.round(focusSessions.reduce((acc, s) => acc + s.flowScore, 0) / focusSessions.length);
      insights.push({
        id: 'focus-volume',
        type: 'focus_multiplier',
        title: 'Consistent Flow Momentum',
        badge: `${avgFlow}% Flow`,
        metric: `${totalFocusMins}m`,
        description: `You've completed ${focusSessions.length} flow sessions totaling ${totalFocusMins}m with an average flow score of ${avgFlow}%.`,
        confidence: 'high',
        actionableRecommendation: 'Keep entering flow for cognitively demanding tasks.',
      });
    }
  }

  // 2. Cognitive Fragmentation & Switching Rate
  if (focusSessions.length > 0) {
    const totalSwitches = focusSessions.reduce((acc, s) => acc + s.contextSwitches, 0);
    const totalHours = focusSessions.reduce((acc, s) => acc + s.actualDurationSeconds, 0) / 3600;
    const switchesPerHour = totalHours > 0 ? Math.round(totalSwitches / totalHours) : 0;

    if (switchesPerHour <= 8 && switchesPerHour > 0) {
      insights.push({
        id: 'switching-rate-low',
        type: 'switching_rate',
        title: 'Deep Cognitive Immersion',
        badge: `${switchesPerHour} switches/hr`,
        metric: `${switchesPerHour}/hr`,
        description: `Your flow sessions average only ${switchesPerHour} window switches per hour—placing you in uninterrupted flow state.`,
        confidence: 'high',
        actionableRecommendation: 'Maintain single-tasking discipline to avoid context switching penalties.',
      });
    } else if (switchesPerHour > 12) {
      insights.push({
        id: 'switching-rate-high',
        type: 'switching_rate',
        title: 'Context Fragmentation Alert',
        badge: `${switchesPerHour} switches/hr`,
        metric: `${switchesPerHour}/hr`,
        description: `High multitasking detected: you average ${switchesPerHour} app/window switches per hour during active flow sessions.`,
        confidence: 'medium',
        actionableRecommendation: 'Try quitting Slack and email clients during flow.',
      });
    }
  }

  // 3. Peak Flow Time of Day
  if (activitySummary && activitySummary.hourlyActivity && activitySummary.hourlyActivity.length === 24) {
    const hourly = activitySummary.hourlyActivity;
    // Morning (8-12), Afternoon (12-17), Evening (17-22)
    const morning = hourly.slice(8, 12).reduce((a, b) => a + b, 0);
    const afternoon = hourly.slice(12, 17).reduce((a, b) => a + b, 0);
    const evening = hourly.slice(17, 22).reduce((a, b) => a + b, 0);

    let peakWindow = 'Morning (8 AM – 12 PM)';
    let peakMinutes = Math.floor(morning / 60);

    if (afternoon > morning && afternoon > evening) {
      peakWindow = 'Afternoon (12 PM – 5 PM)';
      peakMinutes = Math.floor(afternoon / 60);
    } else if (evening > morning && evening > afternoon) {
      peakWindow = 'Evening (5 PM – 10 PM)';
      peakMinutes = Math.floor(evening / 60);
    }

    if (peakMinutes >= 30) {
      insights.push({
        id: 'peak-time',
        type: 'peak_time',
        title: 'Peak Productivity Window',
        badge: peakWindow.split(' ')[0],
        metric: `${peakMinutes}m active`,
        description: `Your highest sustained output happens during ${peakWindow}, accounting for your deepest work blocks.`,
        confidence: 'high',
        actionableRecommendation: 'Protect this peak window for creative or engineering work; schedule meetings elsewhere.',
      });
    }
  }

  // 4. Optimal Session Duration
  if (focusSessions.length >= 2) {
    const shortSessions = focusSessions.filter((s) => s.actualDurationSeconds <= 30 * 60);
    const mediumSessions = focusSessions.filter((s) => s.actualDurationSeconds > 30 * 60 && s.actualDurationSeconds <= 50 * 60);
    const longSessions = focusSessions.filter((s) => s.actualDurationSeconds > 50 * 60);

    const avgFlow = (list: FocusSession[]) =>
      list.length ? Math.round(list.reduce((acc, s) => acc + s.flowScore, 0) / list.length) : 0;

    const medFlow = avgFlow(mediumSessions);
    const shortFlow = avgFlow(shortSessions);
    const longFlow = avgFlow(longSessions);

    if (medFlow >= shortFlow && medFlow >= longFlow && mediumSessions.length > 0) {
      insights.push({
        id: 'optimal-duration',
        type: 'optimal_duration',
        title: 'Optimal Flow Duration: 45m',
        badge: '45m Sweet Spot',
        metric: `${medFlow}% Flow`,
        description: `45-minute blocks produce your highest Flow Score (${medFlow}% deep work), maintaining momentum without cognitive fatigue.`,
        confidence: 'medium',
        actionableRecommendation: 'Default to 45m sessions for optimal concentration and energy conservation.',
      });
    }
  }

  // 5. Screen Time Balance / Deep Work Ratio
  if (activitySummary && activitySummary.totalActiveSeconds > 3600) {
    const deepRatio = Math.round((activitySummary.deepWorkSeconds / activitySummary.totalActiveSeconds) * 100);
    if (deepRatio >= 65) {
      insights.push({
        id: 'deep-work-ratio',
        type: 'habit_impact',
        title: 'Deep Work Dominance',
        badge: `${deepRatio}% Deep Work`,
        metric: `${deepRatio}%`,
        description: `${deepRatio}% of today's screen time was spent inside core craft applications (development, design, writing).`,
        confidence: 'high',
        actionableRecommendation: 'Exceptional concentration ratio. Keep up the high standard.',
      });
    } else if (deepRatio < 40) {
      insights.push({
        id: 'deep-work-ratio-low',
        type: 'habit_impact',
        title: 'High Fragmentation Observed',
        badge: `${deepRatio}% Deep Work`,
        metric: `${deepRatio}%`,
        description: `Only ${deepRatio}% of active screen time was in focused craft tools. Administrative and communication apps consumed the rest.`,
        confidence: 'medium',
        actionableRecommendation: 'Batch communication into two dedicated 20-minute daily checkpoints.',
      });
    }
  }

  // If no insights generated yet (e.g. brand new install), provide a welcoming starter insight
  if (insights.length === 0) {
    insights.push({
      id: 'welcome-insight',
      type: 'peak_time',
      title: 'Flow Tracking Ready',
      badge: 'Getting Started',
      metric: 'Flow',
      description: 'Start your first Flow session from the Today tab or Menu Bar popover to unlock smart behavioral correlations.',
      confidence: 'medium',
      actionableRecommendation: 'Try a 25-minute flow session on your most important project today.',
    });
  }

  return insights;
}
