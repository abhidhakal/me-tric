import {
  Metric,
  MetricEntry,
  LifeEvent,
  DailyNote,
  Goal,
  Review,
  TomorrowPlan,
  AppDatabase,
  AppSettings,
  UserProfile,
  DashboardCategorySummary,
  ReviewComputedStats,
  DailyActivitySummary,
  ActivityTrackerStatus,
} from '../types';

/**
 * Strongly-typed API interface for MeTric.
 * UI components interact only through this interface.
 * When migrating to Supabase or cloud backend, implement this same interface!
 */
export interface TrackerApi {
  // Database Lifecycle & Management
  init(): Promise<AppDatabase>;
  getDatabase(): Promise<AppDatabase>;
  exportDatabaseJson(): Promise<string>;
  importDatabaseJson(jsonString: string): Promise<boolean>;
  resetToBlank(): Promise<AppDatabase>;
  resetToSample(): Promise<AppDatabase>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  openDataFolder(): Promise<void>;
  getStorageLocation(): Promise<string>;

  // User Profile & Onboarding
  getProfile(): Promise<UserProfile>;
  saveProfile(profile: Partial<UserProfile>): Promise<UserProfile>;
  completeOnboarding(data: { profile: Partial<UserProfile>; enabledMetricIds: string[]; goals?: Goal[] }): Promise<AppDatabase>;

  // Metrics
  getMetrics(): Promise<Metric[]>;
  saveMetric(metric: Omit<Metric, 'id' | 'createdAt'> & { id?: string }): Promise<Metric>;
  deleteMetric(metricId: string): Promise<boolean>;

  // Metric Entries
  getEntriesForDate(date: string): Promise<MetricEntry[]>;
  logMetricEntry(entry: { metricId: string; value: number; date: string; note?: string }): Promise<MetricEntry>;
  deleteMetricEntry(entryId: string): Promise<boolean>;

  // Life Events & Highlights
  getEventsForDate(date: string): Promise<LifeEvent[]>;
  logEvent(event: { title: string; date: string; description?: string; category?: string }): Promise<LifeEvent>;
  deleteEvent(eventId: string): Promise<boolean>;

  // Daily Notes
  getDailyNote(date: string): Promise<DailyNote | null>;
  saveDailyNote(date: string, content: string): Promise<DailyNote>;

  // Plans for Tomorrow / Daily Planning
  getPlansForDate(date: string): Promise<TomorrowPlan[]>;
  addPlan(plan: { date: string; title: string }): Promise<TomorrowPlan>;
  togglePlan(planId: string): Promise<TomorrowPlan | null>;
  deletePlan(planId: string): Promise<boolean>;

  // Goals
  getGoals(): Promise<Goal[]>;
  saveGoal(goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string }): Promise<Goal>;
  deleteGoal(goalId: string): Promise<boolean>;

  // Reviews
  getReview(periodKey: string): Promise<Review | null>;
  saveReview(review: Omit<Review, 'id' | 'updatedAt'> & { id?: string }): Promise<Review>;

  // Computed Queries
  getDashboard(
    period: 'week' | 'month' | 'quarter' | 'year',
    referenceDate: string
  ): Promise<{
    dateRangeLabel: string;
    categories: DashboardCategorySummary[];
    startDate: string;
    endDate: string;
  }>;

  getReviewStats(
    periodType: 'week' | 'month' | 'year',
    periodKey: string,
    startDate: string,
    endDate: string
  ): Promise<ReviewComputedStats>;

  // Activity & Screen Time Tracking
  getActivitySummary(date?: string): Promise<DailyActivitySummary>;
  toggleActivityTracking(enabled?: boolean): Promise<boolean>;
  getActivityStatus(): Promise<ActivityTrackerStatus>;
}
