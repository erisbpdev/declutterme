const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const { organizeFolder, undoOrganize } = require('./src/organizer');
const { startWatching, stopWatching, isWatching } = require('./src/watcher');
const { createTray, updateTrayMenu, destroyTray } = require('./src/tray');
const config = require('./src/config');
const { getAllCategories } = require('./src/categories');

let mainWindow = null;
let lastMoveHistory = [];
let autoModeFolder = null;

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
    if (isWatching()) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Setup tray
  createTray(mainWindow, {
    onDeclutter: async () => {
      const folder = autoModeFolder || app.getPath('desktop');
      const results = await organizeFolder(folder);
      if (results.moved.length > 0) {
        lastMoveHistory = results.moved;
        showNotification(`Organized ${results.moved.length} files!`);
        mainWindow.webContents.send('auto-organized', results);
      }
    },
    onToggleAuto: () => {
      const folder = autoModeFolder || app.getPath('desktop');
      toggleAuto(folder);
    },
    isAutoOn: false
  });
}

function toggleAuto(folder) {
  if (isWatching()) {
    stopWatching();
    showNotification('Auto mode disabled');
  } else {
    autoModeFolder = folder;
    startWatching(folder, (results) => {
      lastMoveHistory = results.moved;
      showNotification(`Auto-organized ${results.moved.length} files!`);
      if (mainWindow) {
        mainWindow.webContents.send('auto-organized', results);
      }
    });
    showNotification('Auto mode enabled');
  }

  updateTrayMenu(mainWindow, {
    onDeclutter: async () => {
      const f = autoModeFolder || app.getPath('desktop');
      const results = await organizeFolder(f);
      if (results.moved.length > 0) {
        lastMoveHistory = results.moved;
        mainWindow.webContents.send('auto-organized', results);
      }
    },
    onToggleAuto: () => toggleAuto(folder),
    isAutoOn: isWatching()
  });
}

function showNotification(body) {
  if (Notification.isSupported()) {
    new Notification({ title: 'DeclutterMe', body }).show();
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
ipcMain.handle('declutter', async (_, folderPath) => {
  const results = await organizeFolder(folderPath);
  if (results.moved.length > 0) {
    lastMoveHistory = results.moved;
  }
  return results;
});

ipcMain.handle('undo-last', async () => {
  if (lastMoveHistory.length === 0) {
    return { restored: [], errors: [{ file: '', error: 'Nothing to undo' }] };
  }
  const results = await undoOrganize([...lastMoveHistory]);
  lastMoveHistory = [];
  return results;
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

// Settings IPC handlers
ipcMain.handle('get-config', () => {
  return config.get();
});

ipcMain.handle('save-config', (_, newConfig) => {
  config.save(newConfig);
  return config.get();
});

ipcMain.handle('reset-config', () => {
  return config.reset();
});

ipcMain.handle('get-default-categories', () => {
  return Object.keys(getAllCategories());
});

// App lifecycle
app.whenReady().then(() => {
  config.init(app.getPath('userData'));
  createWindow();
});

app.on('window-all-closed', () => {
  stopWatching();
  destroyTray();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
