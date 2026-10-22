const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('triPhotos', {
  openFolder: () => ipcRenderer.invoke('open-folder'),
  restartFolder: () => ipcRenderer.invoke('restart-folder'),
  decide: (action) => ipcRenderer.invoke('decide', action),
  undo: () => ipcRenderer.invoke('undo'),
  openExternal: (index) => ipcRenderer.invoke('open-external', index),
  onTrashError: (callback) => ipcRenderer.on('trash-error', (_event, error) => callback(error)),
});
