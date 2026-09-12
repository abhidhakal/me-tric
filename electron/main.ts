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
let isQuitting = false;
let lastTrayBlurTime = 0;

app.on('before-quit', () => {
  isQuitting = true;
});

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
const errorLogPath = path.join(userDataPath, 'error.log');

export function logErrorToFile(context: string, err: any) {
  try {
    ensureStorageDirs();
    const timestamp = new Date().toISOString();
    const stack = err instanceof Error ? (err.stack || err.message) : String(err);
    fs.appendFileSync(errorLogPath, `[${timestamp}] [${context}] ${stack}\n`, 'utf-8');
  } catch {}
}

// Global crash prevention: Never let unhandled exceptions or rejections silently kill the app
process.on('uncaughtException', (error) => {
  console.error('CRITICAL: Uncaught Exception in Main Process:', error);
  logErrorToFile('uncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('CRITICAL: Unhandled Rejection in Main Process:', reason);
  logErrorToFile('unhandledRejection', reason);
});

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

ipcMain.handle('updater:cancel', async () => {
  return appUpdater.cancelDownload();
});

ipcMain.handle('updater:install', async (_, customPath?: string) => {
  return appUpdater.installAndRestart(customPath);
});

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }
  if (app.dock) {
    app.dock.show();
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    app.focus({ steal: true });
  }
}

ipcMain.handle('app:openMainWindow', () => {
  showMainWindow();
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

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('Main window render process gone:', details.reason);
    logErrorToFile('mainWindow:render-process-gone', details.reason);
  });

  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distHtmlPath)) {
    mainWindow.loadFile(distHtmlPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Intercept the close event: when clicking red close button on macOS, hide instead of quit
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

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
      backgroundThrottling: false,
    },
  });

  if (process.platform === 'darwin') {
    try {
      trayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      trayWindow.setAlwaysOnTop(true, 'floating');
    } catch (e) {
      console.warn('Could not set trayWindow visible on all workspaces:', e);
    }
  }

  const distHtmlPath = path.join(__dirname, '../dist/index.html');
  if (process.env.VITE_DEV_SERVER_URL) {
    trayWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#tray`).catch((e) => {
      console.warn('Failed loading tray dev URL:', e);
    });
  } else if (fs.existsSync(distHtmlPath)) {
    trayWindow.loadFile(distHtmlPath, { hash: 'tray' }).catch((e) => {
      console.warn('Failed loading tray file:', e);
    });
  } else {
    trayWindow.loadURL('http://localhost:5173#tray').catch((e) => {
      console.warn('Failed loading tray fallback URL:', e);
    });
  }

  trayWindow.on('blur', () => {
    lastTrayBlurTime = Date.now();
    try {
      if (trayWindow && !trayWindow.isDestroyed() && trayWindow.isVisible()) {
        trayWindow.hide();
      }
    } catch {}
  });

  trayWindow.webContents.on('render-process-gone', (_, details) => {
    console.warn('Tray popover render process gone:', details.reason);
    logErrorToFile('trayWindow:render-process-gone', details.reason);
    try {
      if (trayWindow && !trayWindow.isDestroyed()) {
        trayWindow.destroy();
      }
    } catch {}
    trayWindow = null;
  });

  trayWindow.on('closed', () => {
    trayWindow = null;
  });

  return trayWindow;
}

function positionTrayWindow() {
  try {
    if (!tray || !trayWindow || trayWindow.isDestroyed()) return;

    let trayBounds: Electron.Rectangle | null = null;
    try {
      trayBounds = tray.getBounds();
    } catch (e) {
      console.warn('tray.getBounds() note:', e);
    }

    const windowBounds = trayWindow.getBounds();
    const cursor = screen.getCursorScreenPoint();

    // If tray bounds are empty or 0, fallback to current cursor screen point
    if (!trayBounds || (trayBounds.width === 0 && trayBounds.height === 0)) {
      trayBounds = { x: cursor.x - 10, y: cursor.y, width: 20, height: 22 };
    }

    let display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    if (!display || !display.bounds) {
      display = screen.getPrimaryDisplay();
    }
    const bounds = display.bounds;

    // Center popover horizontally under the tray icon
    let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    let y = Math.round(trayBounds.y + trayBounds.height + 4);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = bounds.x + bounds.width - windowBounds.width - 20;
      y = bounds.y + 28;
    }

    if (y < bounds.y) {
      y = bounds.y + 4;
    }

    // Prevent overflowing off display bounds
    if (x + windowBounds.width > bounds.x + bounds.width) {
      x = bounds.x + bounds.width - windowBounds.width - 12;
    }
    if (x < bounds.x) {
      x = bounds.x + 12;
    }

    trayWindow.setPosition(x, y, false);
  } catch (err) {
    console.error('Failed to position tray window:', err);
    logErrorToFile('positionTrayWindow', err);
  }
}

function toggleTrayWindow() {
  try {
    if (!trayWindow || trayWindow.isDestroyed() || trayWindow.webContents.isDestroyed()) {
      createTrayWindow();
    }

    if (!trayWindow || trayWindow.isDestroyed()) return;

    // If it just blurred within the last 350ms, user clicked the tray icon to dismiss it.
    // The blur handler already hid it, so do not immediately re-show.
    const now = Date.now();
    if (now - lastTrayBlurTime < 350) {
      return;
    }

    if (trayWindow.isVisible()) {
      trayWindow.hide();
    } else {
      if (process.platform === 'darwin') {
        try {
          trayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
          trayWindow.setAlwaysOnTop(true, 'floating');
        } catch {}
      }
      positionTrayWindow();
      trayWindow.show();
      trayWindow.focus();

      try {
        if (!trayWindow.webContents.isDestroyed()) {
          trayWindow.webContents.send('tray:shown');
        }
      } catch (err) {
        console.warn('Could not send tray:shown:', err);
      }
    }
  } catch (err) {
    console.error('Failed to toggle tray window:', err);
    logErrorToFile('toggleTrayWindow', err);
  }
}

const TRAY_ICON_1X_B64 = 'iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAEqADAAQAAAABAAAAEgAAAAC5YZBvAAABhUlEQVQ4Ec3SSygFcRTH8fFYkGcIKQkLr1iIkiivjYXcUixtLK0trEQkdT2KWBGl7CzuhpRypYgiIkmxEBFlI6+N7+/fmP40m7u7pz7N/56ZOfM/538dJ9ojkQ2m+Wwyn1y2T95LxXgrx0llHUApBqGCbahCJXJxgzGc40/EWb8SWDehG8+YRKG7fuIaxivGcYsreGEX+iS7hywMYATxqMYXapCHaUxgCy8wYbemRDlWsYg+rOEBzTiGPlLirnXthYnY34V77ee6jkaEoPk0YAedUNEU3EOzTIYJu5Da0It30KA1F53iJTSrUbTjCBV4hD5iwi6kNvWlTLxBx32CD9RDw9W9a5ThDK0wYRf6JqOv5UB5vah2DjCLOexDuzmFiu3ChF1IiTBqsYkeBLEAFdyA2tb8tNMCbMOEffxKqLUuaKhqtQ4r0GmpvQxod8MYgnZmQg//Dw02hGW8owUX0L9auwhgCkvwwq+QbhZhBkk4RDHSoQHPQ/OLKNSOjr0jorei4uEfu/pLip3WUJAAAAAASUVORK5CYII=';
const TRAY_ICON_2X_B64 = 'iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAJKADAAQAAAABAAAAJAAAAAAJxsHGAAAEMElEQVRYCe3VaYhWVRjAcScV07KcXHIpF1zJTFwys0QtRyLUHAVDE5HSSM1ERS1FP2RBKopLi45alopMIW65VCLjihbhuEGUlhqYuzPkMoXb/w/nwMigvu87M/hlHvhxz7n3nnPPPec595YrVxZlM1C6M1Cf7tNK9xG3917+9mqR2gTO/IcTRa4UPZHBqdloh6o4j8so0VhKbz/eocdKnH8amXgHq3CzkFOU56IRihX1aD0TP+EkfEg3xPABH+IwCg8gh3oXjMI6XIXXz+BtpBzmTBP4dvmw022oiIlwKeJAcikvwVS8h454BIYDz0K8dw7le6UIt9w9mnLZTq/g4+ASx8VojRgu33j48ItYja4weuMsvDYLxY6H6eEP2OE0+ObGc5iHX+GyHMJGnEaclc8pOyveey6cH8wx5bCzbPgAH5iH4eiD+FCPJrA7zPAF3kUcmPlUAba5jn9QBynFUFr5QGeoOkaE+jiO0zEJjWF+9YcbwTZGM/gStv8UxnJY/8hKsuEA/sY1vIx05MIOCzAARl9Mw1Z4TdvxOByU+WMf7dEcfteOoyqSCr8tdr4mtFoY6qs4ZsCpH4i18L7N6IW9oe6g0jA21FdwNHLg/S8hqdjC3Tb04Q1xFSav6/8U3E2+rYMaBL/QRjX8DNsOCPU8jiZ1FbjMXnsfCUcN7rwAp/tBTISd+ME0dsO63yDLfgK6I+6gTMpeN6GNPbDeAq+F8iKOCYfrbQc7QguXw3onOBOW98Fog9/hrLiMnVELLp258iwm499wtP4bfJEeSCi6cdf/WI9KsHO3bDMMCeXPOJaHSX0DDlJTYLjrrDuLxhGY3G6OMfDaHCQUlbnLrXkFflMciG/owB6FCZqPnngMK3EYffAAjDirr1N2xxXgKEz0eXBA5l7C4c02mh9aHONoYjugYfBaFown4GCMhzAdXncpzcF4/9eUjZhTpkbC0Yk77TQntFgT6v04miMX4QAzYbTClzA/bJeHzvBn68A8Z70x3J1H4K5LOKpx5ym4VO66mBM7KRsj4UOuYQF8e+vagrZw+b6D51bDcMatf2Il2VhKAxubhCbw/lCfwNHwfD68Jxf+2ZvCqI/18JqzURttYF46e42QdHSkhTNwAibvi3CZrmMsjCfhAD9AC7yKL+CSOpiDaI507IfnJiHlWEZLO3FnGW+gAJ77AQ7AXBgKz0Uu9Vz4z6qFbfDaJvgpSTnq0vJP2NmM0Iv/Ibd5fLi/hQPYDf91o1EPxiuISb2Lck1PFjeepwMf6gC+gQlfEW/CWTqDrxDDWTGfvkcc9LeUq6PE4gV6OgYf8BdGwC1tuAQD4XL8gguIAzlK2eVMQ4lHA3r0TePDzlJeiynILnTez8UGvAWTudQjgyf4fYk7yQFuh7uwJVIeRHGn0YR/Bh1gXsVPAcWyKJuB+zMDtwDd4TsNDQuHGwAAAABJRU5ErkJggg==';

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
          showMainWindow();
          mainWindow?.webContents.send('trigger-quick-log');
        },
      },
      { type: 'separator' },
      {
        label: 'Open Full MeTric',
        click: () => {
          showMainWindow();
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
          showMainWindow();
          mainWindow?.webContents.send('updater:open-modal');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit MeTric',
        click: () => {
          isQuitting = true;
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
    showMainWindow();
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
