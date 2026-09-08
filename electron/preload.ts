import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onTriggerQuickLog: (callback: () => void) => {
    ipcRenderer.on('trigger-quick-log', () => callback());
  },
  loadDatabase: () => ipcRenderer.invoke('storage:load'),
  saveDatabase: (data: any) => ipcRenderer.invoke('storage:save', data),
  getDbPath: () => ipcRenderer.invoke('storage:getDbPath'),
  openDataFolder: () => ipcRenderer.invoke('storage:openFolder'),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notification:show', { title, body }),
  openNotificationSettings: () => ipcRenderer.invoke('notification:openSettings'),
  getActivitySummary: (date?: string) => ipcRenderer.invoke('activity:getSummary', date),
  toggleActivityTracking: (enabled?: boolean) => ipcRenderer.invoke('activity:toggle', enabled),
  getActivityStatus: () => ipcRenderer.invoke('activity:getStatus'),
  isElectron: true,
});
