export type MetricType = 'duration' | 'number' | 'currency' | 'boolean' | 'rating';
export type MetricCategory = 'Work' | 'Health' | 'Learning' | 'Money' | 'Personal';
export type TargetPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface UserProfile {
  name: string;
  age?: number;
  occupation: string; // e.g. "Founder", "Software Engineer", "Writer", "Student"
  currency: string;   // e.g. "Rs.", "$", "€", "£"
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Metric {
  id: string;
  name: string;
  type: MetricType;
  category: MetricCategory;
  unit?: string;           // e.g. "hrs", "books", "Rs.", "items"
  targetValue?: number;    // e.g. 25, 4, 100000
  targetPeriod?: TargetPeriod;
  lowerIsBetter?: boolean; // Target is a budget/limit (e.g. money spent): staying under it is success
  icon?: string;
  color?: string;
  isDefaultQuickLog?: boolean;
  enabled?: boolean;
  createdAt: string;
}

export interface MetricEntry {
  id: string;
  metricId: string;
  value: number;           // minutes for duration, raw number for number/currency/rating, 1/0 for boolean
  date: string;            // YYYY-MM-DD
  note?: string;
  createdAt: string;
}

export interface LifeEvent {
  id: string;
  title: string;
  description?: string;
  date: string;            // YYYY-MM-DD
  category?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  metricId: string;
  targetValue: number;
  period: TargetPeriod;
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  note?: string;           // Explanation, strategy, or why this goal matters
  createdAt: string;
}

export interface Review {
  id: string;
  periodType: 'week' | 'month' | 'year';
  periodKey: string;       // e.g. "2026-W37", "2026-09", "2026"
  periodStart: string;
  periodEnd: string;
  wentWell: string;
  didntGoWell: string;
  focus: string;
  updatedAt: string;
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Reminder {
  id: string;
  title: string;
  datetime: string; // Next occurrence, local "YYYY-MM-DDTHH:mm"
  repeat: ReminderRepeat;
  notify: boolean;
  notified?: boolean; // One-time reminder already fired
  completed?: boolean; // One-time reminder checked off
  createdAt: string;
}

export interface AppSettings {
  currencySymbol: string;
  theme: 'obsidian';
  weekStartsOnMonday: boolean;
  activityTrackingEnabled?: boolean;
}

export type ActivityCategory =
  | 'development'
  | 'design'
  | 'writing'
  | 'communication'
  | 'research'
  | 'entertainment'
  | 'other';

export interface ActivityAppStat {
  appName: string;
  durationSeconds: number;
  category: ActivityCategory;
}

export interface ActivityProjectStat {
  project: string;
  durationSeconds: number;
}

export interface DailyActivitySummary {
  date: string; // YYYY-MM-DD
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  deepWorkSeconds: number;
  categoryBreakdown: Record<ActivityCategory, number>;
  topApps: ActivityAppStat[];
  topProjects: ActivityProjectStat[];
  hourlyActivity: number[]; // 24 entries: seconds active per hour (0-23)
  isTracking?: boolean;
}

export interface ActivityTrackerStatus {
  isTracking: boolean;
  isIdle: boolean;
  idleSeconds: number;
  currentApp?: string;
  currentCategory?: ActivityCategory;
  currentProject?: string;
  hasAccessibilityPermission: boolean;
}

export interface FocusSession {
  id: string;
  title: string;
  goalId?: string;
  targetMinutes: number;
  actualDurationSeconds: number;
  startedAt: string;
  endedAt: string;
  date: string; // YYYY-MM-DD
  flowScore: number; // 0-100% deep work
  contextSwitches: number;
  appsUsed: { appName: string; durationSeconds: number; category: ActivityCategory }[];
  completed: boolean;
  notes?: string;
  loggedAsAccomplishment?: boolean;
}

export interface SmartInsight {
  id: string;
  type: 'peak_time' | 'focus_multiplier' | 'switching_rate' | 'optimal_duration' | 'habit_impact';
  title: string;
  description: string;
  metric?: string;
  badge?: string;
  confidence: 'high' | 'medium';
  actionableRecommendation?: string;
}

export interface AppDatabase {
  version: number;
  profile: UserProfile;
  metrics: Metric[];
  entries: MetricEntry[];
  events: LifeEvent[];
  goals: Goal[];
  reviews: Review[];
  reminders: Reminder[];
  settings: AppSettings;
  focusSessions?: FocusSession[];
}

export interface TrendBucket {
  label: string;
  subLabel?: string;
  dateStart?: string;
  dateEnd?: string;
  value: number;
  formattedValue: string;
  isCurrent?: boolean;
}

export interface MetricRollup {
  metric: Metric;
  totalValue: number;
  entryCount: number;
  targetValue?: number;
  progressPercent?: number;
  formattedValue: string;
  formattedTarget?: string;
  dailyValues?: { date: string; dayLabel: string; value: number; formattedValue: string }[];
  trendBuckets?: TrendBucket[];
  paceStatus?: 'ahead' | 'on_track' | 'behind' | 'none';
  paceMessage?: string;
}

export interface DashboardSummaryStats {
  totalEntries: number;
  activeDays: number;
  totalDays: number;
  onTrackCount: number;
  totalTrackedMetrics: number;
  completionRate: number;
}

export interface DashboardCategorySummary {
  category: MetricCategory;
  metrics: MetricRollup[];
}

export interface ReviewComputedStats {
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  metrics: MetricRollup[];
  bestDay?: { dayName: string; date: string; highlightReason: string };
  strongestKpi?: { metricName: string; percent: number };
  missedKpi?: { metricName: string; percent: number };
  events: LifeEvent[];
  headlineSummary: string[];
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseDate: string;
  releaseUrl: string;
  assetName: string;
  assetSize: number;
  downloadUrl: string;
}

export interface UpdateProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}
