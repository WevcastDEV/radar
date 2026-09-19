const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('radarDesktop', { onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback) });
