const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onTriggerQuickLog: (callback) => {
    ipcRenderer.on('trigger-quick-log', () => callback());
  },
  loadDatabase: () => ipcRenderer.invoke('storage:load'),
  saveDatabase: (data) => ipcRenderer.invoke('storage:save', data),
  getDbPath: () => ipcRenderer.invoke('storage:getDbPath'),
  openDataFolder: () => ipcRenderer.invoke('storage:openFolder'),
  showNotification: (title, body) => ipcRenderer.invoke('notification:show', { title, body }),
  openNotificationSettings: () => ipcRenderer.invoke('notification:openSettings'),
  getActivitySummary: (date) => ipcRenderer.invoke('activity:getSummary', date),
  toggleActivityTracking: (enabled) => ipcRenderer.invoke('activity:toggle', enabled),
  getActivityStatus: () => ipcRenderer.invoke('activity:getStatus'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (url) => ipcRenderer.invoke('updater:download', url),
  cancelDownload: () => ipcRenderer.invoke('updater:cancel'),
  installUpdate: (customPath) => ipcRenderer.invoke('updater:install', customPath),
  onUpdateProgress: (callback) => {
    ipcRenderer.on('updater:progress', (_, p) => callback(p));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('updater:available', (_, i) => callback(i));
  },
  onOpenUpdateModal: (callback) => {
    ipcRenderer.on('updater:open-modal', () => callback());
  },
  openMainWindow: () => ipcRenderer.invoke('app:openMainWindow'),
  hideTrayPopover: () => ipcRenderer.invoke('tray:hide'),
  isElectron: true,
});
