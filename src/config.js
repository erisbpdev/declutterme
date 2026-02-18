const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  version: 1,
  customRules: [],
  excludedExtensions: [],
  folderNames: {},
  shortcuts: {
    enabled: false,
    gamesFolderName: 'Games',
    appsFolderName: 'Applications'
  }
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
  return { ...DEFAULT_CONFIG, shortcuts: { ...DEFAULT_CONFIG.shortcuts }, folderNames: {} };
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
    folderNames: {}
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
    folderNames: { ...DEFAULT_CONFIG.folderNames, ...(loaded.folderNames || {}) },
    shortcuts: { ...DEFAULT_CONFIG.shortcuts, ...(loaded.shortcuts || {}) }
  };
}

module.exports = { init, load, save, get, reset, DEFAULT_CONFIG };
