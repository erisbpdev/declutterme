const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Organize
  declutter: (folderPath) => ipcRenderer.invoke('declutter', folderPath),
  undoLast: () => ipcRenderer.invoke('undo-last'),

  // Folder
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),

  // Auto mode
  toggleAutoMode: (folderPath) => ipcRenderer.invoke('toggle-auto-mode', folderPath),
  getAutoStatus: () => ipcRenderer.invoke('get-auto-status'),

  // Settings
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  getDefaultCategories: () => ipcRenderer.invoke('get-default-categories'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Events from main process
  onAutoOrganize: (callback) => ipcRenderer.on('auto-organized', (_, data) => callback(data)),
  onNotification: (callback) => ipcRenderer.on('notification', (_, data) => callback(data)),
});
