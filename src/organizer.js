const fs = require('fs');
const path = require('path');
const { getCategoryForExtension, getAllCategories } = require('./categories');
const { get: getConfig } = require('./config');
const { categorizeShortcut } = require('./shortcuts');

const IGNORED_FILES = [
  'desktop.ini',
  'thumbs.db',
  '.ds_store',
  '.localized'
];

const IGNORED_EXTENSIONS = [
  '.lnk',  // Windows shortcuts
  '.url',  // Internet shortcuts
  '.ini'
];

function shouldIgnoreFile(filePath, config) {
  const fileName = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  // Always ignore system files
  if (IGNORED_FILES.includes(fileName)) return true;
  if (fileName.startsWith('.')) return true;

  // Check user-excluded extensions
  if (config.excludedExtensions && config.excludedExtensions.includes(ext)) return true;

  // Check hardcoded ignored extensions, but skip .lnk if shortcuts enabled
  const effectiveIgnored = config.shortcuts && config.shortcuts.enabled
    ? IGNORED_EXTENSIONS.filter(e => e !== '.lnk')
    : IGNORED_EXTENSIONS;

  if (effectiveIgnored.includes(ext)) return true;

  return false;
}

// Strip filesystem-invalid characters and anything that could escape the
// target folder (e.g. "..") or that Windows silently mangles (trailing dots/spaces)
function sanitizeFolderName(name, fallback) {
  const cleaned = String(name || '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .trim()
    .replace(/[. ]+$/, '');
  if (!cleaned || /^\.+$/.test(cleaned)) return fallback;
  return cleaned;
}

// Find a free path by appending " (1)", " (2)", ... before the extension
function uniquePath(destPath) {
  if (!fs.existsSync(destPath)) return destPath;
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  const baseName = path.basename(destPath, ext);
  let counter = 1;
  let candidate;
  do {
    candidate = path.join(dir, `${baseName} (${counter})${ext}`);
    counter++;
  } while (fs.existsSync(candidate));
  return candidate;
}

// Every folder name this app could create, given the current config
function getManagedFolderNames(config) {
  config = config || getConfig();
  const names = new Set();
  for (const category of [...Object.keys(getAllCategories()), 'Other']) {
    const custom = config.folderNames && config.folderNames[category];
    names.add(sanitizeFolderName(custom || category, category));
  }
  for (const rule of config.customRules || []) {
    if (rule.folder) names.add(sanitizeFolderName(rule.folder, rule.folder));
  }
  if (config.shortcuts) {
    names.add(sanitizeFolderName(config.shortcuts.gamesFolderName || 'Games', 'Games'));
    names.add(sanitizeFolderName(config.shortcuts.appsFolderName || 'Applications', 'Applications'));
  }
  return new Set([...names].filter(Boolean).map(n => n.toLowerCase()));
}

// Case-insensitive glob: "*" = any run of characters, "?" = one character
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
}

function matchesPattern(fileName, pattern) {
  if (!pattern) return false;
  try {
    return globToRegExp(pattern.trim()).test(fileName);
  } catch {
    return false;
  }
}

function normalizePath(p) {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

// Works out which folder a file belongs in. Priority:
//   1. Name-pattern rules (e.g. "Screenshot*")  — most specific, checked first
//   2. Shortcut analyzer for .lnk files
//   3. Extension rules
//   4. Default category (with optional folder name override)
// Returns null for files with no extension that no pattern rule claims.
function resolveDestination(fileName, filePath, config) {
  const ext = path.extname(fileName).toLowerCase();
  const rules = (config.customRules || []).filter(r => r.folder);
  let folderName;
  let category;
  let rule = null;

  const patternRule = rules.find(r => r.type === 'pattern' && matchesPattern(fileName, r.pattern));

  if (patternRule) {
    folderName = category = patternRule.folder;
    rule = patternRule.pattern;
  } else if (!ext) {
    return null;
  } else if (ext === '.lnk' && config.shortcuts && config.shortcuts.enabled) {
    category = categorizeShortcut(filePath);
    folderName = category === 'Games'
      ? (config.shortcuts.gamesFolderName || 'Games')
      : (config.shortcuts.appsFolderName || 'Applications');
  } else {
    const extRule = rules.find(
      r => r.type !== 'pattern' && r.extension && r.extension.toLowerCase() === ext
    );
    if (extRule) {
      folderName = category = extRule.folder;
      rule = extRule.extension;
    } else {
      category = getCategoryForExtension(ext);
      folderName = (config.folderNames && config.folderNames[category]) || category;
    }
  }

  // Invalid custom names (e.g. "..") fall back to the default category
  const fallback = ext ? getCategoryForExtension(ext) : 'Other';
  return {
    folderName: sanitizeFolderName(folderName, sanitizeFolderName(category, fallback)),
    rule
  };
}

async function organizeFolder(targetFolder, config, { dryRun = false, onlyFiles = null } = {}) {
  config = config || getConfig();

  const results = {
    moved: [],
    skipped: [],
    errors: [],
    foldersCreated: [],
    pinned: [],
    dryRun
  };

  if (!targetFolder || !fs.existsSync(targetFolder)) {
    results.errors.push({ file: targetFolder, error: 'Folder does not exist' });
    return results;
  }

  const entries = fs.readdirSync(targetFolder, { withFileTypes: true });
  const only = Array.isArray(onlyFiles) ? new Set(onlyFiles) : null;
  const pinned = new Set((config.pinnedFiles || []).map(normalizePath));

  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    // Organizing a hand-picked selection from the preview
    if (only && !only.has(entry.name)) continue;

    const filePath = path.join(targetFolder, entry.name);

    if (shouldIgnoreFile(filePath, config)) {
      results.skipped.push({ file: entry.name, reason: 'System/ignored/excluded file' });
      continue;
    }

    const dest = resolveDestination(entry.name, filePath, config);
    if (!dest) {
      results.skipped.push({ file: entry.name, reason: 'No extension' });
      continue;
    }

    const { folderName, rule } = dest;
    const categoryFolder = path.join(targetFolder, folderName);

    if (pinned.has(normalizePath(filePath))) {
      if (dryRun) {
        // Report where it *would* go so the preview can offer unpinning
        results.pinned.push({
          file: entry.name,
          from: filePath,
          to: path.join(categoryFolder, entry.name),
          category: folderName,
          rule
        });
      } else {
        results.skipped.push({ file: entry.name, reason: 'Pinned' });
      }
      continue;
    }

    try {
      if (dryRun) {
        // Preview only — don't move anything
        results.moved.push({
          file: entry.name,
          from: filePath,
          to: path.join(categoryFolder, entry.name),
          category: folderName,
          rule
        });
      } else {
        if (!fs.existsSync(categoryFolder)) {
          fs.mkdirSync(categoryFolder, { recursive: true });
          results.foldersCreated.push(folderName);
        }

        const destPath = uniquePath(path.join(categoryFolder, entry.name));

        fs.renameSync(filePath, destPath);
        results.moved.push({
          file: entry.name,
          from: filePath,
          to: destPath,
          category: folderName,
          rule
        });
      }
    } catch (err) {
      results.errors.push({ file: entry.name, error: err.message });
    }
  }

  return results;
}

async function undoOrganize(movedFiles) {
  const results = { restored: [], errors: [] };

  for (const item of movedFiles.reverse()) {
    try {
      if (fs.existsSync(item.to)) {
        // Never overwrite a file that appeared at the original spot since —
        // on Windows renameSync would silently replace it
        const restorePath = uniquePath(item.from);
        fs.renameSync(item.to, restorePath);
        results.restored.push(item.file);
      } else {
        results.errors.push({ file: item.file, error: 'File no longer exists in organized folder' });
      }
    } catch (err) {
      results.errors.push({ file: item.file, error: err.message });
    }
  }

  return results;
}

// Only removes empty folders the app itself manages (category / rule / shortcut
// folders) — never a user's own empty folders
async function cleanEmptyFolders(targetFolder) {
  const cleaned = [];
  const errors = [];
  const managed = getManagedFolderNames();

  try {
    const entries = fs.readdirSync(targetFolder, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!managed.has(entry.name.toLowerCase())) continue;
      const dirPath = path.join(targetFolder, entry.name);
      try {
        const contents = fs.readdirSync(dirPath);
        if (contents.length === 0) {
          fs.rmdirSync(dirPath);
          cleaned.push(entry.name);
        }
      } catch (err) {
        errors.push({ folder: entry.name, error: err.message });
      }
    }
  } catch (err) {
    errors.push({ folder: targetFolder, error: err.message });
  }

  return { cleaned, errors };
}

module.exports = { organizeFolder, undoOrganize, cleanEmptyFolders };
