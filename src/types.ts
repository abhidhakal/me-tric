export type MetricType = 'duration' | 'number' | 'currency' | 'boolean' | 'rating';
export type MetricCategory = 'Work' | 'Health' | 'Learning' | 'Money' | 'Personal';
export type TargetPeriod = 'day' | 'week' | 'month' | 'year';

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

export interface AppSettings {
  currencySymbol: string;
  theme: 'obsidian';
  weekStartsOnMonday: boolean;
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
  settings: AppSettings;
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
