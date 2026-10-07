const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray(mainWindow, { onDeclutter, onToggleAuto, isAutoOn }) {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

  // Create a simple 16x16 icon if the file doesn't exist
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    // Fallback: create a simple colored icon
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('DeclutterMe');

  updateTrayMenu(mainWindow, { onDeclutter, onToggleAuto, isAutoOn });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

function updateTrayMenu(mainWindow, { onDeclutter, onToggleAuto, isAutoOn }) {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open DeclutterMe',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Declutter now',
      click: onDeclutter
    },
    {
      label: `Auto mode: ${isAutoOn ? 'on' : 'off'}`,
      click: onToggleAuto
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (mainWindow) {
          mainWindow.destroy();
        }
        require('electron').app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, updateTrayMenu, destroyTray };
