import { powerMonitor, app } from 'electron';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {
  ActivityCategory,
  ActivityAppStat,
  ActivityProjectStat,
  DailyActivitySummary,
  ActivityTrackerStatus,
} from '../src/types';

const execFileAsync = promisify(execFile);

// JXA script to query frontmost application, bundle ID, and active window title
const GET_FRONT_APP_JXA = `
ObjC.import("AppKit");
(() => {
  const frontApp = $.NSWorkspace.sharedWorkspace.frontmostApplication;
  if (!frontApp) return JSON.stringify({ app: "", bundleId: "", title: "" });
  const appName = frontApp.localizedName.js || "";
  const bundleId = frontApp.bundleIdentifier.js || "";
  let title = "";
  try {
    const se = Application("System Events");
    const procs = se.applicationProcesses.whose({ frontmost: true });
    if (procs.length > 0) {
      const wins = procs[0].windows();
      if (wins.length > 0) {
        title = wins[0].name() || "";
      }
    }
  } catch (e) {}
  return JSON.stringify({ app: appName, bundleId: bundleId, title: title });
})()
`;

// Helper: Get Today's YYYY-MM-DD in local time
function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class ActivityTracker {
  private isTracking = true;
  private timer: NodeJS.Timeout | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private currentSummary: DailyActivitySummary | null = null;
  private currentApp = '';
  private currentCategory: ActivityCategory = 'other';
  private currentProject = '';
  private isIdle = false;
  private idleSeconds = 0;
  private hasAccessibility = false;
  private isDirty = false;
  private storageDir: string;

  constructor() {
    this.storageDir = path.join(app.getPath('userData'), 'activity');
    if (!fs.existsSync(this.storageDir)) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create activity storage directory', err);
      }
    }
  }

  public init() {
    this.loadTodaySummary();
    this.startTracking();

    // Flush to disk every 20 seconds if modified
    this.flushTimer = setInterval(() => {
      if (this.isDirty) {
        this.saveCurrentSummary();
      }
    }, 20000);
  }

  public destroy() {
    this.stopTracking();
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.saveCurrentSummary();
  }

  public startTracking() {
    if (this.timer) clearInterval(this.timer);
    this.isTracking = true;
    this.timer = setInterval(() => this.tick(), 2000);
  }

  public stopTracking() {
    this.isTracking = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.saveCurrentSummary();
  }

  public toggleTracking(enabled?: boolean): boolean {
    const nextState = enabled !== undefined ? enabled : !this.isTracking;
    if (nextState) {
      this.startTracking();
    } else {
      this.stopTracking();
    }
    return this.isTracking;
  }

  public getStatus(): ActivityTrackerStatus {
    return {
      isTracking: this.isTracking,
      isIdle: this.isIdle,
      idleSeconds: this.idleSeconds,
      currentApp: this.currentApp,
      currentCategory: this.currentCategory,
      currentProject: this.currentProject || undefined,
      hasAccessibilityPermission: this.hasAccessibility,
    };
  }

  public getSummaryForDate(dateStr?: string): DailyActivitySummary {
    const targetDate = dateStr || getTodayIso();
    if (this.currentSummary && this.currentSummary.date === targetDate) {
      return { ...this.currentSummary, isTracking: this.isTracking };
    }

    const filePath = path.join(this.storageDir, `${targetDate}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      } catch (err) {
        console.error(`Failed to read activity for ${targetDate}`, err);
      }
    }

    return this.createEmptySummary(targetDate);
  }

  private loadTodaySummary() {
    const today = getTodayIso();
    this.currentSummary = this.getSummaryForDate(today);
  }

  private saveCurrentSummary() {
    if (!this.currentSummary) return;
    try {
      const filePath = path.join(this.storageDir, `${this.currentSummary.date}.json`);
      fs.writeFileSync(filePath, JSON.stringify(this.currentSummary, null, 2), 'utf-8');
      this.isDirty = false;
    } catch (err) {
      console.error('Failed to save activity summary', err);
    }
  }

  private createEmptySummary(dateStr: string): DailyActivitySummary {
    return {
      date: dateStr,
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
      isTracking: this.isTracking,
    };
  }

  private async tick() {
    if (!this.isTracking) return;

    const today = getTodayIso();
    if (!this.currentSummary || this.currentSummary.date !== today) {
      this.saveCurrentSummary();
      this.loadTodaySummary();
    }

    if (!this.currentSummary) return;

    // 1. Idle Detection via Electron powerMonitor
    const idleSeconds = powerMonitor.getSystemIdleTime();
    this.idleSeconds = idleSeconds;

    // If user has been idle for more than 180 seconds (3 minutes), record idle time
    if (idleSeconds >= 180) {
      this.isIdle = true;
      this.currentSummary.totalIdleSeconds += 2;
      this.isDirty = true;
      return;
    }

    this.isIdle = false;

    // 2. Query Frontmost Window & App
    try {
      const { stdout } = await execFileAsync('/usr/bin/osascript', ['-l', 'JavaScript', '-e', GET_FRONT_APP_JXA]);
      const data = JSON.parse(stdout.trim());
      const appName = data.app?.trim() || 'Unknown';
      const bundleId = data.bundleId?.trim() || '';
      const windowTitle = data.title?.trim() || '';

      if (windowTitle) {
        this.hasAccessibility = true;
      }

      this.currentApp = appName;

      // Classify Category & Project
      const category = this.categorize(appName, bundleId, windowTitle);
      const project = this.extractProject(appName, windowTitle);

      this.currentCategory = category;
      this.currentProject = project;

      // Accumulate Active Time (2 seconds step)
      this.currentSummary.totalActiveSeconds += 2;
      this.currentSummary.categoryBreakdown[category] = (this.currentSummary.categoryBreakdown[category] || 0) + 2;

      // Deep Work is Development, Design, or Writing
      if (category === 'development' || category === 'design' || category === 'writing') {
        this.currentSummary.deepWorkSeconds += 2;
      }

      // Hourly Activity
      const currentHour = new Date().getHours();
      this.currentSummary.hourlyActivity[currentHour] = (this.currentSummary.hourlyActivity[currentHour] || 0) + 2;

      // Update Top Apps
      const existingApp = this.currentSummary.topApps.find((a) => a.appName === appName);
      if (existingApp) {
        existingApp.durationSeconds += 2;
        existingApp.category = category;
      } else {
        this.currentSummary.topApps.push({ appName, durationSeconds: 2, category });
      }
      this.currentSummary.topApps.sort((a, b) => b.durationSeconds - a.durationSeconds);

      // Update Top Projects
      if (project) {
        const existingProject = this.currentSummary.topProjects.find((p) => p.project === project);
        if (existingProject) {
          existingProject.durationSeconds += 2;
        } else {
          this.currentSummary.topProjects.push({ project, durationSeconds: 2 });
        }
        this.currentSummary.topProjects.sort((a, b) => b.durationSeconds - a.durationSeconds);
      }

      this.isDirty = true;
    } catch (err) {
      // Graceful ignore on osascript transient failure
    }
  }

  private categorize(appName: string, bundleId: string, title: string): ActivityCategory {
    const lowerApp = appName.toLowerCase();
    const lowerBundle = bundleId.toLowerCase();
    const lowerTitle = title.toLowerCase();

    // Development
    if (
      lowerBundle.includes('vscode') ||
      lowerBundle.includes('antigravity') ||
      lowerBundle.includes('cursor') ||
      lowerBundle.includes('xcode') ||
      lowerBundle.includes('jetbrains') ||
      lowerBundle.includes('sublime') ||
      lowerBundle.includes('github') ||
      lowerApp.includes('code') ||
      lowerApp.includes('terminal') ||
      lowerApp.includes('iterm') ||
      lowerApp.includes('warp') ||
      lowerApp.includes('xcode') ||
      lowerApp.includes('ghostty') ||
      lowerApp.includes('alacritty') ||
      lowerApp.includes('cursor') ||
      lowerApp.includes('intellij') ||
      lowerApp.includes('pycharm') ||
      lowerApp.includes('webstorm')
    ) {
      return 'development';
    }

    // Design
    if (
      lowerBundle.includes('figma') ||
      lowerBundle.includes('sketch') ||
      lowerBundle.includes('blender') ||
      lowerBundle.includes('adobe') ||
      lowerApp.includes('figma') ||
      lowerApp.includes('sketch') ||
      lowerApp.includes('photoshop') ||
      lowerApp.includes('illustrator') ||
      lowerApp.includes('blender') ||
      lowerApp.includes('canva')
    ) {
      return 'design';
    }

    // Writing / Planning
    if (
      lowerBundle.includes('notion') ||
      lowerBundle.includes('obsidian') ||
      lowerBundle.includes('linear') ||
      lowerApp.includes('notion') ||
      lowerApp.includes('obsidian') ||
      lowerApp.includes('linear') ||
      lowerApp.includes('bear') ||
      lowerApp.includes('notes') ||
      lowerApp.includes('word') ||
      lowerApp.includes('pages')
    ) {
      return 'writing';
    }

    // Communication
    if (
      lowerBundle.includes('slack') ||
      lowerBundle.includes('discord') ||
      lowerBundle.includes('telegram') ||
      lowerBundle.includes('mail') ||
      lowerBundle.includes('zoom') ||
      lowerBundle.includes('teams') ||
      lowerApp.includes('slack') ||
      lowerApp.includes('discord') ||
      lowerApp.includes('telegram') ||
      lowerApp.includes('mail') ||
      lowerApp.includes('messages') ||
      lowerApp.includes('zoom') ||
      lowerApp.includes('teams') ||
      lowerApp.includes('whatsapp')
    ) {
      return 'communication';
    }

    // Entertainment
    if (
      lowerBundle.includes('spotify') ||
      lowerBundle.includes('steam') ||
      lowerApp.includes('spotify') ||
      lowerApp.includes('music') ||
      lowerApp.includes('steam') ||
      lowerApp.includes('netflix') ||
      lowerTitle.includes('youtube') ||
      lowerTitle.includes('netflix') ||
      lowerTitle.includes('twitch') ||
      lowerTitle.includes('twitter') ||
      lowerTitle.includes('reddit') ||
      lowerTitle.includes('x.com') ||
      lowerTitle.includes('instagram') ||
      lowerTitle.includes('tiktok')
    ) {
      return 'entertainment';
    }

    // Browsers: classify further by window title
    const isBrowser =
      lowerBundle.includes('chrome') ||
      lowerBundle.includes('brave') ||
      lowerBundle.includes('safari') ||
      lowerBundle.includes('arc') ||
      lowerBundle.includes('firefox') ||
      lowerApp.includes('chrome') ||
      lowerApp.includes('brave') ||
      lowerApp.includes('safari') ||
      lowerApp.includes('arc') ||
      lowerApp.includes('firefox');

    if (isBrowser) {
      if (
        lowerTitle.includes('github') ||
        lowerTitle.includes('gitlab') ||
        lowerTitle.includes('stack overflow') ||
        lowerTitle.includes('localhost') ||
        lowerTitle.includes('127.0.0.1') ||
        lowerTitle.includes('pull request') ||
        lowerTitle.includes('developer.') ||
        lowerTitle.includes('docs.') ||
        lowerTitle.includes('npm')
      ) {
        return 'development';
      }
      if (lowerTitle.includes('figma')) return 'design';
      if (lowerTitle.includes('notion') || lowerTitle.includes('linear') || lowerTitle.includes('docs.google.com')) return 'writing';
      if (lowerTitle.includes('slack') || lowerTitle.includes('mail.google.com') || lowerTitle.includes('discord')) return 'communication';
      return 'research';
    }

    return 'other';
  }

  private extractProject(appName: string, title: string): string {
    if (!title) return '';

    // VS Code / Cursor: "FileName — ProjectName — Visual Studio Code" or "FileName — ProjectName"
    const vscodeMatch = title.match(/^(?:.*?—\s*)?([a-zA-Z0-9_.-]+)\s*—\s*(?:Visual Studio Code|Code|Cursor|Antigravity IDE)/i);
    if (vscodeMatch && vscodeMatch[1]) {
      return vscodeMatch[1].trim();
    }

    // Terminal / iTerm: "[ProjectName] — zsh" or "user@host: ~/path/project"
    const termMatch = title.match(/\[([a-zA-Z0-9_.-]+)\]/);
    if (termMatch && termMatch[1]) {
      return termMatch[1].trim();
    }

    // GitHub repository in browser: "repoName: ..." or "... · owner/repo"
    const githubMatch = title.match(/[•·]\s*([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)/);
    if (githubMatch && githubMatch[1]) {
      return githubMatch[1].trim();
    }

    return '';
  }
}

export const activityTracker = new ActivityTracker();
