const chokidar = require('chokidar');
const path = require('path');
const { organizeFolder } = require('./organizer');

let watcher = null;
let debounceTimer = null;
const DEBOUNCE_MS = 5000; // Wait 5 seconds after last file change

function startWatching(targetFolder, onOrganize) {
  if (watcher) {
    stopWatching();
  }

  watcher = chokidar.watch(targetFolder, {
    ignored: /(^|[\/\\])\.|desktop\.ini|thumbs\.db/i,
    persistent: true,
    depth: 0, // Only watch the top-level folder
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500
    }
  });

  const triggerOrganize = async () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const results = await organizeFolder(targetFolder);
        if (results.moved.length > 0 && onOrganize) {
          onOrganize(results);
        }
      } catch (err) {
        console.error('Auto-organize error:', err);
      }
    }, DEBOUNCE_MS);
  };

  watcher.on('add', triggerOrganize);

  return watcher;
}

function stopWatching() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

function isWatching() {
  return watcher !== null;
}

module.exports = { startWatching, stopWatching, isWatching };
