import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  FocusSession,
  ActivityCategory,
} from '../types';
import { localApi } from '../services/localApi';
import { getTodayIso, nextOccurrence } from '../utils/dateUtils';
import { sendDesktopNotification } from '../utils/notifications';
import { playFocusCompleteChime } from '../utils/audio';

export type ActiveTab = 'today' | 'plan' | 'progress' | 'reviews' | 'activity';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface ActiveFocusSessionState {
  id: string;
  title: string;
  goalId?: string;
  targetMinutes: number; // 0 for open flow
  elapsedSeconds: number;
  isPaused: boolean;
  startedAt: string;
  contextSwitches: number;
  lastApp?: string;
  appsUsed: Record<string, { appName: string; durationSeconds: number; category: ActivityCategory }>;
  deepWorkSeconds: number;
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

  // Focus Mode
  activeFocusSession: ActiveFocusSessionState | null;
  focusSessions: FocusSession[];
  startFocusSession: (params?: { title?: string; targetMinutes?: number; goalId?: string }) => void;
  pauseFocusSession: () => void;
  resumeFocusSession: () => void;
  stopFocusSession: (cancelled?: boolean) => Promise<FocusSession | null>;
  deleteFocusSession: (id: string) => Promise<void>;
  completedRecapSession: FocusSession | null;
  closeRecapModal: () => void;

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

  // Focus Mode State
  const [activeFocusSession, setActiveFocusSession] = useState<ActiveFocusSessionState | null>(() => {
    try {
      const saved = localStorage.getItem('metric_active_focus');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [completedRecapSession, setCompletedRecapSession] = useState<FocusSession | null>(null);

  const activeFocusSessionRef = useRef<ActiveFocusSessionState | null>(activeFocusSession);
  useEffect(() => {
    activeFocusSessionRef.current = activeFocusSession;
  }, [activeFocusSession]);

  // Sync active focus session to localStorage for persistence & multi-window sync
  useEffect(() => {
    try {
      if (activeFocusSession) {
        localStorage.setItem('metric_active_focus', JSON.stringify(activeFocusSession));
      } else {
        localStorage.removeItem('metric_active_focus');
      }
    } catch {}
  }, [activeFocusSession]);

  // Listen to cross-window storage updates (between Main Window and Menu Bar Tray Window)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'metric_active_focus') {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          setActiveFocusSession(parsed);
        } catch {}
      } else if (e.key === 'metric_focus_recap' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCompletedRecapSession(parsed);
          localStorage.removeItem('metric_focus_recap');
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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

      const entries = await localApi.getEntriesForDate(activeDate);
      setTodayEntries(entries);

      const events = await localApi.getEventsForDate(activeDate);
      setTodayEvents(events);

      setReminders(await localApi.getReminders());

      const activity = await localApi.getActivitySummary(activeDate);
      setActivitySummary(activity);

      const status = await localApi.getActivityStatus();
      setActivityStatus(status);

      const sessions = await localApi.getFocusSessions();
      setFocusSessions(sessions);
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

  // Focus Session live timer & app watcher
  const isFocusRunning = Boolean(activeFocusSession && !activeFocusSession.isPaused);

  const pauseFocusSession = useCallback(() => {
    setActiveFocusSession((prev) => (prev ? { ...prev, isPaused: true } : null));
  }, []);

  const resumeFocusSession = useCallback(() => {
    setActiveFocusSession((prev) => (prev ? { ...prev, isPaused: false } : null));
  }, []);

  const stopFocusSession = useCallback(
    async (cancelled = false): Promise<FocusSession | null> => {
      const current = activeFocusSessionRef.current || activeFocusSession;
      if (!current) return null;

      if (cancelled) {
        setActiveFocusSession(null);
        localStorage.removeItem('metric_active_focus');
        showToast('Flow session cancelled', 'info');
        return null;
      }

      const duration = Math.max(1, current.elapsedSeconds);
      const flow = Math.min(100, Math.round((current.deepWorkSeconds / Math.max(1, duration)) * 100));
      const sortedApps = Object.values(current.appsUsed).sort(
        (a, b) => b.durationSeconds - a.durationSeconds
      );

      const completedSession: FocusSession = {
        id: current.id,
        title: current.title || 'Flow',
        goalId: current.goalId,
        targetMinutes: current.targetMinutes,
        actualDurationSeconds: duration,
        startedAt: current.startedAt,
        endedAt: new Date().toISOString(),
        date: getTodayIso(),
        flowScore: flow,
        contextSwitches: current.contextSwitches,
        appsUsed: sortedApps,
        completed: current.targetMinutes === 0 || duration >= current.targetMinutes * 60,
      };

      await localApi.saveFocusSession(completedSession);
      setFocusSessions((prev) => [completedSession, ...prev]);
      setActiveFocusSession(null);
      localStorage.removeItem('metric_active_focus');
      setCompletedRecapSession(completedSession);

      try {
        localStorage.setItem('metric_focus_recap', JSON.stringify(completedSession));
        (window as any).electronAPI?.openMainWindow?.();
      } catch {}

      playFocusCompleteChime();
      sendDesktopNotification(
        'Flow Session Completed!',
        `${completedSession.title} · ${Math.floor(duration / 60)}m logged with ${flow}% flow score.`
      );

      return completedSession;
    },
    [activeFocusSession, showToast]
  );

  const startFocusSession = useCallback(
    (params?: { title?: string; targetMinutes?: number; goalId?: string }) => {
      const targetMins = params?.targetMinutes !== undefined ? params.targetMinutes : 25;
      const sessionTitle = params?.title?.trim() || 'Flow';
      const initialApp = activityStatus?.currentApp || 'Workspace';
      const initialCat = activityStatus?.currentCategory || 'development';

      const newSession: ActiveFocusSessionState = {
        id: `focus-${Date.now()}`,
        title: sessionTitle,
        goalId: params?.goalId,
        targetMinutes: targetMins,
        elapsedSeconds: 0,
        isPaused: false,
        startedAt: new Date().toISOString(),
        contextSwitches: 0,
        lastApp: initialApp,
        appsUsed: {
          [initialApp]: {
            appName: initialApp,
            durationSeconds: 0,
            category: initialCat,
          },
        },
        deepWorkSeconds: 0,
      };

      setActiveFocusSession(newSession);
      showToast(`Started Flow: ${sessionTitle} (${targetMins > 0 ? `${targetMins}m` : 'Open'})`, 'info');
    },
    [activityStatus, showToast]
  );

  useEffect(() => {
    if (!isFocusRunning) return;

    const interval = setInterval(() => {
      setActiveFocusSession((prev) => {
        if (!prev || prev.isPaused) return prev;

        const newElapsed = prev.elapsedSeconds + 1;
        const currentApp = activityStatus?.currentApp || prev.lastApp || 'Workspace';
        const currentCat = activityStatus?.currentCategory || 'development';
        const isDeep = currentCat === 'development' || currentCat === 'design' || currentCat === 'writing';

        let switches = prev.contextSwitches;
        if (prev.lastApp && currentApp !== prev.lastApp) {
          switches += 1;
        }

        const appMap = { ...prev.appsUsed };
        if (!appMap[currentApp]) {
          appMap[currentApp] = { appName: currentApp, durationSeconds: 0, category: currentCat };
        }
        appMap[currentApp].durationSeconds += 1;

        const newDeepSeconds = isDeep ? prev.deepWorkSeconds + 1 : prev.deepWorkSeconds;

        // When countdown reaches target: automatically finish and open recap modal!
        if (prev.targetMinutes > 0 && newElapsed >= prev.targetMinutes * 60) {
          setTimeout(() => {
            stopFocusSession(false);
          }, 30);
        }

        return {
          ...prev,
          elapsedSeconds: newElapsed,
          contextSwitches: switches,
          lastApp: currentApp,
          appsUsed: appMap,
          deepWorkSeconds: newDeepSeconds,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isFocusRunning, activityStatus?.currentApp, activityStatus?.currentCategory, stopFocusSession]);

  // Synchronize macOS menu bar text with active flow session
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.setTrayTitle) return;

    if (!activeFocusSession) {
      api.setTrayTitle('');
      return;
    }

    if (activeFocusSession.isPaused) {
      api.setTrayTitle('Paused');
      return;
    }

    if (activeFocusSession.targetMinutes > 0) {
      const remainingSecs = Math.max(0, activeFocusSession.targetMinutes * 60 - activeFocusSession.elapsedSeconds);
      const m = Math.floor(remainingSecs / 60);
      const s = remainingSecs % 60;
      api.setTrayTitle(`${m}:${String(s).padStart(2, '0')}`);
    } else {
      const m = Math.floor(activeFocusSession.elapsedSeconds / 60);
      api.setTrayTitle(`${m}m`);
    }

    return () => {
      api.setTrayTitle?.('');
    };
  }, [activeFocusSession?.elapsedSeconds, activeFocusSession?.isPaused, activeFocusSession?.targetMinutes]);

  // Synchronize state with Native macOS Desktop Widget (widget-data.json)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.syncWidgetData) return;

    try {
      const metricsList = metrics.slice(0, 4).map((m) => {
        const mEntries = todayEntries.filter((e) => e.metricId === m.id);
        const totalVal = mEntries.reduce((sum, e) => sum + e.value, 0);

        let valueFormatted = String(totalVal);
        let targetFormatted: string | null = null;
        let percent = 0;

        if (m.type === 'duration') {
          const hours = (totalVal / 60).toFixed(1).replace(/\.0$/, '');
          valueFormatted = `${hours}h`;
          if (m.targetValue) {
            const targetHours = (m.targetValue / 60).toFixed(1).replace(/\.0$/, '');
            targetFormatted = `${targetHours}h`;
            percent = Math.min(100, Math.round((totalVal / m.targetValue) * 100));
          }
        } else {
          valueFormatted = String(totalVal);
          if (m.targetValue) {
            targetFormatted = `${m.targetValue}${m.unit ? ` ${m.unit}` : ''}`;
            percent = Math.min(100, Math.round((totalVal / m.targetValue) * 100));
          }
        }

        return {
          id: m.id,
          name: m.name,
          valueFormatted,
          targetFormatted,
          percent,
          isCompleted: percent >= 100,
        };
      });

      const totalActiveSecs = activitySummary?.totalActiveSeconds || 0;
      const deepWorkSecs = activitySummary?.deepWorkSeconds || 0;
      const activeHours = (totalActiveSecs / 3600).toFixed(1).replace(/\.0$/, '');
      const deepPercent = totalActiveSecs > 0 ? Math.round((deepWorkSecs / totalActiveSecs) * 100) : 0;

      const widgetPayload = {
        updatedAt: new Date().toISOString(),
        dateFormatted: new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        flow: activeFocusSession ? {
          isActive: true,
          isPaused: activeFocusSession.isPaused,
          title: activeFocusSession.title || 'Flow',
          elapsedSeconds: activeFocusSession.elapsedSeconds,
          targetMinutes: activeFocusSession.targetMinutes,
          flowScore: Math.min(100, Math.round((activeFocusSession.deepWorkSeconds / Math.max(1, activeFocusSession.elapsedSeconds)) * 100)),
          contextSwitches: activeFocusSession.contextSwitches,
        } : null,
        metrics: metricsList,
        summary: {
          activeHoursFormatted: `${activeHours}h`,
          deepWorkPercent: deepPercent,
          completedGoalsCount: goals.length,
        },
      };

      api.syncWidgetData(widgetPayload);
    } catch (e) {
      console.warn('Failed to sync widget data', e);
    }
  }, [
    activeFocusSession?.elapsedSeconds,
    activeFocusSession?.isPaused,
    activeFocusSession?.title,
    metrics,
    todayEntries,
    activitySummary,
    goals,
  ]);

  const deleteFocusSession = useCallback(
    async (id: string) => {
      await localApi.deleteFocusSession(id);
      setFocusSessions((prev) => prev.filter((s) => s.id !== id));
      showToast('Flow session deleted', 'info');
    },
    [showToast]
  );

  const closeRecapModal = useCallback(() => {
    setCompletedRecapSession(null);
  }, []);

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
        activeFocusSession,
        focusSessions,
        startFocusSession,
        pauseFocusSession,
        resumeFocusSession,
        stopFocusSession,
        deleteFocusSession,
        completedRecapSession,
        closeRecapModal,
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
