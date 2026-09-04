const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusDesktop', {
  platform: process.platform,
  version: '2.0.0',
  isDesktop: true,
  checkUpdates: () => ipcRenderer.invoke('check-updates')
});
