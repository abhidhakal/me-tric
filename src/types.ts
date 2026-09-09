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

export interface DailyNote {
  date: string;            // YYYY-MM-DD
  content: string;
  updatedAt: string;
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

export interface TomorrowPlan {
  id: string;
  date: string; // Target date (YYYY-MM-DD)
  title: string;
  time?: string; // Optional HH:mm (e.g. "14:30")
  datetime?: string; // Optional full ISO string for timed reminders (e.g. "2026-09-09T14:30:00")
  completed?: boolean;
  notified?: boolean; // Whether desktop notification has fired for timed reminder
  createdAt: string;
}

export type ReminderItem = TomorrowPlan;

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:mm format, e.g. "21:00"
  lastNotifiedDate?: string; // YYYY-MM-DD
}

export interface OneTimeReminder {
  id: string;
  title: string;
  datetime: string; // ISO string, e.g. "2026-09-09T14:30:00"
  fired?: boolean;
  createdAt: string;
}

export interface AppSettings {
  currencySymbol: string;
  theme: 'obsidian';
  weekStartsOnMonday: boolean;
  reminder?: ReminderSettings;
  oneTimeReminders?: OneTimeReminder[];
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

export interface AppDatabase {
  version: number;
  profile: UserProfile;
  metrics: Metric[];
  entries: MetricEntry[];
  events: LifeEvent[];
  notes: DailyNote[];
  goals: Goal[];
  reviews: Review[];
  plans?: TomorrowPlan[];
  settings: AppSettings;
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
