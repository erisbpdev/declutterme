const { app, Notification } = require('electron');

// Auto-updates from GitHub Releases (electron-updater).
// Only the NSIS installer on Windows and the AppImage on Linux can update
// themselves: the portable .exe can't replace itself, and macOS needs a
// signed build.
const CHECK_DELAY_MS = 10 * 1000;            // first check shortly after launch
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // then every 6 hours

let autoUpdater = null;
let send = () => {};
let state = {
  status: 'idle',            // idle | checking | downloading | ready | up-to-date | error | unsupported
  currentVersion: app.getVersion(),
  version: null,             // the new version, once one is found
  progress: 0,
  reason: null,              // why updates are unsupported
  error: null,
  checkedAt: null
};

function setState(patch) {
  state = { ...state, ...patch };
  send(state);
}

function unsupportedReason() {
  if (!app.isPackaged) return 'dev';
  if (process.env.PORTABLE_EXECUTABLE_DIR) return 'portable';
  if (process.platform === 'darwin') return 'mac';
  if (process.platform === 'linux' && !process.env.APPIMAGE) return 'linux';
  return null;
}

function init(onStateChange) {
  send = onStateChange;

  const reason = unsupportedReason();
  if (reason) {
    setState({ status: 'unsupported', reason });
    return;
  }

  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    setState({ status: 'checking', error: null });
  });
  autoUpdater.on('update-available', (info) => {
    setState({ status: 'downloading', version: info.version, progress: 0 });
  });
  autoUpdater.on('update-not-available', () => {
    setState({ status: 'up-to-date', checkedAt: Date.now() });
  });
  autoUpdater.on('download-progress', (p) => {
    // Only report whole-percent changes to keep IPC quiet
    const progress = Math.floor(p.percent);
    if (progress !== state.progress) setState({ progress });
  });
  autoUpdater.on('update-downloaded', (info) => {
    setState({ status: 'ready', version: info.version, progress: 100, checkedAt: Date.now() });
    if (Notification.isSupported()) {
      new Notification({
        title: 'DeclutterMe',
        body: `Version ${info.version} is ready — it installs when you restart the app.`
      }).show();
    }
  });
  autoUpdater.on('error', (err) => {
    // A failed background check shouldn't nag — the UI shows it in Settings only
    setState({ status: 'error', error: (err && err.message) || String(err), checkedAt: Date.now() });
  });

  setTimeout(check, CHECK_DELAY_MS);
  setInterval(check, CHECK_INTERVAL_MS);
}

function check() {
  if (!autoUpdater) return state;
  // Don't restart a download that's already in progress or finished
  if (['checking', 'downloading', 'ready'].includes(state.status)) return state;
  autoUpdater.checkForUpdates().catch(() => {
    // Reported through the 'error' event
  });
  return state;
}

// Returns true when the app is about to quit to install the update
function install() {
  if (!autoUpdater || state.status !== 'ready') return false;
  // isSilent=false shows the installer progress, isForceRunAfter=true relaunches the app
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return true;
}

function getState() {
  return state;
}

module.exports = { init, check, install, getState };
