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
  isElectron: true,
});
