import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Metric,
  MetricEntry,
  LifeEvent,
  DailyNote,
  Goal,
  Review,
  AppSettings,
  AppDatabase,
  UserProfile
} from '../types';
import { localApi } from '../services/localApi';
import { getTodayIso } from '../utils/dateUtils';

export type ActiveTab = 'today' | 'dashboard' | 'metrics' | 'goals' | 'reviews';

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
  todayNote: DailyNote | null;
  goals: Goal[];
  settings: AppSettings;
  isLoading: boolean;
  storageLocation: string;

  // Actions
  openDataFolder: () => Promise<void>;
  logMetric: (metricId: string, value: number, note?: string) => Promise<void>;
  logEvent: (title: string, description?: string, category?: string) => Promise<void>;
  saveNote: (content: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
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
  const [todayNote, setTodayNote] = useState<DailyNote | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    currencySymbol: 'Rs.',
    theme: 'obsidian',
    weekStartsOnMonday: true,
  });
  const [storageLocation, setStorageLocation] = useState<string>('');

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

      const note = await localApi.getDailyNote(activeDate);
      setTodayNote(note);
    } catch (e) {
      console.error('Error refreshing tracker data', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDate]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Global Keyboard shortcuts: "L" or "Cmd+K" to open quick log, "Esc" to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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

    // If running inside Electron, listen for macOS global Cmd+Shift+L shortcut
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

  const saveNote = async (content: string) => {
    await localApi.saveDailyNote(activeDate, content);
    showToast('Daily note saved');
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
        todayNote,
        goals,
        settings,
        isLoading,
        storageLocation,
        openDataFolder: () => localApi.openDataFolder(),
        logMetric,
        logEvent,
        saveNote,
        deleteEntry,
        deleteEvent,
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
