import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Metric,
  MetricEntry,
  LifeEvent,
  Goal,
  Review,
  Reminder,
  AppSettings,
  AppDatabase,
  UserProfile,
  DailyActivitySummary,
  ActivityTrackerStatus,
} from '../types';
import { localApi } from '../services/localApi';
import { getTodayIso, nextOccurrence } from '../utils/dateUtils';
import { sendDesktopNotification } from '../utils/notifications';

export type ActiveTab = 'today' | 'dashboard' | 'activity' | 'metrics' | 'goals' | 'reviews';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface TrackerContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeDate: string;
  setActiveDate: (date: string) => void;
  isQuickLogOpen: boolean;
  preselectedMetricId?: string;
  openQuickLog: (metricId?: string) => void;
  closeQuickLog: () => void;
  toasts: ToastState[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Profile & Onboarding
  profile: UserProfile | null;
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  saveProfile: (profile: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (data: { profile: Partial<UserProfile>; enabledMetricIds: string[]; goals?: Goal[] }) => Promise<void>;

  // Data
  database: AppDatabase | null;
  metrics: Metric[];
  todayEntries: MetricEntry[];
  todayEvents: LifeEvent[];
  goals: Goal[];
  reminders: Reminder[];
  settings: AppSettings;
  isLoading: boolean;
  storageLocation: string;
  activitySummary: DailyActivitySummary | null;
  activityStatus: ActivityTrackerStatus | null;

  // Actions
  openDataFolder: () => Promise<void>;
  toggleActivityTracking: (enabled?: boolean) => Promise<boolean>;
  logMetric: (metricId: string, value: number, note?: string) => Promise<void>;
  logEvent: (title: string, description?: string, category?: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addReminder: (reminder: Pick<Reminder, 'title' | 'datetime' | 'repeat' | 'notify'>) => Promise<void>;
  editReminder: (id: string, reminder: Pick<Reminder, 'title' | 'datetime' | 'repeat' | 'notify'>) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  toggleReminderNotify: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  saveMetric: (metric: Omit<Metric, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  deleteMetric: (id: string) => Promise<void>;
  saveGoal: (goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  saveReview: (review: Omit<Review, 'id' | 'updatedAt'> & { id?: string }) => Promise<void>;
  resetToBlank: () => Promise<void>;
  resetToSample: () => Promise<void>;
  exportJson: () => Promise<string>;
  importJson: (jsonStr: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

export const TrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [activeDate, setActiveDate] = useState<string>(getTodayIso());
  const [isQuickLogOpen, setIsQuickLogOpen] = useState<boolean>(false);
  const [preselectedMetricId, setPreselectedMetricId] = useState<string | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [todayEntries, setTodayEntries] = useState<MetricEntry[]>([]);
  const [todayEvents, setTodayEvents] = useState<LifeEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    currencySymbol: 'Rs.',
    theme: 'obsidian',
    weekStartsOnMonday: true,
  });
  const [storageLocation, setStorageLocation] = useState<string>('');
  const [activitySummary, setActivitySummary] = useState<DailyActivitySummary | null>(null);
  const [activityStatus, setActivityStatus] = useState<ActivityTrackerStatus | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const openQuickLog = useCallback((metricId?: string) => {
    setPreselectedMetricId(metricId);
    setIsQuickLogOpen(true);
  }, []);

  const closeQuickLog = useCallback(() => {
    setIsQuickLogOpen(false);
    setPreselectedMetricId(undefined);
  }, []);

  const openOnboarding = useCallback(() => {
    setIsOnboardingOpen(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    setIsOnboardingOpen(false);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      await localApi.init();
      const loc = await localApi.getStorageLocation();
      setStorageLocation(loc);

      const db = await localApi.getDatabase();
      setDatabase({ ...db });
      setProfile(db.profile || null);
      setMetrics([...db.metrics]);
      setGoals([...db.goals]);
      setSettings({ ...db.settings });

      // Automatically launch onboarding if user hasn't completed it
      if (!db.profile || !db.profile.onboardingCompleted) {
        setIsOnboardingOpen(true);
      }

      const entries = await localApi.getEntriesForDate(activeDate);
      setTodayEntries(entries);

      const events = await localApi.getEventsForDate(activeDate);
      setTodayEvents(events);

      setReminders(await localApi.getReminders());

      const activity = await localApi.getActivitySummary(activeDate);
      setActivitySummary(activity);

      const status = await localApi.getActivityStatus();
      setActivityStatus(status);
    } catch (e) {
      console.error('Error refreshing tracker data', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDate]);

  // Live polling of activity summary and status when viewing today
  useEffect(() => {
    if (activeDate !== getTodayIso()) return;

    const pollActivity = async () => {
      try {
        const summary = await localApi.getActivitySummary(activeDate);
        setActivitySummary(summary);
        const status = await localApi.getActivityStatus();
        setActivityStatus(status);
      } catch (err) {
        // quiet ignore
      }
    };

    const interval = setInterval(pollActivity, 6000);
    return () => clearInterval(interval);
  }, [activeDate]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Global Keyboard shortcuts: "L" or "Cmd+K" to open quick log, "Esc" to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || (e.shiftKey && e.key.toLowerCase() === 'l'))) {
        e.preventDefault();
        openQuickLog();
      } else if (e.key === 'l' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openQuickLog();
      } else if (e.key === 'Escape' && isQuickLogOpen) {
        closeQuickLog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // If triggered from Tray menu ("+ Quick Log")
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onTriggerQuickLog) {
      (window as any).electronAPI.onTriggerQuickLog(() => {
        openQuickLog();
      });
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openQuickLog, closeQuickLog, isQuickLogOpen]);

  const logMetric = async (metricId: string, value: number, note?: string) => {
    await localApi.logMetricEntry({
      metricId,
      value,
      date: activeDate,
      note,
    });
    const metric = metrics.find((m) => m.id === metricId);
    showToast(`Logged ${metric ? metric.name : 'metric'}`);
    await refreshData();
  };

  const logEvent = async (title: string, description?: string, category?: string) => {
    await localApi.logEvent({
      title,
      description,
      category,
      date: activeDate,
    });
    showToast(`Added highlight: "${title}"`);
    await refreshData();
  };

  const deleteEntry = async (id: string) => {
    await localApi.deleteMetricEntry(id);
    showToast('Entry removed', 'info');
    await refreshData();
  };

  const deleteEvent = async (id: string) => {
    await localApi.deleteEvent(id);
    showToast('Highlight removed', 'info');
    await refreshData();
  };

  const saveMetric = async (metric: Omit<Metric, 'id' | 'createdAt'> & { id?: string }) => {
    await localApi.saveMetric(metric);
    showToast(`Saved metric ${metric.name}`);
    await refreshData();
  };

  const deleteMetric = async (id: string) => {
    await localApi.deleteMetric(id);
    showToast('Metric deleted', 'info');
    await refreshData();
  };

  const saveProfile = async (prof: Partial<UserProfile>) => {
    const updated = await localApi.saveProfile(prof);
    setProfile(updated);
    showToast('Profile updated');
    await refreshData();
  };

  const completeOnboarding = async (data: {
    profile: Partial<UserProfile>;
    enabledMetricIds: string[];
    goals?: Goal[];
  }) => {
    await localApi.completeOnboarding(data);
    setIsOnboardingOpen(false);
    showToast('Welcome to your Personal Operating System!', 'success');
    await refreshData();
  };

  const saveGoal = async (goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string }) => {
    await localApi.saveGoal(goal);
    showToast(`Saved goal: ${goal.title}`);
    await refreshData();
  };

  const deleteGoal = async (id: string) => {
    await localApi.deleteGoal(id);
    showToast('Goal removed', 'info');
    await refreshData();
  };

  const saveReview = async (review: Omit<Review, 'id' | 'updatedAt'> & { id?: string }) => {
    await localApi.saveReview(review);
    showToast('Review saved successfully');
    await refreshData();
  };

  const resetToBlank = async () => {
    await localApi.resetToBlank();
    showToast('Reset to blank slate', 'info');
    setIsOnboardingOpen(true);
    await refreshData();
  };

  const resetToSample = async () => {
    await localApi.resetToSample();
    showToast('Restored sample data', 'info');
    await refreshData();
  };

  const exportJson = async () => {
    return localApi.exportDatabaseJson();
  };

  const importJson = async (jsonStr: string) => {
    const success = await localApi.importDatabaseJson(jsonStr);
    if (success) {
      showToast('Database imported successfully');
      await refreshData();
    } else {
      showToast('Failed to import database', 'error');
    }
    return success;
  };

  const addReminder = async (reminder: Pick<Reminder, 'title' | 'datetime' | 'repeat' | 'notify'>) => {
    await localApi.addReminder(reminder);
    showToast('Reminder added');
    setReminders(await localApi.getReminders());
  };

  const editReminder = async (id: string, reminder: Pick<Reminder, 'title' | 'datetime' | 'repeat' | 'notify'>) => {
    await localApi.updateReminder(id, { ...reminder, notified: false });
    showToast('Reminder updated');
    setReminders(await localApi.getReminders());
  };

  // One-time: check off. Recurring: skip to the next occurrence.
  const completeReminder = async (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (!r) return;
    if (r.repeat === 'none') {
      await localApi.updateReminder(id, { completed: !r.completed });
    } else {
      await localApi.updateReminder(id, { datetime: nextOccurrence(r.datetime, r.repeat, new Date(r.datetime)), notified: false });
    }
    setReminders(await localApi.getReminders());
  };

  const toggleReminderNotify = async (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (!r) return;
    await localApi.updateReminder(id, { notify: !r.notify });
    setReminders(await localApi.getReminders());
  };

  const deleteReminder = async (id: string) => {
    await localApi.deleteReminder(id);
    showToast('Reminder removed', 'info');
    setReminders(await localApi.getReminders());
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await localApi.updateSettings(newSettings);
    setSettings({ ...updated });
    showToast('Settings saved');
  };

  // Reminder scheduler: fire due reminders, then roll recurring ones forward.
  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();
      const all = await localApi.getReminders();
      const due = all.filter((r) => !r.completed && !r.notified && new Date(r.datetime) <= now);
      for (const r of due) {
        if (r.notify) await sendDesktopNotification('MeTric · Reminder', r.title);
        await localApi.updateReminder(
          r.id,
          r.repeat === 'none' ? { notified: true } : { datetime: nextOccurrence(r.datetime, r.repeat, now) }
        );
      }
      if (due.length > 0) setReminders(await localApi.getReminders());
    };

    const interval = setInterval(checkReminders, 15000);
    checkReminders();
    return () => clearInterval(interval);
  }, []);

  const toggleActivityTracking = async (enabled?: boolean) => {
    const res = await localApi.toggleActivityTracking(enabled);
    showToast(res ? 'Screen time tracking resumed' : 'Screen time tracking paused', 'info');
    const status = await localApi.getActivityStatus();
    setActivityStatus(status);
    return res;
  };

  return (
    <TrackerContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeDate,
        setActiveDate,
        isQuickLogOpen,
        preselectedMetricId,
        openQuickLog,
        closeQuickLog,
        toasts,
        showToast,
        profile,
        isOnboardingOpen,
        openOnboarding,
        closeOnboarding,
        saveProfile,
        completeOnboarding,
        database,
        metrics,
        todayEntries,
        todayEvents,
        goals,
        reminders,
        settings,
        isLoading,
        storageLocation,
        activitySummary,
        activityStatus,
        openDataFolder: () => localApi.openDataFolder(),
        toggleActivityTracking,
        logMetric,
        logEvent,
        deleteEntry,
        deleteEvent,
        addReminder,
        editReminder,
        completeReminder,
        toggleReminderNotify,
        deleteReminder,
        updateSettings,
        saveMetric,
        deleteMetric,
        saveGoal,
        deleteGoal,
        saveReview,
        resetToBlank,
        resetToSample,
        exportJson,
        importJson,
        refreshData,
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
};

export const useTracker = () => {
  const context = useContext(TrackerContext);
  if (!context) {
    throw new Error('useTracker must be used within a TrackerProvider');
  }
  return context;
};
