// ═══════════════════════════════════════════
// DOM Elements — Main View
// ═══════════════════════════════════════════
const folderPathEl = document.getElementById('folderPath');
const folderNameEl = document.getElementById('folderName');
const browseFolderBtn = document.getElementById('browseFolderBtn');
const resetDesktopBtn = document.getElementById('resetDesktopBtn');
const declutterBtn = document.getElementById('declutterBtn');
const previewBtn = document.getElementById('previewBtn');
const autoToggle = document.getElementById('autoToggle');
const undoBtn = document.getElementById('undoBtn');
const undoCount = document.getElementById('undoCount');
const logContainer = document.getElementById('logContainer');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const statsBtn = document.getElementById('statsBtn');
const companionFace = document.getElementById('companionFace');
const companionMessageText = document.getElementById('companionMessageText');
const tidyStatus = document.getElementById('tidyStatus');
const tidyStatusDot = document.getElementById('tidyStatusDot');
const folderPanel = document.getElementById('folderPanel');
const dropOverlay = document.getElementById('dropOverlay');
const profileSelect = document.getElementById('profileSelect');
const cleanFoldersBtn = document.getElementById('cleanFoldersBtn');

// Schedule
const scheduleToggle = document.getElementById('scheduleToggle');
const scheduleInterval = document.getElementById('scheduleInterval');
const scheduleDesc = document.getElementById('scheduleDesc');

// DOM Elements — Views
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const statsView = document.getElementById('statsView');
const previewView = document.getElementById('previewView');

// DOM Elements — Preview
const previewBackBtn = document.getElementById('previewBackBtn');
const previewCancelBtn = document.getElementById('previewCancelBtn');
const previewApplyBtn = document.getElementById('previewApplyBtn');
const previewApplyLabel = document.getElementById('previewApplyLabel');
const previewSelectAll = document.getElementById('previewSelectAll');
const previewList = document.getElementById('previewList');
const previewSkipped = document.getElementById('previewSkipped');

// DOM Elements — Settings
const settingsBackBtn = document.getElementById('settingsBackBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const customRulesList = document.getElementById('customRulesList');
const addRuleBtn = document.getElementById('addRuleBtn');
const exclusionsList = document.getElementById('exclusionsList');
const exclusionInput = document.getElementById('exclusionInput');
const addExclusionBtn = document.getElementById('addExclusionBtn');
const folderNamesList = document.getElementById('folderNamesList');
const shortcutToggle = document.getElementById('shortcutToggle');
const shortcutOptions = document.getElementById('shortcutOptions');
const gamesFolderInput = document.getElementById('gamesFolderInput');
const appsFolderInput = document.getElementById('appsFolderInput');
const cleanFoldersToggle = document.getElementById('cleanFoldersToggle');
const hotkeyInput = document.getElementById('hotkeyInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profilesList = document.getElementById('profilesList');
const pinnedFilesList = document.getElementById('pinnedFilesList');
const themeControl = document.getElementById('themeControl');

// DOM Elements — Stats
const statsBackBtn = document.getElementById('statsBackBtn');

// ═══════════════════════════════════════════
// State
// ═══════════════════════════════════════════
let currentFolder = '';
let settingsData = null;
let defaultCategories = [];
let companionRevertTimer = null;
let companionMsgTimer = null;
let isAutoMode = false;
let isScheduleActive = false;
// Current preview: { folder, items: [{ file, from, category, rule, selected, pinned }], skipped }
let previewState = null;

const PIN_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24z"/></svg>`;

// ═══════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════
// ASCII Robot Companion — Face + Voice
// ═══════════════════════════════════════════
const FACES = {
  idle:     '[^_^]',
  working:  '[o_o]',
  success:  '[*_*]',
  error:    '[>_<]',
  undo:     '[o_O]',
  settings: '[@_@]',
  auto:     '[•_•]',
  tidy:     '[^-^]',
  preview:  '[°_°]',
  stats:    '[~_~]',
  greet:    '[^o^]'
};

// Companion messages — randomized per mood
const MESSAGES = {
  idle: ['Ready when you are!', 'Waiting for files~', 'Let\'s tidy up!'],
  working: ['Sorting things out...', 'Organizing~', 'On it!'],
  success: ['All sorted!', 'Nice and tidy!', 'Done! That feels good~', 'Files found a home!'],
  error: ['Oops, something went wrong!', 'Hmm, that didn\'t work...'],
  undo: ['Putting things back!', 'Reversing~'],
  tidy: ['Already spotless!', 'Nothing to do — nice!', 'You\'re so tidy already!'],
  preview: ['Here\'s what I\'d do~', 'Just a peek!', 'Preview time!'],
  greet: ['Hi! I\'m Tidy!', 'Welcome back!', 'Let\'s clean up!'],
  firstRun: ['Hi! I\'m Tidy — your file buddy!', 'Drop a folder on me to start!'],
  clean: ['Empty folders gone!', 'Cleaned up!'],
  schedule: ['I\'ll handle it!', 'Timer set~'],
  auto: ['Watching for files~', 'Auto mode on!']
};

function randomMessage(key) {
  const pool = MESSAGES[key] || MESSAGES.idle;
  return pool[Math.floor(Math.random() * pool.length)];
}

function setCompanionFace(key, temporary = false) {
  const face = FACES[key] || FACES.idle;
  if (companionFace) companionFace.textContent = face;

  // Pop animation
  if (companionFace) {
    companionFace.classList.remove('pop');
    void companionFace.offsetWidth;
    companionFace.classList.add('pop');
  }

  if (companionRevertTimer) clearTimeout(companionRevertTimer);
  if (temporary) {
    companionRevertTimer = setTimeout(() => {
      const revertTo = isAutoMode ? 'auto' : 'idle';
      setCompanionFace(revertTo, false);
    }, 3000);
  }
}

// Messages live on Tidy's screen: the text fades over to the new line,
// then settles back to a resting line after a few seconds
let messageSwapTimer = null;

function setScreenMessage(text) {
  if (!companionMessageText || companionMessageText.textContent === text) return;
  if (messageSwapTimer) clearTimeout(messageSwapTimer);
  companionMessageText.classList.add('is-changing');
  messageSwapTimer = setTimeout(() => {
    companionMessageText.textContent = text;
    companionMessageText.classList.remove('is-changing');
  }, 180);
}

function showCompanionMessage(key) {
  setScreenMessage(randomMessage(key));
  if (companionMsgTimer) clearTimeout(companionMsgTimer);
  companionMsgTimer = setTimeout(restCompanionMessage, 5000);
}

function restCompanionMessage() {
  if (companionMsgTimer) clearTimeout(companionMsgTimer);
  companionMsgTimer = null;
  setScreenMessage(isAutoMode ? 'Watching for new files~' : 'Ready when you are!');
}

// Status line under the message: what Tidy is doing in the background
function updateTidyStatus() {
  if (!tidyStatus) return;
  const name = folderDisplayName(currentFolder);
  let text = 'Idle';
  let state = 'idle';
  if (isAutoMode) {
    text = `Watching ${name}`;
    state = 'on';
  } else if (isScheduleActive) {
    const label = scheduleInterval.options[scheduleInterval.selectedIndex]?.text || 'Scheduled';
    text = `${label} schedule · ${name}`;
    state = 'scheduled';
  }
  tidyStatus.textContent = text;
  tidyStatusDot.dataset.state = state;
}

function folderDisplayName(folderPath) {
  if (!folderPath) return 'No folder';
  const parts = folderPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || folderPath;
}

// Folder card: folder name big, full path small underneath
function setFolderDisplay(folderPath) {
  folderNameEl.textContent = folderDisplayName(folderPath);
  folderPathEl.textContent = folderPath || 'Select or drop a folder';
  folderPathEl.title = folderPath || '';
  updateTidyStatus();
}

// ═══════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════
async function init() {
  currentFolder = await window.api.getDesktopPath();
  setFolderDisplay(currentFolder);

  const autoStatus = await window.api.getAutoStatus();
  autoToggle.checked = autoStatus;
  isAutoMode = autoStatus;

  const scheduleStatus = await window.api.getScheduleStatus();
  scheduleToggle.checked = scheduleStatus.active;
  isScheduleActive = scheduleStatus.active;
  if ([...scheduleInterval.options].some(o => o.value === scheduleStatus.interval)) {
    scheduleInterval.value = scheduleStatus.interval;
  }
  if (isScheduleActive) {
    scheduleDesc.textContent = `Next: ${scheduleInterval.value}`;
  }
  updateTidyStatus();

  await updateUndoButton();
  await loadProfiles();

  // First-run greeting
  const firstRun = await window.api.isFirstRun();
  if (firstRun) {
    setCompanionFace('greet');
    showCompanionMessage('firstRun');
  } else {
    setCompanionFace(isAutoMode ? 'auto' : 'idle');
    showCompanionMessage(isAutoMode ? 'auto' : 'idle');
  }
}

async function updateUndoButton() {
  const depth = await window.api.getUndoDepth();
  undoBtn.disabled = depth === 0;
  undoCount.textContent = depth > 0 ? `(${depth})` : '';
}

// ═══════════════════════════════════════════
// Title bar controls
// ═══════════════════════════════════════════
minimizeBtn.addEventListener('click', () => window.api.minimizeWindow());
closeBtn.addEventListener('click', () => window.api.closeWindow());

// ═══════════════════════════════════════════
// View switching
// ═══════════════════════════════════════════
function hideAllViews() {
  mainView.classList.remove('active');
  settingsView.classList.remove('active');
  statsView.classList.remove('active');
  previewView.classList.remove('active');
}

function showSettings() {
  hideAllViews();
  settingsView.classList.add('active');
  setCompanionFace('settings');
  loadSettingsIntoForm();
}

function showMain() {
  hideAllViews();
  mainView.classList.add('active');
  setCompanionFace(isAutoMode ? 'auto' : 'idle');
}

function showStats() {
  hideAllViews();
  statsView.classList.add('active');
  setCompanionFace('stats');
  loadStats();
}

// Leaving Settings without saving puts back the theme that was saved
async function leaveSettingsUnsaved() {
  const saved = await window.api.getConfig();
  await window.api.previewTheme(saved.theme);
  showMain();
}

settingsBtn.addEventListener('click', showSettings);
settingsBackBtn.addEventListener('click', leaveSettingsUnsaved);
cancelSettingsBtn.addEventListener('click', leaveSettingsUnsaved);
statsBtn.addEventListener('click', showStats);
statsBackBtn.addEventListener('click', showMain);

// ═══════════════════════════════════════════
// Browse folder
// ═══════════════════════════════════════════
browseFolderBtn.addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) {
    currentFolder = folder;
    setFolderDisplay(folder);
  }
});

resetDesktopBtn.addEventListener('click', async () => {
  currentFolder = await window.api.getDesktopPath();
  setFolderDisplay(currentFolder);
});

// ═══════════════════════════════════════════
// Drag & Drop folder
// ═══════════════════════════════════════════
let dragCounter = 0;

folderPanel.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dropOverlay.style.display = 'flex';
  folderPanel.classList.add('drag-over');
});

folderPanel.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    dropOverlay.style.display = 'none';
    folderPanel.classList.remove('drag-over');
  }
});

folderPanel.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

folderPanel.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.style.display = 'none';
  folderPanel.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const droppedPath = files[0].path;
    const isDir = await window.api.validateFolder(droppedPath);
    if (isDir) {
      currentFolder = droppedPath;
      setFolderDisplay(droppedPath);
      showCompanionMessage('idle');
    } else {
      addLogEntry('Dropped item is not a folder', 'error');
      setCompanionFace('error', true);
    }
  }
});

// ═══════════════════════════════════════════
// Preview (Dry Run)
// ═══════════════════════════════════════════
previewBtn.addEventListener('click', async () => {
  if (!currentFolder) return;

  previewBtn.disabled = true;
  setCompanionFace('preview');
  showCompanionMessage('preview');

  try {
    const results = await window.api.previewDeclutter(currentFolder);

    if (results.moved.length === 0 && results.pinned.length === 0) {
      displayResults(results, false, true);
      if (results.errors.length === 0) {
        setCompanionFace('tidy', true);
        showCompanionMessage('tidy');
      }
      return;
    }

    previewState = {
      folder: currentFolder,
      skipped: results.skipped.length,
      items: [
        ...results.moved.map(m => ({ ...m, selected: true, pinned: false })),
        ...results.pinned.map(m => ({ ...m, selected: false, pinned: true }))
      ]
    };
    hideAllViews();
    previewView.classList.add('active');
    renderPreview();
  } catch (err) {
    addLogEntry(`Preview error: ${escapeHtml(err.message)}`, 'error');
    setCompanionFace('error', true);
  } finally {
    previewBtn.disabled = false;
  }
});

function renderPreview() {
  const { items } = previewState;
  const scrollTop = previewList.scrollTop;
  previewList.innerHTML = '';

  // Group movable files by destination folder; pinned files get their own group at the end
  const groups = new Map();
  for (const item of items.filter(i => !i.pinned)) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  const pinnedItems = items.filter(i => i.pinned);

  const renderGroup = (title, groupItems, isPinnedGroup) => {
    const section = document.createElement('div');
    section.className = 'card preview-group';

    const allSelected = groupItems.every(i => i.selected);
    section.innerHTML = `
      <label class="preview-group-header">
        ${isPinnedGroup
          ? `<span class="preview-pin-badge">${PIN_ICON}</span>`
          : `<input type="checkbox" class="preview-group-check" ${allSelected ? 'checked' : ''}>`}
        <span class="preview-group-title">${escapeHtml(title)}</span>
        <span class="preview-group-count">${groupItems.length}</span>
      </label>
    `;

    for (const item of groupItems) {
      const row = document.createElement('div');
      row.className = `preview-row${item.pinned ? ' is-pinned' : ''}${!item.selected && !item.pinned ? ' is-off' : ''}`;
      row.innerHTML = `
        <input type="checkbox" class="preview-file-check" ${item.selected ? 'checked' : ''} ${item.pinned ? 'disabled' : ''}>
        <span class="preview-file-name" title="${escapeHtml(item.file)}">${escapeHtml(item.file)}</span>
        ${item.rule ? `<span class="preview-rule" title="Matched rule">${escapeHtml(item.rule)}</span>` : ''}
        ${isPinnedGroup ? `<span class="preview-dest">→ ${escapeHtml(item.category)}</span>` : ''}
        <button class="preview-pin${item.pinned ? ' active' : ''}" title="${item.pinned ? 'Unpin — allow moving' : 'Pin — never move this file'}">${PIN_ICON}</button>
      `;

      const check = row.querySelector('.preview-file-check');
      check.addEventListener('change', () => {
        item.selected = check.checked;
        renderPreview();
      });

      row.querySelector('.preview-pin').addEventListener('click', async () => {
        const pinned = !item.pinned;
        await window.api.setFilePinned(item.from, pinned);
        item.pinned = pinned;
        item.selected = !pinned;
        addLogEntry(`${pinned ? 'Pinned' : 'Unpinned'} <span class="file-name">${escapeHtml(item.file)}</span>`, 'muted');
        renderPreview();
      });

      section.appendChild(row);
    }

    const groupCheck = section.querySelector('.preview-group-check');
    if (groupCheck) {
      groupCheck.addEventListener('change', () => {
        groupItems.forEach(i => { i.selected = groupCheck.checked; });
        renderPreview();
      });
    }

    previewList.appendChild(section);
  };

  [...groups.keys()].sort().forEach(cat => renderGroup(cat, groups.get(cat), false));
  if (pinnedItems.length) renderGroup('Pinned — never moved', pinnedItems, true);
  previewList.scrollTop = scrollTop;

  // Footer + select-all state
  const movable = items.filter(i => !i.pinned);
  const selectedCount = movable.filter(i => i.selected).length;
  previewSelectAll.checked = movable.length > 0 && selectedCount === movable.length;
  previewSelectAll.indeterminate = selectedCount > 0 && selectedCount < movable.length;
  previewSelectAll.disabled = movable.length === 0;
  previewApplyLabel.textContent = `Organize ${selectedCount} file${selectedCount !== 1 ? 's' : ''}`;
  previewApplyBtn.disabled = selectedCount === 0;

  const notes = [];
  if (pinnedItems.length) notes.push(`${pinnedItems.length} pinned`);
  if (previewState.skipped) notes.push(`${previewState.skipped} skipped`);
  previewSkipped.textContent = notes.join(' · ');
}

previewSelectAll.addEventListener('change', () => {
  previewState.items.filter(i => !i.pinned).forEach(i => { i.selected = previewSelectAll.checked; });
  renderPreview();
});

function closePreview() {
  previewState = null;
  showMain();
}

previewBackBtn.addEventListener('click', closePreview);
previewCancelBtn.addEventListener('click', closePreview);

previewApplyBtn.addEventListener('click', async () => {
  const { folder, items } = previewState;
  const onlyFiles = items.filter(i => i.selected && !i.pinned).map(i => i.file);
  closePreview();
  await runDeclutter(folder, { onlyFiles });
});

// ═══════════════════════════════════════════
// Declutter
// ═══════════════════════════════════════════
const DECLUTTER_LABEL = declutterBtn.innerHTML;

declutterBtn.addEventListener('click', () => runDeclutter(currentFolder));

async function runDeclutter(folder, options) {
  if (!folder) return;

  declutterBtn.disabled = true;
  declutterBtn.classList.add('loading');
  declutterBtn.innerHTML = '<svg class="btn-glyph spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Organizing…';
  setCompanionFace('working');
  showCompanionMessage('working');

  try {
    const results = await window.api.declutter(folder, options);
    displayResults(results);

    if (results.moved.length > 0) {
      await updateUndoButton();
      setCompanionFace('success', true);
      showCompanionMessage('success');

      // Auto clean empty folders if enabled
      const cfg = await window.api.getConfig();
      if (cfg.cleanEmptyFolders) {
        const cleanResults = await window.api.cleanEmptyFolders(folder);
        if (cleanResults.cleaned.length > 0) {
          addLogEntry(`Cleaned ${cleanResults.cleaned.length} empty folder${cleanResults.cleaned.length !== 1 ? 's' : ''}`, 'success');
        }
      }
    } else if (results.errors.length === 0) {
      setCompanionFace('tidy', true);
      showCompanionMessage('tidy');
    }
  } catch (err) {
    addLogEntry(`Error: ${err.message}`, 'error');
    setCompanionFace('error', true);
    showCompanionMessage('error');
  } finally {
    declutterBtn.disabled = false;
    declutterBtn.classList.remove('loading');
    declutterBtn.innerHTML = DECLUTTER_LABEL;
  }
}

// ═══════════════════════════════════════════
// Auto mode toggle
// ═══════════════════════════════════════════
autoToggle.addEventListener('change', async () => {
  if (!currentFolder) {
    autoToggle.checked = false;
    return;
  }
  const watching = await window.api.toggleAutoMode(currentFolder);
  isAutoMode = watching;
  updateTidyStatus();
  setCompanionFace(isAutoMode ? 'auto' : 'idle');
  if (isAutoMode) showCompanionMessage('auto');
});

// ═══════════════════════════════════════════
// Schedule toggle
// ═══════════════════════════════════════════
scheduleToggle.addEventListener('change', async () => {
  if (!currentFolder) {
    scheduleToggle.checked = false;
    return;
  }
  const active = await window.api.toggleSchedule(currentFolder, scheduleInterval.value);
  isScheduleActive = active;
  updateTidyStatus();
  scheduleDesc.textContent = active
    ? `Next: ${scheduleInterval.value}`
    : 'Organize on a timer';
  if (active) {
    showCompanionMessage('schedule');
  }
});

scheduleInterval.addEventListener('change', async () => {
  // Restarts the timer if active, otherwise just remembers the choice
  if (!currentFolder) return;
  isScheduleActive = await window.api.setScheduleInterval(currentFolder, scheduleInterval.value);
  updateTidyStatus();
  if (isScheduleActive) {
    scheduleDesc.textContent = `Next: ${scheduleInterval.value}`;
  }
});

// ═══════════════════════════════════════════
// Undo (multi-level)
// ═══════════════════════════════════════════
undoBtn.addEventListener('click', async () => {
  setCompanionFace('undo', true);
  showCompanionMessage('undo');
  try {
    const results = await window.api.undoLast();
    if (results.restored.length > 0) {
      addLogEntry(`Restored ${results.restored.length} files to original location`, 'success');
    }
    if (results.errors.length > 0) {
      results.errors.forEach(e => {
        addLogEntry(`Failed to restore: ${escapeHtml(e.file)} - ${escapeHtml(e.error)}`, 'error');
      });
    }
    await updateUndoButton();
  } catch (err) {
    addLogEntry(`Undo error: ${err.message}`, 'error');
    setCompanionFace('error', true);
  }
});

// ═══════════════════════════════════════════
// Clean empty folders button
// ═══════════════════════════════════════════
cleanFoldersBtn.addEventListener('click', async () => {
  if (!currentFolder) return;
  try {
    const results = await window.api.cleanEmptyFolders(currentFolder);
    if (results.cleaned.length > 0) {
      addLogEntry(`Removed ${results.cleaned.length} empty folder${results.cleaned.length !== 1 ? 's' : ''}: ${results.cleaned.join(', ')}`, 'success');
      showCompanionMessage('clean');
    } else {
      addLogEntry('No empty folders found', 'success');
      setCompanionFace('tidy', true);
      showCompanionMessage('tidy');
    }
  } catch (err) {
    addLogEntry(`Clean error: ${err.message}`, 'error');
  }
});

// ═══════════════════════════════════════════
// Listen for auto-organize events
// ═══════════════════════════════════════════
window.api.onAutoOrganize(async (results) => {
  displayResults(results, true);
  if (results.moved.length > 0) {
    await updateUndoButton();
    setCompanionFace('success', true);
    showCompanionMessage('success');
  }
});

// ═══════════════════════════════════════════
// Display results
// ═══════════════════════════════════════════
function displayResults(results, isAuto = false, isPreview = false) {
  const prefix = isPreview ? '[Preview] ' : isAuto ? '[Auto] ' : '';

  if (results.moved.length === 0 && results.errors.length === 0) {
    addLogEntry(`${prefix}No files to organize — already tidy!`, 'success');
    return;
  }

  // Summary
  if (results.moved.length > 0) {
    const verb = isPreview ? 'Would organize' : 'Organized';
    addLogEntry(
      `${prefix}${verb} <span class="summary-count">${results.moved.length}</span> file${results.moved.length !== 1 ? 's' : ''}`,
      isPreview ? 'preview' : 'success'
    );
  }

  // Individual files
  results.moved.forEach(item => {
    addLogEntry(
      `${prefix}<span class="file-name">${escapeHtml(item.file)}</span> → <span class="category">${escapeHtml(item.category)}</span>`,
      isPreview ? 'preview' : ''
    );
  });

  // Skipped files feedback
  if (results.skipped && results.skipped.length > 0) {
    const skippedCount = results.skipped.length;
    addLogEntry(
      `${prefix}Skipped <span class="summary-count">${skippedCount}</span> file${skippedCount !== 1 ? 's' : ''} (system/excluded/no ext)`,
      'muted'
    );
  }

  // Errors
  results.errors.forEach(item => {
    addLogEntry(`${prefix}Failed: ${escapeHtml(item.file)} - ${escapeHtml(item.error)}`, 'error');
  });
}

// ═══════════════════════════════════════════
// Add log entry
// ═══════════════════════════════════════════
function addLogEntry(html, type = '') {
  const emptyEl = logContainer.querySelector('.log-empty');
  if (emptyEl) emptyEl.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  entry.innerHTML = `<span class="log-text">${html}</span><span class="timestamp">${time}</span>`;

  logContainer.insertBefore(entry, logContainer.firstChild);

  while (logContainer.children.length > 100) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// ═══════════════════════════════════════════
// STATS — Load and display
// ═══════════════════════════════════════════
async function loadStats() {
  const s = await window.api.getStats();

  document.getElementById('statsTotalFiles').textContent = s.totalFilesOrganized.toLocaleString();
  document.getElementById('statsSessions').textContent = s.totalSessions.toLocaleString();
  document.getElementById('statsUndos').textContent = s.totalUndos.toLocaleString();

  // First / last dates
  document.getElementById('statsFirstDate').textContent = s.firstUsedDate
    ? new Date(s.firstUsedDate).toLocaleDateString()
    : '—';
  document.getElementById('statsLastDate').textContent = s.lastUsedDate
    ? new Date(s.lastUsedDate).toLocaleDateString()
    : '—';

  // Top categories bar chart
  const catContainer = document.getElementById('statsCategories');
  catContainer.innerHTML = '';

  const entries = Object.entries(s.filesByCategory).sort((a, b) => b[1] - a[1]);
  const maxCount = entries.length > 0 ? entries[0][1] : 1;

  entries.slice(0, 8).forEach(([cat, count]) => {
    const bar = document.createElement('div');
    bar.className = 'stats-bar-row';
    const pct = Math.max(8, (count / maxCount) * 100);
    bar.innerHTML = `
      <span class="stats-bar-label">${escapeHtml(cat)}</span>
      <div class="stats-bar-track">
        <div class="stats-bar-fill" style="width: ${pct}%"></div>
      </div>
      <span class="stats-bar-count">${count}</span>
    `;
    catContainer.appendChild(bar);
  });

  if (entries.length === 0) {
    catContainer.innerHTML = '<p class="stats-empty">No data yet — organize some files!</p>';
  }
}

// ═══════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════
async function loadProfiles() {
  const cfg = await window.api.getConfig();
  const profiles = cfg.profiles || [];

  // Update select dropdown
  profileSelect.innerHTML = '<option value="">No profile</option>';
  profiles.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = p.name;
    profileSelect.appendChild(opt);
  });
}

profileSelect.addEventListener('change', async () => {
  const idx = parseInt(profileSelect.value);
  if (isNaN(idx)) return;

  const cfg = await window.api.getConfig();
  const profile = cfg.profiles[idx];
  if (!profile) return;

  // Apply profile
  if (profile.folderPath) {
    currentFolder = profile.folderPath;
    setFolderDisplay(profile.folderPath);
  }

  // Save profile rules as current config
  const newCfg = { ...cfg };
  if (profile.customRules) newCfg.customRules = profile.customRules;
  if (profile.excludedExtensions) newCfg.excludedExtensions = profile.excludedExtensions;
  if (profile.folderNames) newCfg.folderNames = profile.folderNames;
  if (profile.shortcuts) newCfg.shortcuts = profile.shortcuts;
  await window.api.saveConfig(newCfg);

  addLogEntry(`Loaded profile: ${profile.name}`, 'success');
});

saveProfileBtn.addEventListener('click', async () => {
  const name = prompt('Profile name:');
  if (!name || !name.trim()) return;

  const cfg = await window.api.getConfig();
  const profile = {
    name: name.trim(),
    folderPath: currentFolder,
    customRules: cfg.customRules,
    excludedExtensions: cfg.excludedExtensions,
    folderNames: cfg.folderNames,
    shortcuts: cfg.shortcuts
  };

  cfg.profiles.push(profile);
  await window.api.saveConfig(cfg);

  renderProfiles();
  await loadProfiles();
  addLogEntry(`Saved profile: ${name.trim()}`, 'success');
});

function renderProfiles() {
  if (!settingsData) return;
  profilesList.innerHTML = '';

  (settingsData.profiles || []).forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.innerHTML = `
      <span class="category-label" style="width:auto;flex:1">${escapeHtml(p.name)}</span>
      <span style="font-size:10px;color:var(--text-muted)">${escapeHtml(p.folderPath || 'No folder')}</span>
      <button class="btn-remove profile-remove" data-index="${i}" title="Remove profile">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    profilesList.appendChild(row);
  });

  profilesList.querySelectorAll('.profile-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.currentTarget.dataset.index);
      settingsData.profiles.splice(i, 1);
      renderProfiles();
    });
  });
}

// ═══════════════════════════════════════════
// SETTINGS — Load config into form
// ═══════════════════════════════════════════
async function loadSettingsIntoForm() {
  settingsData = await window.api.getConfig();
  defaultCategories = await window.api.getDefaultCategories();

  renderThemeControl();
  renderCustomRules();
  renderExclusions();
  renderPinnedFiles();
  renderFolderNames();
  renderShortcutSettings();
  renderProfiles();

  // Advanced settings
  cleanFoldersToggle.checked = settingsData.cleanEmptyFolders || false;
  hotkeyInput.value = settingsData.globalHotkey || 'CommandOrControl+Shift+D';
}

// ═══════════════════════════════════════════
// SETTINGS — Custom Rules
// ═══════════════════════════════════════════
function renderCustomRules() {
  customRulesList.innerHTML = '';

  settingsData.customRules.forEach((rule, index) => {
    const isPattern = rule.type === 'pattern';
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.innerHTML = `
      <select class="input-sm rule-type" data-index="${index}" title="Match by extension or file name">
        <option value="extension" ${!isPattern ? 'selected' : ''}>Ext</option>
        <option value="pattern" ${isPattern ? 'selected' : ''}>Name</option>
      </select>
      <input type="text" class="input-sm rule-ext" value="${escapeHtml((isPattern ? rule.pattern : rule.extension) || '')}"
             placeholder="${isPattern ? 'Screenshot*' : '.psd'}" style="width:${isPattern ? '120px' : '70px'}" data-index="${index}">
      <svg class="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
      <input type="text" class="input-sm rule-folder" value="${escapeHtml(rule.folder)}"
             placeholder="Folder name" style="flex:1" data-index="${index}">
      <button class="btn-remove rule-remove" data-index="${index}" title="Remove rule">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    customRulesList.appendChild(row);
  });

  customRulesList.querySelectorAll('.rule-type').forEach(select => {
    select.addEventListener('change', (e) => {
      const i = parseInt(e.target.dataset.index);
      const rule = settingsData.customRules[i];
      rule.type = e.target.value;
      if (rule.type === 'pattern') delete rule.extension;
      else delete rule.pattern;
      renderCustomRules();
    });
  });

  customRulesList.querySelectorAll('.rule-ext').forEach(input => {
    input.addEventListener('change', (e) => {
      const i = parseInt(e.target.dataset.index);
      const rule = settingsData.customRules[i];
      if (rule.type === 'pattern') {
        rule.pattern = e.target.value.trim();
        return;
      }
      let val = e.target.value.trim().toLowerCase();
      if (val && !val.startsWith('.')) val = '.' + val;
      rule.extension = val;
      e.target.value = val;
    });
  });

  customRulesList.querySelectorAll('.rule-folder').forEach(input => {
    input.addEventListener('change', (e) => {
      const i = parseInt(e.target.dataset.index);
      settingsData.customRules[i].folder = e.target.value.trim();
    });
  });

  customRulesList.querySelectorAll('.rule-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.currentTarget.dataset.index);
      settingsData.customRules.splice(i, 1);
      renderCustomRules();
    });
  });
}

addRuleBtn.addEventListener('click', () => {
  settingsData.customRules.push({ type: 'extension', extension: '', folder: '' });
  renderCustomRules();
  const inputs = customRulesList.querySelectorAll('.rule-ext');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

// ═══════════════════════════════════════════
// SETTINGS — Appearance (live preview; saved with the rest of the settings)
// ═══════════════════════════════════════════
function renderThemeControl() {
  const current = settingsData.theme || 'system';
  themeControl.querySelectorAll('[data-theme-value]').forEach(btn => {
    btn.setAttribute('aria-checked', String(btn.dataset.themeValue === current));
  });
}

themeControl.querySelectorAll('[data-theme-value]').forEach(btn => {
  btn.addEventListener('click', () => {
    settingsData.theme = btn.dataset.themeValue;
    renderThemeControl();
    window.api.previewTheme(settingsData.theme);
  });
});

// ═══════════════════════════════════════════
// SETTINGS — Pinned Files
// ═══════════════════════════════════════════
function renderPinnedFiles() {
  pinnedFilesList.innerHTML = '';
  const pinned = settingsData.pinnedFiles || [];

  if (pinned.length === 0) {
    pinnedFilesList.innerHTML = '<p class="settings-empty">Nothing pinned yet</p>';
    return;
  }

  pinned.forEach((filePath, index) => {
    const parts = filePath.split(/[\\/]/);
    const name = parts.pop();
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.title = filePath;
    row.innerHTML = `
      <span class="pinned-icon">${PIN_ICON}</span>
      <span class="pinned-name">${escapeHtml(name)}</span>
      <span class="pinned-dir">${escapeHtml(parts.join('\\'))}</span>
      <button class="btn-remove" data-index="${index}" title="Unpin">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    row.querySelector('.btn-remove').addEventListener('click', () => {
      settingsData.pinnedFiles.splice(index, 1);
      renderPinnedFiles();
    });
    pinnedFilesList.appendChild(row);
  });
}

// ═══════════════════════════════════════════
// SETTINGS — File Exclusions
// ═══════════════════════════════════════════
function renderExclusions() {
  exclusionsList.innerHTML = '';

  settingsData.excludedExtensions.forEach((ext, index) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `
      ${escapeHtml(ext)}
      <button class="tag-remove" data-index="${index}" title="Remove">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    exclusionsList.appendChild(chip);
  });

  exclusionsList.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.currentTarget.dataset.index);
      settingsData.excludedExtensions.splice(i, 1);
      renderExclusions();
    });
  });
}

addExclusionBtn.addEventListener('click', () => {
  let val = exclusionInput.value.trim().toLowerCase();
  if (!val) return;
  if (!val.startsWith('.')) val = '.' + val;
  if (settingsData.excludedExtensions.includes(val)) {
    exclusionInput.value = '';
    return;
  }
  settingsData.excludedExtensions.push(val);
  exclusionInput.value = '';
  renderExclusions();
});

exclusionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addExclusionBtn.click();
});

// ═══════════════════════════════════════════
// SETTINGS — Folder Names
// ═══════════════════════════════════════════
function renderFolderNames() {
  folderNamesList.innerHTML = '';

  defaultCategories.forEach(category => {
    const row = document.createElement('div');
    row.className = 'settings-row';
    const customName = (settingsData.folderNames && settingsData.folderNames[category]) || '';
    row.innerHTML = `
      <span class="category-label">${escapeHtml(category)}</span>
      <svg class="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
      <input type="text" class="input-sm folder-name-input" value="${escapeHtml(customName)}"
             placeholder="${escapeHtml(category)}" style="flex:1" data-category="${escapeHtml(category)}">
    `;
    folderNamesList.appendChild(row);
  });

  folderNamesList.querySelectorAll('.folder-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const cat = e.target.dataset.category;
      const val = e.target.value.trim();
      if (val && val !== cat) {
        settingsData.folderNames[cat] = val;
      } else {
        delete settingsData.folderNames[cat];
        e.target.value = '';
      }
    });
  });
}

// ═══════════════════════════════════════════
// SETTINGS — Shortcut Organization
// ═══════════════════════════════════════════
function renderShortcutSettings() {
  shortcutToggle.checked = settingsData.shortcuts.enabled;
  shortcutOptions.style.display = settingsData.shortcuts.enabled ? 'flex' : 'none';
  gamesFolderInput.value = settingsData.shortcuts.gamesFolderName || 'Games';
  appsFolderInput.value = settingsData.shortcuts.appsFolderName || 'Applications';
}

shortcutToggle.addEventListener('change', () => {
  settingsData.shortcuts.enabled = shortcutToggle.checked;
  shortcutOptions.style.display = shortcutToggle.checked ? 'flex' : 'none';
});

gamesFolderInput.addEventListener('change', () => {
  settingsData.shortcuts.gamesFolderName = gamesFolderInput.value.trim() || 'Games';
});

appsFolderInput.addEventListener('change', () => {
  settingsData.shortcuts.appsFolderName = appsFolderInput.value.trim() || 'Applications';
});

// ═══════════════════════════════════════════
// SETTINGS — Save / Cancel / Reset
// ═══════════════════════════════════════════
saveSettingsBtn.addEventListener('click', async () => {
  folderNamesList.querySelectorAll('.folder-name-input').forEach(input => {
    const cat = input.dataset.category;
    const val = input.value.trim();
    if (val && val !== cat) {
      settingsData.folderNames[cat] = val;
    } else {
      delete settingsData.folderNames[cat];
    }
  });

  customRulesList.querySelectorAll('.rule-ext').forEach(input => {
    const i = parseInt(input.dataset.index);
    const rule = settingsData.customRules[i];
    if (!rule) return;
    if (rule.type === 'pattern') {
      rule.pattern = input.value.trim();
    } else {
      let val = input.value.trim().toLowerCase();
      if (val && !val.startsWith('.')) val = '.' + val;
      rule.extension = val;
    }
  });
  customRulesList.querySelectorAll('.rule-folder').forEach(input => {
    const i = parseInt(input.dataset.index);
    if (settingsData.customRules[i]) {
      settingsData.customRules[i].folder = input.value.trim();
    }
  });

  settingsData.customRules = settingsData.customRules.filter(
    r => r.folder && (r.type === 'pattern' ? r.pattern : r.extension)
  );

  settingsData.shortcuts.gamesFolderName = gamesFolderInput.value.trim() || 'Games';
  settingsData.shortcuts.appsFolderName = appsFolderInput.value.trim() || 'Applications';

  // Advanced settings
  settingsData.cleanEmptyFolders = cleanFoldersToggle.checked;
  settingsData.globalHotkey = hotkeyInput.value.trim() || 'CommandOrControl+Shift+D';

  const saved = await window.api.saveConfig(settingsData);
  await loadProfiles();
  addLogEntry('Settings saved successfully', 'success');
  if (saved && saved.hotkeyRegistered === false) {
    addLogEntry(`Couldn't register hotkey ${escapeHtml(settingsData.globalHotkey)} — another app may be using it`, 'error');
  }
  showMain();
});

resetSettingsBtn.addEventListener('click', async () => {
  settingsData = await window.api.resetConfig();
  renderThemeControl();
  renderCustomRules();
  renderExclusions();
  renderPinnedFiles();
  renderFolderNames();
  renderShortcutSettings();
  renderProfiles();
  cleanFoldersToggle.checked = false;
  hotkeyInput.value = 'CommandOrControl+Shift+D';
  // Reset also stops the schedule
  isScheduleActive = false;
  updateTidyStatus();
  scheduleToggle.checked = false;
  scheduleInterval.value = 'daily';
  scheduleDesc.textContent = 'Organize on a timer';
  addLogEntry('Settings reset to defaults', 'success');
});

// ═══════════════════════════════════════════
// Init
// ═══════════════════════════════════════════
init();
