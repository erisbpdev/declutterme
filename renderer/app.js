// ═══════════════════════════════════════════
// DOM Elements — Main View
// ═══════════════════════════════════════════
const folderPathInput = document.getElementById('folderPath');
const browseFolderBtn = document.getElementById('browseFolderBtn');
const resetDesktopBtn = document.getElementById('resetDesktopBtn');
const declutterBtn = document.getElementById('declutterBtn');
const autoToggle = document.getElementById('autoToggle');
const undoBtn = document.getElementById('undoBtn');
const logContainer = document.getElementById('logContainer');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const companionFace = document.getElementById('companionFace');
const companionFaceMini = document.getElementById('companionFaceMini');

// DOM Elements — Views
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');

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

// ═══════════════════════════════════════════
// State
// ═══════════════════════════════════════════
let currentFolder = '';
let hasHistory = false;
let settingsData = null;
let defaultCategories = [];
let companionRevertTimer = null;
let isAutoMode = false;

// ═══════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════
// ASCII Robot Companion
// ═══════════════════════════════════════════
const FACES = {
  idle:    '[^_^]',
  working: '[o_o]',
  success: '[*_*]',
  error:   '[>_<]',
  undo:    '[o_O]',
  settings:'[@_@]',
  auto:    '[•_•]',
  tidy:    '[^-^]'
};

function setCompanionFace(key, temporary = false) {
  const face = FACES[key] || FACES.idle;
  if (companionFace) companionFace.textContent = face;
  if (companionFaceMini) companionFaceMini.textContent = face;

  // Pop animation
  if (companionFace) {
    companionFace.classList.remove('pop');
    void companionFace.offsetWidth; // force reflow
    companionFace.classList.add('pop');
  }

  // Auto-revert temporary expressions after 3s
  if (companionRevertTimer) clearTimeout(companionRevertTimer);
  if (temporary) {
    companionRevertTimer = setTimeout(() => {
      const revertTo = isAutoMode ? 'auto' : 'idle';
      setCompanionFace(revertTo, false);
    }, 3000);
  }
}

// ═══════════════════════════════════════════
// Initialize
// ═══════════════════════════════════════════
async function init() {
  currentFolder = await window.api.getDesktopPath();
  folderPathInput.value = currentFolder;

  const autoStatus = await window.api.getAutoStatus();
  autoToggle.checked = autoStatus;
  isAutoMode = autoStatus;
  setCompanionFace(isAutoMode ? 'auto' : 'idle');
}

// ═══════════════════════════════════════════
// Title bar controls
// ═══════════════════════════════════════════
minimizeBtn.addEventListener('click', () => window.api.minimizeWindow());
closeBtn.addEventListener('click', () => window.api.closeWindow());

// ═══════════════════════════════════════════
// View switching
// ═══════════════════════════════════════════
function showSettings() {
  mainView.classList.remove('active');
  settingsView.classList.add('active');
  setCompanionFace('settings');
  loadSettingsIntoForm();
}

function showMain() {
  settingsView.classList.remove('active');
  mainView.classList.add('active');
  setCompanionFace(isAutoMode ? 'auto' : 'idle');
}

settingsBtn.addEventListener('click', showSettings);
settingsBackBtn.addEventListener('click', showMain);
cancelSettingsBtn.addEventListener('click', showMain);

// ═══════════════════════════════════════════
// Browse folder
// ═══════════════════════════════════════════
browseFolderBtn.addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) {
    currentFolder = folder;
    folderPathInput.value = folder;
  }
});

// Reset to desktop
resetDesktopBtn.addEventListener('click', async () => {
  currentFolder = await window.api.getDesktopPath();
  folderPathInput.value = currentFolder;
});

// ═══════════════════════════════════════════
// Declutter
// ═══════════════════════════════════════════
declutterBtn.addEventListener('click', async () => {
  if (!currentFolder) return;

  declutterBtn.disabled = true;
  declutterBtn.classList.add('loading');
  declutterBtn.innerHTML = '<span class="btn-aero-shine"></span><span class="btn-aero-content"><svg class="btn-aero-icon spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Organizing...</span>';
  setCompanionFace('working');

  try {
    const results = await window.api.declutter(currentFolder);
    displayResults(results);

    if (results.moved.length > 0) {
      hasHistory = true;
      undoBtn.disabled = false;
      setCompanionFace('success', true);
    } else if (results.errors.length === 0) {
      setCompanionFace('tidy', true);
    }
  } catch (err) {
    addLogEntry(`Error: ${err.message}`, 'error');
    setCompanionFace('error', true);
  } finally {
    declutterBtn.disabled = false;
    declutterBtn.classList.remove('loading');
    declutterBtn.innerHTML = '<span class="btn-aero-shine"></span><span class="btn-aero-content"><svg class="btn-aero-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Declutter Now</span>';
  }
});

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
  setCompanionFace(isAutoMode ? 'auto' : 'idle');
});

// ═══════════════════════════════════════════
// Undo
// ═══════════════════════════════════════════
undoBtn.addEventListener('click', async () => {
  if (!hasHistory) return;

  undoBtn.disabled = true;
  setCompanionFace('undo', true);
  try {
    const results = await window.api.undoLast();
    if (results.restored.length > 0) {
      addLogEntry(`Restored ${results.restored.length} files to original location`, 'success');
    }
    if (results.errors.length > 0) {
      results.errors.forEach(e => {
        addLogEntry(`Failed to restore: ${e.file} - ${e.error}`, 'error');
      });
    }
    hasHistory = false;
  } catch (err) {
    addLogEntry(`Undo error: ${err.message}`, 'error');
    setCompanionFace('error', true);
  }
});

// ═══════════════════════════════════════════
// Listen for auto-organize events
// ═══════════════════════════════════════════
window.api.onAutoOrganize((results) => {
  displayResults(results, true);
  if (results.moved.length > 0) {
    hasHistory = true;
    undoBtn.disabled = false;
    setCompanionFace('success', true);
  }
});

// ═══════════════════════════════════════════
// Display results
// ═══════════════════════════════════════════
function displayResults(results, isAuto = false) {
  const prefix = isAuto ? '[Auto] ' : '';

  if (results.moved.length === 0 && results.errors.length === 0) {
    addLogEntry(`${prefix}No files to organize - folder is already tidy!`, 'success');
    return;
  }

  // Summary
  if (results.moved.length > 0) {
    addLogEntry(
      `${prefix}Organized <span class="summary-count">${results.moved.length}</span> file${results.moved.length !== 1 ? 's' : ''} into <span class="summary-count">${results.foldersCreated.length || 'existing'}</span> folder${results.foldersCreated.length !== 1 ? 's' : ''}`,
      'success'
    );
  }

  // Individual files
  results.moved.forEach(item => {
    addLogEntry(
      `<span class="file-name">${item.file}</span> → <span class="category">${item.category}</span>`
    );
  });

  // Errors
  results.errors.forEach(item => {
    addLogEntry(`Failed: ${item.file} - ${item.error}`, 'error');
  });
}

// ═══════════════════════════════════════════
// Add log entry
// ═══════════════════════════════════════════
function addLogEntry(html, type = '') {
  // Remove empty state
  const emptyEl = logContainer.querySelector('.log-empty');
  if (emptyEl) emptyEl.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  entry.innerHTML = `<span class="timestamp">${time}</span> ${html}`;

  // Insert at top
  logContainer.insertBefore(entry, logContainer.firstChild);

  // Keep max 100 entries
  while (logContainer.children.length > 100) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// ═══════════════════════════════════════════
// SETTINGS — Load config into form
// ═══════════════════════════════════════════
async function loadSettingsIntoForm() {
  settingsData = await window.api.getConfig();
  defaultCategories = await window.api.getDefaultCategories();

  renderCustomRules();
  renderExclusions();
  renderFolderNames();
  renderShortcutSettings();
}

// ═══════════════════════════════════════════
// SETTINGS — Custom Rules
// ═══════════════════════════════════════════
function renderCustomRules() {
  customRulesList.innerHTML = '';

  settingsData.customRules.forEach((rule, index) => {
    const row = document.createElement('div');
    row.className = 'settings-row';
    row.innerHTML = `
      <input type="text" class="input-sm rule-ext" value="${escapeHtml(rule.extension)}"
             placeholder=".psd" style="width:70px" data-index="${index}">
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

  // Attach change listeners for extension inputs
  customRulesList.querySelectorAll('.rule-ext').forEach(input => {
    input.addEventListener('change', (e) => {
      const i = parseInt(e.target.dataset.index);
      let val = e.target.value.trim().toLowerCase();
      if (val && !val.startsWith('.')) val = '.' + val;
      settingsData.customRules[i].extension = val;
      e.target.value = val;
    });
  });

  // Attach change listeners for folder inputs
  customRulesList.querySelectorAll('.rule-folder').forEach(input => {
    input.addEventListener('change', (e) => {
      const i = parseInt(e.target.dataset.index);
      settingsData.customRules[i].folder = e.target.value.trim();
    });
  });

  // Attach remove button listeners
  customRulesList.querySelectorAll('.rule-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.currentTarget.dataset.index);
      settingsData.customRules.splice(i, 1);
      renderCustomRules();
    });
  });
}

addRuleBtn.addEventListener('click', () => {
  settingsData.customRules.push({ extension: '', folder: '' });
  renderCustomRules();
  // Focus the new extension input
  const inputs = customRulesList.querySelectorAll('.rule-ext');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

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
  // Strip empty/incomplete custom rules
  settingsData.customRules = settingsData.customRules.filter(
    r => r.extension && r.folder
  );

  // Collect current input values for folder names (in case user didn't blur)
  folderNamesList.querySelectorAll('.folder-name-input').forEach(input => {
    const cat = input.dataset.category;
    const val = input.value.trim();
    if (val && val !== cat) {
      settingsData.folderNames[cat] = val;
    } else {
      delete settingsData.folderNames[cat];
    }
  });

  // Collect current input values for custom rules
  customRulesList.querySelectorAll('.rule-ext').forEach(input => {
    const i = parseInt(input.dataset.index);
    if (settingsData.customRules[i]) {
      let val = input.value.trim().toLowerCase();
      if (val && !val.startsWith('.')) val = '.' + val;
      settingsData.customRules[i].extension = val;
    }
  });
  customRulesList.querySelectorAll('.rule-folder').forEach(input => {
    const i = parseInt(input.dataset.index);
    if (settingsData.customRules[i]) {
      settingsData.customRules[i].folder = input.value.trim();
    }
  });

  // Re-strip after collecting
  settingsData.customRules = settingsData.customRules.filter(
    r => r.extension && r.folder
  );

  // Collect shortcut folder names
  settingsData.shortcuts.gamesFolderName = gamesFolderInput.value.trim() || 'Games';
  settingsData.shortcuts.appsFolderName = appsFolderInput.value.trim() || 'Applications';

  await window.api.saveConfig(settingsData);
  addLogEntry('Settings saved successfully', 'success');
  showMain();
});

resetSettingsBtn.addEventListener('click', async () => {
  settingsData = await window.api.resetConfig();
  renderCustomRules();
  renderExclusions();
  renderFolderNames();
  renderShortcutSettings();
  addLogEntry('Settings reset to defaults', 'success');
});

// ═══════════════════════════════════════════
// Init
// ═══════════════════════════════════════════
init();
