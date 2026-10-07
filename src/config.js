const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  version: 2,
  // { type: 'extension', extension: '.psd', folder } or { type: 'pattern', pattern: 'Screenshot*', folder }
  customRules: [],
  excludedExtensions: [],
  // Absolute paths of files that should never be moved
  pinnedFiles: [],
  folderNames: {},
  shortcuts: {
    enabled: false,
    gamesFolderName: 'Games',
    appsFolderName: 'Applications'
  },
  globalHotkey: 'CommandOrControl+Shift+D',
  cleanEmptyFolders: false,
  schedule: {
    enabled: false,
    interval: 'daily',
    folder: null,
    nextRunAt: null
  },
  profiles: []
};

let configPath = '';
let currentConfig = null;

function init(userDataPath) {
  configPath = path.join(userDataPath, 'settings.json');
  currentConfig = load();
}

function load() {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      return mergeWithDefaults(parsed);
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  return {
    ...DEFAULT_CONFIG,
    shortcuts: { ...DEFAULT_CONFIG.shortcuts },
    schedule: { ...DEFAULT_CONFIG.schedule },
    folderNames: {},
    profiles: []
  };
}

function save(newConfig) {
  currentConfig = mergeWithDefaults(newConfig);
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
  return currentConfig;
}

function get() {
  if (!currentConfig) {
    currentConfig = load();
  }
  return JSON.parse(JSON.stringify(currentConfig));
}

function reset() {
  currentConfig = {
    ...DEFAULT_CONFIG,
    shortcuts: { ...DEFAULT_CONFIG.shortcuts },
    schedule: { ...DEFAULT_CONFIG.schedule },
    folderNames: {},
    profiles: []
  };
  save(currentConfig);
  return get();
}

function mergeWithDefaults(loaded) {
  return {
    ...DEFAULT_CONFIG,
    ...loaded,
    customRules: Array.isArray(loaded.customRules) ? loaded.customRules : [],
    excludedExtensions: Array.isArray(loaded.excludedExtensions) ? loaded.excludedExtensions : [],
    pinnedFiles: Array.isArray(loaded.pinnedFiles) ? loaded.pinnedFiles : [],
    folderNames: { ...DEFAULT_CONFIG.folderNames, ...(loaded.folderNames || {}) },
    shortcuts: { ...DEFAULT_CONFIG.shortcuts, ...(loaded.shortcuts || {}) },
    schedule: { ...DEFAULT_CONFIG.schedule, ...(loaded.schedule || {}) },
    profiles: Array.isArray(loaded.profiles) ? loaded.profiles : [],
    globalHotkey: loaded.globalHotkey || DEFAULT_CONFIG.globalHotkey,
    cleanEmptyFolders: typeof loaded.cleanEmptyFolders === 'boolean' ? loaded.cleanEmptyFolders : false
  };
}

module.exports = { init, load, save, get, reset, DEFAULT_CONFIG };
