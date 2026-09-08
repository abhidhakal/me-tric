import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onTriggerQuickLog: (callback: () => void) => {
    ipcRenderer.on('trigger-quick-log', () => callback());
  },
  loadDatabase: () => ipcRenderer.invoke('storage:load'),
  saveDatabase: (data: any) => ipcRenderer.invoke('storage:save', data),
  getDbPath: () => ipcRenderer.invoke('storage:getDbPath'),
  openDataFolder: () => ipcRenderer.invoke('storage:openFolder'),
  isElectron: true,
});
