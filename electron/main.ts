import { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, shell, Notification, screen } from 'electron';
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
let trayWindow: BrowserWindow | null = null;

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

ipcMain.handle('app:openMainWindow', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  if (trayWindow && !trayWindow.isDestroyed() && trayWindow.isVisible()) {
    trayWindow.hide();
  }
  return true;
});

ipcMain.handle('tray:hide', () => {
  if (trayWindow && !trayWindow.isDestroyed() && trayWindow.isVisible()) {
    trayWindow.hide();
  }
  return true;
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

function createTrayWindow() {
  if (trayWindow && !trayWindow.isDestroyed()) {
    return trayWindow;
  }

  trayWindow = new BrowserWindow({
    width: 360,
    height: 480,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const distHtmlPath = path.join(__dirname, '../dist/index.html');
  if (process.env.VITE_DEV_SERVER_URL) {
    trayWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#tray`);
  } else if (fs.existsSync(distHtmlPath)) {
    trayWindow.loadFile(distHtmlPath, { hash: 'tray' });
  } else {
    trayWindow.loadURL('http://localhost:5173#tray');
  }

  trayWindow.on('blur', () => {
    if (trayWindow && !trayWindow.isDestroyed() && trayWindow.isVisible()) {
      trayWindow.hide();
    }
  });

  trayWindow.on('closed', () => {
    trayWindow = null;
  });

  return trayWindow;
}

function positionTrayWindow() {
  if (!tray || !trayWindow || trayWindow.isDestroyed()) return;
  const trayBounds = tray.getBounds();
  const windowBounds = trayWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const workArea = display.workArea;

  // Center popover horizontally under the tray icon
  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  let y = Math.round(trayBounds.y + trayBounds.height + 4);

  // Prevent overflowing off display bounds
  if (x + windowBounds.width > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - windowBounds.width - 12;
  }
  if (x < workArea.x) {
    x = workArea.x + 12;
  }

  trayWindow.setPosition(x, y, false);
}

function toggleTrayWindow() {
  if (!trayWindow || trayWindow.isDestroyed()) {
    createTrayWindow();
  }
  if (trayWindow?.isVisible()) {
    trayWindow.hide();
  } else {
    positionTrayWindow();
    trayWindow?.show();
    trayWindow?.focus();
  }
}

const TRAY_ICON_1X_B64 = 'iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAEqADAAQAAAABAAAAEgAAAAC5YZBvAAAB+ElEQVQ4EXXTXWiPURwH8LELF5SUvDdvxSWSEsO8TElCecu4kOKGIsWFlESK2IVCcbGSiOQ9koi834wki2JCeV9MIyk+37X91/bffvX5n/Oc53nOc87v/P4lJW0xuK1b1OtlpGfRaIeB7i3X+7XDO9wb6Ho8p3jHOebSaeThTNJENaUs4TZf+cwuFlFDI2fpR1FkcBPP2cgLDlDBOA5zgaUt14+0j+lLp3Hf6BdmsJB7fOAQe8kKL1JGLWfoRklrftLfTRK+hqymkmtU8Yl6yskzB1nFPCooxFC9JnIjX37JUWZxgyu85zyj+UmezSGcoBAb9OoYy28mc5xMuI5RDKCBlWSrp1nBawpbS06uM5MnZN/zyQdSEvvIZGmX84Cs7DuJKa05So305h/Z4hCS5JxOJprGME4ylWf0IaVSzwKaY4zfH2RrObXpPGQ7/algEDe5ykQayXtvSY01R+rhG7NJcqtZzC+WkQNo4C4juEVyOIcsIEVdiEt6x6jkD+WsJys8QvKXFV/mFcNIPpP4dpEX/5J87CBfWkte3skdktxMNJIa3pB/RVHsMZItTmA19Xwk9bKZfGQSydVbkqNOo9ToQVJwW8lqstUtpNpz7LmXGiqjEN0KvfadKpfbyLLryJaS+FqSy7TtoquJ8lAPcsw5yaekhrqM/zETenW1+ddWAAAAAElFTkSuQmCC';
const TRAY_ICON_2X_B64 = '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';

function createTray() {
  try {
    const possiblePaths = [
      path.join(__dirname, '../assets/trayTemplate.png'),
      path.join(__dirname, '../public/trayTemplate.png'),
      path.join(__dirname, '../dist/trayTemplate.png'),
      path.join(__dirname, '../build/trayTemplate.png'),
      path.join(app.getAppPath(), 'assets/trayTemplate.png'),
      path.join(app.getAppPath(), 'public/trayTemplate.png'),
    ];
    const foundPath = possiblePaths.find((p) => fs.existsSync(p));

    let icon: Electron.NativeImage;
    if (foundPath) {
      icon = nativeImage.createFromPath(foundPath);
    } else {
      icon = nativeImage.createEmpty();
      icon.addRepresentation({
        scaleFactor: 1.0,
        buffer: Buffer.from(TRAY_ICON_1X_B64, 'base64'),
      });
      icon.addRepresentation({
        scaleFactor: 2.0,
        buffer: Buffer.from(TRAY_ICON_2X_B64, 'base64'),
      });
    }

    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }

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
        label: 'Open Full MeTric',
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
        label: 'Quit MeTric',
        click: () => {
          app.quit();
        },
      },
    ]);

    // Left click toggles the compact Raycast/Things style popover
    tray.on('click', () => {
      toggleTrayWindow();
    });

    // Right click displays native context menu
    tray.on('right-click', () => {
      tray?.popUpContextMenu(contextMenu);
    });
  } catch (e) {
    console.log('Tray creation note:', e);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  createTrayWindow();
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
