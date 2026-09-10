const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusDesktop', {
  platform: process.platform,
  version: '2.2.0',
  isDesktop: true,
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  applyUpdate: (filePath) => ipcRenderer.invoke('apply-update', { filePath }),
  startServices: () => ipcRenderer.invoke('start-services'),
  getServicesStatus: () => ipcRenderer.invoke('get-services-status'),
  selectProjectFolder: () => ipcRenderer.invoke('select-project-folder')
});
