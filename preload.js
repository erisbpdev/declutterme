const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Organize
  declutter: (folderPath, options) => ipcRenderer.invoke('declutter', folderPath, options),
  setFilePinned: (filePath, pinned) => ipcRenderer.invoke('set-file-pinned', filePath, pinned),
  previewDeclutter: (folderPath) => ipcRenderer.invoke('preview-declutter', folderPath),
  undoLast: () => ipcRenderer.invoke('undo-last'),
  getUndoDepth: () => ipcRenderer.invoke('get-undo-depth'),

  // Folder
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),
  validateFolder: (folderPath) => ipcRenderer.invoke('validate-folder', folderPath),

  // Auto mode
  toggleAutoMode: (folderPath) => ipcRenderer.invoke('toggle-auto-mode', folderPath),
  getAutoStatus: () => ipcRenderer.invoke('get-auto-status'),

  // Schedule
  toggleSchedule: (folderPath, intervalKey) => ipcRenderer.invoke('toggle-schedule', folderPath, intervalKey),
  setScheduleInterval: (folderPath, intervalKey) => ipcRenderer.invoke('set-schedule-interval', folderPath, intervalKey),
  getScheduleStatus: () => ipcRenderer.invoke('get-schedule-status'),

  // Empty folder cleanup
  cleanEmptyFolders: (folderPath) => ipcRenderer.invoke('clean-empty-folders', folderPath),

  // Stats
  getStats: () => ipcRenderer.invoke('get-stats'),
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),

  // Settings
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  getDefaultCategories: () => ipcRenderer.invoke('get-default-categories'),
  previewTheme: (theme) => ipcRenderer.invoke('preview-theme', theme),

  // Updates
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateState: (callback) => ipcRenderer.on('update-state', (_, state) => callback(state)),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Events from main process
  onAutoOrganize: (callback) => ipcRenderer.on('auto-organized', (_, data) => callback(data)),
});
