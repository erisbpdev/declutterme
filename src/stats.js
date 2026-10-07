const fs = require('fs');
const path = require('path');

let statsPath = '';
let currentStats = null;

const DEFAULT_STATS = {
  totalFilesOrganized: 0,
  totalSessions: 0,
  totalUndos: 0,
  filesByCategory: {},
  firstUsedDate: null,
  lastUsedDate: null,
  lastSessionFiles: 0
};

function init(userDataPath) {
  statsPath = path.join(userDataPath, 'stats.json');
  currentStats = load();
}

function load() {
  try {
    if (fs.existsSync(statsPath)) {
      const raw = fs.readFileSync(statsPath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
  return { ...DEFAULT_STATS };
}

function save() {
  try {
    const dir = path.dirname(statsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(statsPath, JSON.stringify(currentStats, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save stats:', err);
  }
}

function get() {
  if (!currentStats) currentStats = load();
  return JSON.parse(JSON.stringify(currentStats));
}

function recordOrganize(results) {
  if (!currentStats) currentStats = load();

  const now = new Date().toISOString();
  if (!currentStats.firstUsedDate) {
    currentStats.firstUsedDate = now;
  }
  currentStats.lastUsedDate = now;
  currentStats.totalSessions++;
  currentStats.totalFilesOrganized += results.moved.length;
  currentStats.lastSessionFiles = results.moved.length;

  for (const item of results.moved) {
    const cat = item.category;
    currentStats.filesByCategory[cat] = (currentStats.filesByCategory[cat] || 0) + 1;
  }

  save();
  return get();
}

function recordUndo(count) {
  if (!currentStats) currentStats = load();
  currentStats.totalUndos++;
  save();
}

function isFirstRun() {
  if (!currentStats) currentStats = load();
  return currentStats.totalSessions === 0;
}

module.exports = { init, get, recordOrganize, recordUndo, isFirstRun };
