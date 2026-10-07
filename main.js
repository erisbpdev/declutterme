const { app, BrowserWindow, ipcMain, dialog, Notification, globalShortcut, nativeTheme } = require('electron');
const path = require('path');
const { organizeFolder, undoOrganize, cleanEmptyFolders } = require('./src/organizer');
const { startWatching, stopWatching, isWatching } = require('./src/watcher');
const { createTray, updateTrayMenu, destroyTray } = require('./src/tray');
const config = require('./src/config');
const stats = require('./src/stats');
const { getAllCategories } = require('./src/categories');
const updater = require('./src/updater');

let mainWindow = null;
let undoStack = []; // Multi-level undo (max 10 batches)
const MAX_UNDO_LEVELS = 10;
let autoModeFolder = null;
let scheduleTimer = null;
// True once the app is really quitting (tray Quit, installing an update) —
// the close handler must not just hide the window then
let isQuitting = false;

const SCHEDULE_INTERVALS = {
  'hourly': 60 * 60 * 1000,
  '6hours': 6 * 60 * 60 * 1000,
  'daily': 24 * 60 * 60 * 1000,
  'weekly': 7 * 24 * 60 * 60 * 1000
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 540,
    height: 720,
    minWidth: 440,
    minHeight: 600,
    resizable: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    if (!isQuitting && (isWatching() || scheduleTimer)) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  createTray(mainWindow, trayHandlers());

  registerGlobalHotkey();
}

function trayHandlers() {
  return {
    onDeclutter: () => runOrganize(autoModeFolder || app.getPath('desktop'), { notifyTidy: true }),
    onToggleAuto: () => toggleAuto(autoModeFolder || app.getPath('desktop')),
    isAutoOn: isWatching()
  };
}

function pushUndo(moved) {
  undoStack.push([...moved]);
  if (undoStack.length > MAX_UNDO_LEVELS) {
    undoStack.shift();
  }
}

// Shared bookkeeping for every organize that moved files
function recordResults(results, label) {
  if (results.moved.length === 0) return;
  pushUndo(results.moved);
  stats.recordOrganize(results);
  showNotification(`${label}${results.moved.length} files!`);
  if (mainWindow) {
    mainWindow.webContents.send('auto-organized', results);
  }
}

// Organize from tray / hotkey / schedule (not the in-window button)
async function runOrganize(folder, { label = 'Organized ', notifyTidy = false } = {}) {
  try {
    const results = await organizeFolder(folder);
    if (results.moved.length > 0) {
      recordResults(results, label);
    } else if (notifyTidy) {
      showNotification('Already tidy!');
    }
    return results;
  } catch (err) {
    console.error('Organize error:', err);
    showNotification(`Couldn't organize: ${err.message}`);
    return null;
  }
}

function toggleAuto(folder) {
  if (isWatching()) {
    stopWatching();
    showNotification('Auto mode disabled');
  } else {
    autoModeFolder = folder;
    startWatching(folder, (results) => recordResults(results, 'Auto-organized '));
    showNotification('Auto mode enabled');
  }

  updateTrayMenu(mainWindow, trayHandlers());
}

// Drives prefers-color-scheme in the renderer (and native scrollbars/menus)
function applyTheme(theme) {
  nativeTheme.themeSource = ['light', 'dark'].includes(theme) ? theme : 'system';
}

function showNotification(body) {
  if (Notification.isSupported()) {
    new Notification({ title: 'DeclutterMe', body }).show();
  }
}

// Global hotkey — returns true if registered
function registerGlobalHotkey() {
  const cfg = config.get();
  const hotkey = (cfg.globalHotkey) || 'CommandOrControl+Shift+D';

  globalShortcut.unregisterAll();
  let ok = false;
  try {
    // register() returns false (doesn't throw) when another app owns the combo
    ok = globalShortcut.register(hotkey, () => {
      runOrganize(autoModeFolder || app.getPath('desktop'), { notifyTidy: true });
    });
  } catch (err) {
    console.error('Failed to register global hotkey:', err);
  }
  if (!ok) {
    showNotification(`Couldn't set the hotkey ${hotkey}. Another app might be using it.`);
  }
  return ok;
}

// Schedule system — persisted in config so it survives restarts.
// Uses a setTimeout chain aimed at nextRunAt so a relaunch doesn't reset the clock.
function startSchedule(folder, intervalKey, nextRunAt) {
  stopSchedule();
  const intervalMs = SCHEDULE_INTERVALS[intervalKey] || SCHEDULE_INTERVALS.daily;
  const next = nextRunAt || Date.now() + intervalMs;
  saveSchedule({ enabled: true, interval: intervalKey, folder, nextRunAt: next });

  scheduleTimer = setTimeout(async () => {
    await runOrganize(folder, { label: 'Scheduled: Organized ' });
    if (scheduleTimer) startSchedule(folder, intervalKey);
  }, Math.max(0, next - Date.now()));
}

function stopSchedule() {
  if (scheduleTimer) {
    clearTimeout(scheduleTimer);
    scheduleTimer = null;
  }
}

function saveSchedule(schedule) {
  const cfg = config.get();
  config.save({ ...cfg, schedule: { ...cfg.schedule, ...schedule } });
}

function isScheduleActive() {
  return scheduleTimer !== null;
}

function resumeSchedule() {
  const { schedule } = config.get();
  if (schedule && schedule.enabled && schedule.folder) {
    startSchedule(schedule.folder, schedule.interval, schedule.nextRunAt);
  }
}

// Window control IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// IPC Handlers
// options.onlyFiles: file names hand-picked in the preview (omit for everything)
ipcMain.handle('declutter', async (_, folderPath, options = {}) => {
  const onlyFiles = Array.isArray(options.onlyFiles)
    ? options.onlyFiles.filter(f => typeof f === 'string')
    : null;
  const results = await organizeFolder(folderPath, null, { onlyFiles });
  if (results.moved.length > 0) {
    pushUndo(results.moved);
    stats.recordOrganize(results);
  }
  return results;
});

// Dry run / preview
ipcMain.handle('preview-declutter', async (_, folderPath) => {
  return await organizeFolder(folderPath, null, { dryRun: true });
});

// Multi-level undo
ipcMain.handle('undo-last', async () => {
  if (undoStack.length === 0) {
    return { restored: [], errors: [{ file: '', error: 'Nothing to undo' }] };
  }
  const batch = undoStack.pop();
  const results = await undoOrganize([...batch]);
  stats.recordUndo(results.restored.length);
  return { ...results, undoLevelsLeft: undoStack.length };
});

// Pin / unpin a file so it's never moved
ipcMain.handle('set-file-pinned', (_, filePath, pinned) => {
  if (typeof filePath !== 'string' || !filePath) return config.get().pinnedFiles;
  const cfg = config.get();
  const key = (p) => {
    const r = path.resolve(p);
    return process.platform === 'win32' ? r.toLowerCase() : r;
  };
  const rest = cfg.pinnedFiles.filter(p => key(p) !== key(filePath));
  const pinnedFiles = pinned ? [...rest, path.resolve(filePath)] : rest;
  config.save({ ...cfg, pinnedFiles });
  return pinnedFiles;
});

ipcMain.handle('get-undo-depth', () => {
  return undoStack.length;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select folder to organize'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('get-desktop-path', () => {
  return app.getPath('desktop');
});

ipcMain.handle('toggle-auto-mode', (_, folderPath) => {
  toggleAuto(folderPath);
  return isWatching();
});

ipcMain.handle('get-auto-status', () => {
  return isWatching();
});

// Empty folder cleanup
ipcMain.handle('clean-empty-folders', async (_, folderPath) => {
  return await cleanEmptyFolders(folderPath);
});

// Stats
ipcMain.handle('get-stats', () => {
  return stats.get();
});

ipcMain.handle('is-first-run', () => {
  return stats.isFirstRun();
});

// Schedule
ipcMain.handle('toggle-schedule', (_, folderPath, intervalKey) => {
  if (isScheduleActive()) {
    stopSchedule();
    saveSchedule({ enabled: false, nextRunAt: null });
    return false;
  } else {
    startSchedule(folderPath, intervalKey);
    return true;
  }
});

ipcMain.handle('set-schedule-interval', (_, folderPath, intervalKey) => {
  if (isScheduleActive()) startSchedule(folderPath, intervalKey);
  else saveSchedule({ interval: intervalKey });
  return isScheduleActive();
});

ipcMain.handle('get-schedule-status', () => {
  const { schedule } = config.get();
  return { active: isScheduleActive(), ...schedule };
});

// Drag & drop folder validation
ipcMain.handle('validate-folder', (_, folderPath) => {
  const fs = require('fs');
  try {
    const stat = fs.statSync(folderPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
});

// Settings IPC handlers
ipcMain.handle('get-config', () => {
  return config.get();
});

ipcMain.handle('save-config', (_, newConfig) => {
  // Schedule state is owned by the main process — don't let a stale
  // settings snapshot from the renderer clobber it
  config.save({ ...newConfig, schedule: config.get().schedule });
  applyTheme(config.get().theme);
  const hotkeyRegistered = registerGlobalHotkey();
  return { ...config.get(), hotkeyRegistered };
});

ipcMain.handle('reset-config', () => {
  stopSchedule();
  const cfg = config.reset();
  applyTheme(cfg.theme);
  registerGlobalHotkey();
  return cfg;
});

// Live preview while picking a theme in Settings (not saved until Save)
ipcMain.handle('preview-theme', (_, theme) => {
  applyTheme(theme);
});

// Updates
ipcMain.handle('get-update-state', () => updater.getState());
ipcMain.handle('check-for-updates', () => updater.check());
ipcMain.handle('install-update', () => {
  if (updater.install()) isQuitting = true;
});

ipcMain.handle('get-default-categories', () => {
  return Object.keys(getAllCategories());
});

// App lifecycle
app.whenReady().then(() => {
  config.init(app.getPath('userData'));
  stats.init(app.getPath('userData'));
  applyTheme(config.get().theme);
  createWindow();
  resumeSchedule();
  updater.init((state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-state', state);
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  stopWatching();
  stopSchedule();
  globalShortcut.unregisterAll();
  destroyTray();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
