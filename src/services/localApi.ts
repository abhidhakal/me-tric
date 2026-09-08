import {
  AppDatabase,
  AppSettings,
  UserProfile,
  Metric,
  MetricEntry,
  LifeEvent,
  DailyNote,
  Goal,
  Review,
  TomorrowPlan,
  DashboardCategorySummary,
  ReviewComputedStats,
  DailyActivitySummary,
  ActivityTrackerStatus,
} from '../types';
import { TrackerApi } from './api';
import { MacDiskStorageAdapter } from './storage';
import { createBlankDatabase, createInitialDatabase } from '../utils/sampleData';
import { computeDashboard, computeReviewStats } from '../utils/aggregation';

export class LocalTrackerApi implements TrackerApi {
  private db: AppDatabase;
  private isInitialized: boolean = false;

  constructor() {
    this.db = createInitialDatabase();
  }

  async init(): Promise<AppDatabase> {
    this.db = await MacDiskStorageAdapter.load();
    if (!this.db.metrics || this.db.metrics.length === 0) {
      const initial = createInitialDatabase();
      this.db.metrics = initial.metrics;
      await MacDiskStorageAdapter.save(this.db);
    }
    this.isInitialized = true;
    return this.db;
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  async getDatabase(): Promise<AppDatabase> {
    await this.ensureLoaded();
    return this.db;
  }

  async exportDatabaseJson(): Promise<string> {
    await this.ensureLoaded();
    return MacDiskStorageAdapter.exportJson(this.db);
  }

  async importDatabaseJson(jsonString: string): Promise<boolean> {
    try {
      this.db = await MacDiskStorageAdapter.importJson(jsonString);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  async resetToBlank(): Promise<AppDatabase> {
    this.db = createBlankDatabase();
    await MacDiskStorageAdapter.save(this.db);
    return this.db;
  }

  async resetToSample(): Promise<AppDatabase> {
    this.db = createInitialDatabase();
    await MacDiskStorageAdapter.save(this.db);
    return this.db;
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    await this.ensureLoaded();
    this.db.settings = { ...this.db.settings, ...settings };
    await MacDiskStorageAdapter.save(this.db);
    return this.db.settings;
  }

  async openDataFolder(): Promise<void> {
    await MacDiskStorageAdapter.openDataFolder();
  }

  async getStorageLocation(): Promise<string> {
    return MacDiskStorageAdapter.getStorageLocation();
  }

  // --- Profile & Onboarding ---

  async getProfile(): Promise<UserProfile> {
    await this.ensureLoaded();
    if (!this.db.profile) {
      this.db.profile = {
        name: '',
        occupation: '',
        currency: 'Rs.',
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await MacDiskStorageAdapter.save(this.db);
    }
    return { ...this.db.profile };
  }

  async saveProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    await this.ensureLoaded();
    const existing = await this.getProfile();
    const updated: UserProfile = {
      ...existing,
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    this.db.profile = updated;
    if (profile.currency) {
      this.db.settings.currencySymbol = profile.currency;
    }
    await MacDiskStorageAdapter.save(this.db);
    return updated;
  }

  async completeOnboarding(data: {
    profile: Partial<UserProfile>;
    enabledMetricIds: string[];
    goals?: Goal[];
  }): Promise<AppDatabase> {
    await this.ensureLoaded();
    const existing = await this.getProfile();
    const updatedProfile: UserProfile = {
      ...existing,
      ...data.profile,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    };
    this.db.profile = updatedProfile;
    if (data.profile.currency) {
      this.db.settings.currencySymbol = data.profile.currency;
    }

    // Enable only selected metrics (if specified)
    if (data.enabledMetricIds) {
      this.db.metrics = this.db.metrics.map((m) => ({
        ...m,
        enabled: data.enabledMetricIds.includes(m.id),
      }));
    }

    // Add any configured goals
    if (data.goals && data.goals.length > 0) {
      this.db.goals = [...data.goals];
    }

    await MacDiskStorageAdapter.save(this.db);
    return this.db;
  }

  // --- Metrics ---

  async getMetrics(): Promise<Metric[]> {
    await this.ensureLoaded();
    return [...this.db.metrics];
  }

  async saveMetric(metric: Omit<Metric, 'id' | 'createdAt'> & { id?: string }): Promise<Metric> {
    await this.ensureLoaded();
    const isNew = !metric.id;
    const now = new Date().toISOString();
    const id = metric.id || `metric-${Date.now()}`;
    const fullMetric: Metric = {
      ...metric,
      id,
      createdAt: isNew ? now : (this.db.metrics.find((m) => m.id === id)?.createdAt || now),
    };

    if (isNew) {
      this.db.metrics.push(fullMetric);
    } else {
      const idx = this.db.metrics.findIndex((m) => m.id === id);
      if (idx !== -1) {
        this.db.metrics[idx] = fullMetric;
      } else {
        this.db.metrics.push(fullMetric);
      }
    }
    await MacDiskStorageAdapter.save(this.db);
    return fullMetric;
  }

  async deleteMetric(metricId: string): Promise<boolean> {
    await this.ensureLoaded();
    this.db.metrics = this.db.metrics.filter((m) => m.id !== metricId);
    this.db.entries = this.db.entries.filter((e) => e.metricId !== metricId);
    this.db.goals = this.db.goals.filter((g) => g.metricId !== metricId);
    await MacDiskStorageAdapter.save(this.db);
    return true;
  }

  // --- Metric Entries ---

  async getEntriesForDate(date: string): Promise<MetricEntry[]> {
    await this.ensureLoaded();
    return this.db.entries.filter((e) => e.date === date);
  }

  async logMetricEntry(entry: {
    metricId: string;
    value: number;
    date: string;
    note?: string;
  }): Promise<MetricEntry> {
    await this.ensureLoaded();
    const id = `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newEntry: MetricEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
    };
    this.db.entries.push(newEntry);
    await MacDiskStorageAdapter.save(this.db);
    return newEntry;
  }

  async deleteMetricEntry(entryId: string): Promise<boolean> {
    await this.ensureLoaded();
    this.db.entries = this.db.entries.filter((e) => e.id !== entryId);
    await MacDiskStorageAdapter.save(this.db);
    return true;
  }

  // --- Events & Highlights ---

  async getEventsForDate(date: string): Promise<LifeEvent[]> {
    await this.ensureLoaded();
    return this.db.events.filter((e) => e.date === date);
  }

  async logEvent(event: {
    title: string;
    date: string;
    description?: string;
    category?: string;
  }): Promise<LifeEvent> {
    await this.ensureLoaded();
    const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newEvent: LifeEvent = {
      ...event,
      id,
      createdAt: new Date().toISOString(),
    };
    this.db.events.unshift(newEvent);
    await MacDiskStorageAdapter.save(this.db);
    return newEvent;
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    await this.ensureLoaded();
    this.db.events = this.db.events.filter((e) => e.id !== eventId);
    await MacDiskStorageAdapter.save(this.db);
    return true;
  }

  // --- Daily Notes ---

  async getDailyNote(date: string): Promise<DailyNote | null> {
    await this.ensureLoaded();
    return this.db.notes.find((n) => n.date === date) || null;
  }

  async saveDailyNote(date: string, content: string): Promise<DailyNote> {
    await this.ensureLoaded();
    const existing = this.db.notes.find((n) => n.date === date);
    const now = new Date().toISOString();
    if (existing) {
      existing.content = content;
      existing.updatedAt = now;
      await MacDiskStorageAdapter.save(this.db);
      return existing;
    } else {
      const newNote: DailyNote = { date, content, updatedAt: now };
      this.db.notes.push(newNote);
      await MacDiskStorageAdapter.save(this.db);
      return newNote;
    }
  }

  // --- Plans for Tomorrow / Daily Planning ---

  async getPlansForDate(date: string): Promise<TomorrowPlan[]> {
    await this.ensureLoaded();
    if (!this.db.plans) this.db.plans = [];
    return this.db.plans.filter((p) => p.date === date);
  }

  async addPlan(plan: { date: string; title: string }): Promise<TomorrowPlan> {
    await this.ensureLoaded();
    if (!this.db.plans) this.db.plans = [];
    const newPlan: TomorrowPlan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: plan.date,
      title: plan.title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    this.db.plans.push(newPlan);
    await MacDiskStorageAdapter.save(this.db);
    return newPlan;
  }

  async togglePlan(planId: string): Promise<TomorrowPlan | null> {
    await this.ensureLoaded();
    if (!this.db.plans) this.db.plans = [];
    const plan = this.db.plans.find((p) => p.id === planId);
    if (plan) {
      plan.completed = !plan.completed;
      await MacDiskStorageAdapter.save(this.db);
      return { ...plan };
    }
    return null;
  }

  async deletePlan(planId: string): Promise<boolean> {
    await this.ensureLoaded();
    if (!this.db.plans) this.db.plans = [];
    const prevLen = this.db.plans.length;
    this.db.plans = this.db.plans.filter((p) => p.id !== planId);
    if (this.db.plans.length !== prevLen) {
      await MacDiskStorageAdapter.save(this.db);
      return true;
    }
    return false;
  }

  // --- Goals ---

  async getGoals(): Promise<Goal[]> {
    await this.ensureLoaded();
    return [...this.db.goals];
  }

  async saveGoal(goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string }): Promise<Goal> {
    await this.ensureLoaded();
    const isNew = !goal.id;
    const now = new Date().toISOString();
    const id = goal.id || `goal-${Date.now()}`;
    const fullGoal: Goal = {
      ...goal,
      id,
      createdAt: isNew ? now : (this.db.goals.find((g) => g.id === id)?.createdAt || now),
    };

    if (isNew) {
      this.db.goals.push(fullGoal);
    } else {
      const idx = this.db.goals.findIndex((g) => g.id === id);
      if (idx !== -1) {
        this.db.goals[idx] = fullGoal;
      } else {
        this.db.goals.push(fullGoal);
      }
    }
    await MacDiskStorageAdapter.save(this.db);
    return fullGoal;
  }

  async deleteGoal(goalId: string): Promise<boolean> {
    await this.ensureLoaded();
    this.db.goals = this.db.goals.filter((g) => g.id !== goalId);
    await MacDiskStorageAdapter.save(this.db);
    return true;
  }

  // --- Reviews ---

  async getReview(periodKey: string): Promise<Review | null> {
    await this.ensureLoaded();
    return this.db.reviews.find((r) => r.periodKey === periodKey) || null;
  }

  async saveReview(review: Omit<Review, 'id' | 'updatedAt'> & { id?: string }): Promise<Review> {
    await this.ensureLoaded();
    const existingIdx = this.db.reviews.findIndex((r) => r.periodKey === review.periodKey);
    const now = new Date().toISOString();
    const id = review.id || (existingIdx !== -1 ? this.db.reviews[existingIdx].id : `rev-${Date.now()}`);

    const fullReview: Review = {
      ...review,
      id,
      updatedAt: now,
    };

    if (existingIdx !== -1) {
      this.db.reviews[existingIdx] = fullReview;
    } else {
      this.db.reviews.push(fullReview);
    }
    await MacDiskStorageAdapter.save(this.db);
    return fullReview;
  }

  // --- Computed Queries ---

  async getDashboard(
    period: 'week' | 'month' | 'quarter' | 'year',
    referenceDate: string
  ): Promise<{
    dateRangeLabel: string;
    categories: DashboardCategorySummary[];
    startDate: string;
    endDate: string;
  }> {
    await this.ensureLoaded();
    return computeDashboard(
      this.db.metrics,
      this.db.entries,
      period,
      referenceDate,
      this.db.settings.currencySymbol
    );
  }

  async getReviewStats(
    periodType: 'week' | 'month' | 'year',
    periodKey: string,
    startDate: string,
    endDate: string
  ): Promise<ReviewComputedStats> {
    await this.ensureLoaded();
    return computeReviewStats(
      this.db.metrics,
      this.db.entries,
      this.db.events,
      periodType,
      periodKey,
      startDate,
      endDate,
      this.db.settings.currencySymbol
    );
  }

  // --- Activity & Screen Time Tracking ---

  async getActivitySummary(date?: string): Promise<DailyActivitySummary> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getActivitySummary) {
      try {
        return await (window as any).electronAPI.getActivitySummary(date);
      } catch (err) {
        console.error('Error fetching activity summary from Electron', err);
      }
    }
    const targetDate = date || new Date().toISOString().split('T')[0];
    return {
      date: targetDate,
      totalActiveSeconds: 0,
      totalIdleSeconds: 0,
      deepWorkSeconds: 0,
      categoryBreakdown: {
        development: 0,
        design: 0,
        writing: 0,
        communication: 0,
        research: 0,
        entertainment: 0,
        other: 0,
      },
      topApps: [],
      topProjects: [],
      hourlyActivity: new Array(24).fill(0),
      isTracking: false,
    };
  }

  async toggleActivityTracking(enabled?: boolean): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.toggleActivityTracking) {
      try {
        return await (window as any).electronAPI.toggleActivityTracking(enabled);
      } catch (err) {
        console.error('Error toggling activity tracking', err);
      }
    }
    return false;
  }

  async getActivityStatus(): Promise<ActivityTrackerStatus> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getActivityStatus) {
      try {
        return await (window as any).electronAPI.getActivityStatus();
      } catch (err) {
        console.error('Error getting activity status', err);
      }
    }
    return {
      isTracking: false,
      isIdle: false,
      idleSeconds: 0,
      hasAccessibilityPermission: false,
    };
  }
}

export const localApi = new LocalTrackerApi();
