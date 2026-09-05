const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusDesktop', {
  platform: process.platform,
  version: '2.1.0',
  isDesktop: true,
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray')
});
