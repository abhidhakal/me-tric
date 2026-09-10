import { AppDatabase } from '../types';
import { createInitialDatabase } from '../utils/sampleData';

const STORAGE_KEY = 'metric_db_v1';
const LEGACY_STORAGE_KEY = 'personal_kpi_db_v1';
const BACKUP_KEY_PREFIX = 'metric_backup_';

declare global {
  interface Window {
    electronAPI?: {
      onTriggerQuickLog: (callback: () => void) => void;
      loadDatabase: () => Promise<AppDatabase | null>;
      saveDatabase: (data: AppDatabase) => Promise<boolean>;
      getDbPath: () => Promise<string>;
      openDataFolder: () => Promise<boolean>;
      showNotification?: (title: string, body: string) => Promise<boolean>;
      openNotificationSettings?: () => Promise<boolean>;
      openMainWindow?: () => Promise<boolean>;
      hideTrayPopover?: () => Promise<boolean>;
      isElectron: boolean;
    };
  }
}

export class MacDiskStorageAdapter {
  private static cachedDb: AppDatabase | null = null;

  static async load(): Promise<AppDatabase> {
    try {
      // 1. If running inside native Electron on Mac, read from real filesystem
      if (typeof window !== 'undefined' && window.electronAPI?.loadDatabase) {
        const diskData = await window.electronAPI.loadDatabase();
        if (diskData && diskData.metrics && Array.isArray(diskData.entries)) {
          this.cachedDb = diskData;
          return diskData;
        }
        // First run on Mac disk: initialize with starter database
        const initial = createInitialDatabase();
        await window.electronAPI.saveDatabase(initial);
        this.cachedDb = initial;
        return initial;
      }

      // 2. Web browser fallback (localStorage)
      let data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        data = localStorage.getItem(LEGACY_STORAGE_KEY);
      }
      if (!data) {
        const initial = createInitialDatabase();
        this.save(initial);
        this.cachedDb = initial;
        return initial;
      }
      const parsed = JSON.parse(data) as AppDatabase;
      if (!parsed.metrics || !parsed.entries) {
        throw new Error('Corrupted storage structure');
      }
      this.cachedDb = parsed;
      return parsed;
    } catch (e) {
      console.error('Failed to load database, creating default', e);
      const initial = createInitialDatabase();
      await this.save(initial);
      this.cachedDb = initial;
      return initial;
    }
  }

  static async save(db: AppDatabase): Promise<void> {
    this.cachedDb = db;
    try {
      // 1. If running inside native Electron on Mac, write directly to disk
      if (typeof window !== 'undefined' && window.electronAPI?.saveDatabase) {
        await window.electronAPI.saveDatabase(db);
        return;
      }

      // 2. Web browser fallback
      const serialized = JSON.stringify(db);
      localStorage.setItem(STORAGE_KEY, serialized);

      // Auto snapshot once a day in localStorage
      const todayKey = `${BACKUP_KEY_PREFIX}${new Date().toISOString().slice(0, 10)}`;
      if (!localStorage.getItem(todayKey)) {
        localStorage.setItem(todayKey, serialized);
      }
    } catch (e) {
      console.error('Failed to save database', e);
    }
  }

  static async openDataFolder(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.openDataFolder) {
      await window.electronAPI.openDataFolder();
    }
  }

  static async getStorageLocation(): Promise<string> {
    if (typeof window !== 'undefined' && window.electronAPI?.getDbPath) {
      return await window.electronAPI.getDbPath();
    }
    return 'Browser LocalStorage (Local-First)';
  }

  static exportJson(db: AppDatabase): string {
    return JSON.stringify(db, null, 2);
  }

  static async importJson(jsonStr: string): Promise<AppDatabase> {
    const parsed = JSON.parse(jsonStr) as AppDatabase;
    if (!parsed.metrics || !Array.isArray(parsed.entries)) {
      throw new Error('Invalid JSON schema for MeTric');
    }
    await this.save(parsed);
    return parsed;
  }

  static async clear(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.saveDatabase) {
      // Save empty structure
      const empty: AppDatabase = {
        version: 1,
        profile: {
          name: '',
          occupation: '',
          currency: 'Rs.',
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        settings: { currencySymbol: 'Rs.', theme: 'obsidian' as const, weekStartsOnMonday: true },
        metrics: [],
        entries: [],
        events: [],
        notes: [],
        goals: [],
        reviews: [],
      };
      await window.electronAPI.saveDatabase(empty);
    }
    localStorage.removeItem(STORAGE_KEY);
  }
}
