import { app, BrowserWindow, globalShortcut, Menu, Tray, nativeImage, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Explicitly set app name and storage path
app.setName('MeTric');
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
      console.log('Migrated legacy database from Personal KPI to MeTric');
    } catch (e) {
      console.error('Failed to copy legacy database', e);
    }
  }
}

// IPC Handlers for Native Filesystem Persistence
ipcMain.handle('storage:load', async () => {
  try {
    ensureStorageDirs();
    if (fs.existsSync(dbFilePath)) {
      const content = await fs.promises.readFile(dbFilePath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  } catch (err) {
    console.error('Failed to read database file from disk', err);
    return null;
  }
});

ipcMain.handle('storage:save', async (_, dbData: any) => {
  try {
    ensureStorageDirs();
    const serialized = JSON.stringify(dbData, null, 2);
    // Write primary database file
    await fs.promises.writeFile(dbFilePath, serialized, 'utf-8');

    // Write daily rotating backup
    const today = new Date().toISOString().slice(0, 10);
    const backupPath = path.join(backupsDir, `backup-${today}.json`);
    if (!fs.existsSync(backupPath)) {
      await fs.promises.writeFile(backupPath, serialized, 'utf-8');
    }
    return true;
  } catch (err) {
    console.error('Failed to write database file to disk', err);
    return false;
  }
});

ipcMain.handle('storage:getDbPath', () => {
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1140,
    height: 800,
    minWidth: 840,
    minHeight: 620,
    title: 'MeTric',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 13 },
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

  // Register Global System Shortcut (Cmd + Shift + L)
  try {
    globalShortcut.register('CommandOrControl+Shift+L', () => {
      if (!mainWindow) {
        createWindow();
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('trigger-quick-log');
      }
    });
  } catch (e) {
    console.error('Failed to register global shortcut', e);
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
        label: '+ Quick Log (Cmd+Shift+L)',
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
