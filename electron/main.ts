import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { activityTracker } from './activityTracker';
import { appUpdater } from './updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Explicitly set app name and storage path
app.setName('MeTric');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.abhinav.metric');
}
const userDataPath = path.join(app.getPath('appData'), 'MeTric');
app.setPath('userData', userDataPath);

const dbFilePath = path.join(userDataPath, 'database.json');
const backupsDir = path.join(userDataPath, 'backups');

const legacyPath = path.join(app.getPath('appData'), 'Personal KPI');
const legacyDbFilePath = path.join(legacyPath, 'database.json');

function ensureStorageDirs() {
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  // Seamless migration from legacy Personal KPI database
  if (!fs.existsSync(dbFilePath) && fs.existsSync(legacyDbFilePath)) {
    try {
      fs.copyFileSync(legacyDbFilePath, dbFilePath);
      console.log('Successfully migrated database from Personal KPI to MeTric');
    } catch (e) {
      console.error('Failed migrating legacy database', e);
    }
  }
}

// IPC Handlers for Native Filesystem Persistence
ipcMain.handle('storage:load', async () => {
  try {
    ensureStorageDirs();
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('Failed to load database from disk', err);
    return null;
  }
});

ipcMain.handle('storage:save', async (_, data: any) => {
  try {
    ensureStorageDirs();
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');

    // Create automatic daily backup if it does not exist for today
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const backupFile = path.join(backupsDir, `metric-backup-${dateStr}.json`);
    if (!fs.existsSync(backupFile)) {
      fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf-8');
    }

    return true;
  } catch (err) {
    console.error('Failed to save database to disk', err);
    return false;
  }
});

ipcMain.handle('storage:getDbPath', async () => {
  return dbFilePath;
});

ipcMain.handle('storage:openFolder', async () => {
  try {
    ensureStorageDirs();
    if (fs.existsSync(dbFilePath)) {
      shell.showItemInFolder(dbFilePath);
    } else {
      shell.openPath(userDataPath);
    }
    return true;
  } catch (err) {
    console.error('Failed to open folder in Finder', err);
    return false;
  }
});

function triggerMacNotification(title: string, body: string) {
  if (process.platform !== 'darwin') return;
  const safeTitle = (title || 'MeTric').replace(/["\\]/g, '\\$&');
  const safeBody = (body || '').replace(/["\\]/g, '\\$&');
  const script = `display notification "${safeBody}" with title "${safeTitle}" sound name "Glass"`;
  exec(`osascript -e '${script}'`, (err) => {
    if (err) console.error('AppleScript notification fallback error:', err);
  });
}

function getAppNotificationIcon(): string | undefined {
  const candidates = [
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../../public/icon.png'),
    path.join(__dirname, '../build/icon.png'),
    path.join(app.getAppPath(), 'dist/icon.png'),
    path.join(app.getAppPath(), 'build/icon.png'),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

ipcMain.handle('notification:show', async (_, { title, body }: { title: string; body: string }) => {
  let displayed = false;
  try {
    if (Notification.isSupported()) {
      const iconPath = getAppNotificationIcon();
      const notif = new Notification({
        title: title || 'MeTric',
        body: body || '',
        icon: iconPath ? nativeImage.createFromPath(iconPath) : undefined,
        silent: false,
        sound: 'Glass',
      });
      notif.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      });
      notif.show();
      displayed = true;
    }
  } catch (err) {
    console.error('Failed to show native notification', err);
  }

  // Fallback to AppleScript only if native Notification is not supported or failed to display
  if (!displayed && process.platform === 'darwin') {
    triggerMacNotification(title, body);
  }

  return true;
});

ipcMain.handle('notification:openSettings', async () => {
  if (process.platform === 'darwin') {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.notifications');
    return true;
  } else if (process.platform === 'win32') {
    shell.openExternal('ms-settings:notifications');
    return true;
  }
  return false;
});

// Activity Tracking IPC
ipcMain.handle('activity:getSummary', async (_, dateStr?: string) => {
  return activityTracker.getSummaryForDate(dateStr);
});

ipcMain.handle('activity:toggle', async (_, enabled?: boolean) => {
  return activityTracker.toggleTracking(enabled);
});

ipcMain.handle('activity:getStatus', async () => {
  return activityTracker.getStatus();
});

// In-App Auto Updater IPC
ipcMain.handle('updater:check', async () => {
  return appUpdater.checkForUpdates();
});

ipcMain.handle('updater:download', async (_, downloadUrl: string) => {
  return appUpdater.downloadUpdate(downloadUrl, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:progress', progress);
    }
  });
});

ipcMain.handle('updater:install', async (_, customPath?: string) => {
  return appUpdater.installAndRestart(customPath);
});

function createWindow() {
  const iconPngPath = path.join(__dirname, '../build/icon.png');
  const iconIcoPath = path.join(__dirname, '../build/icon.ico');
  const winIcon = process.platform === 'win32' && fs.existsSync(iconIcoPath) ? iconIcoPath : iconPngPath;

  if (app.dock && fs.existsSync(iconPngPath)) {
    try {
      app.dock.setIcon(iconPngPath);
    } catch (e) {
      console.warn('Could not set dock icon:', e);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1140,
    height: 800,
    minWidth: 840,
    minHeight: 620,
    title: 'MeTric',
    icon: fs.existsSync(winIcon) ? winIcon : undefined,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#09090c',
      symbolColor: '#ffffff',
      height: 36,
    } : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 14, y: 13 } : undefined,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distHtmlPath)) {
    mainWindow.loadFile(distHtmlPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  try {
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    tray.setToolTip('MeTric — Track your life');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '+ Quick Log',
        click: () => {
          if (!mainWindow) {
            createWindow();
          } else {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('trigger-quick-log');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Open App Window',
        click: () => {
          if (!mainWindow) {
            createWindow();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'Show Database in Finder',
        click: () => {
          ensureStorageDirs();
          if (fs.existsSync(dbFilePath)) {
            shell.showItemInFolder(dbFilePath);
          } else {
            shell.openPath(userDataPath);
          }
        },
      },
      {
        label: 'Check for Updates...',
        click: () => {
          if (!mainWindow) createWindow();
          mainWindow?.show();
          mainWindow?.focus();
          mainWindow?.webContents.send('updater:open-modal');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide();
      } else {
        if (!mainWindow) createWindow();
        mainWindow?.show();
        mainWindow?.focus();
      }
    });
  } catch (e) {
    console.log('Tray creation note:', e);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  activityTracker.init();

  // Background update check after app startup
  setTimeout(async () => {
    try {
      const updateInfo = await appUpdater.checkForUpdates();
      if (updateInfo.hasUpdate && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:available', updateInfo);
      }
    } catch (err) {
      console.log('Background update check note:', err);
    }
  }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  activityTracker.destroy();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
