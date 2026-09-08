const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onTriggerQuickLog: (callback) => {
    ipcRenderer.on('trigger-quick-log', () => callback());
  },
  loadDatabase: () => ipcRenderer.invoke('storage:load'),
  saveDatabase: (data) => ipcRenderer.invoke('storage:save', data),
  getDbPath: () => ipcRenderer.invoke('storage:getDbPath'),
  openDataFolder: () => ipcRenderer.invoke('storage:openFolder'),
  isElectron: true,
});
