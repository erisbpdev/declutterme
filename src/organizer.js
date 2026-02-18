const fs = require('fs');
const path = require('path');
const { getCategoryForExtension } = require('./categories');
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

async function organizeFolder(targetFolder, config) {
  config = config || getConfig();

  const results = {
    moved: [],
    skipped: [],
    errors: [],
    foldersCreated: []
  };

  if (!fs.existsSync(targetFolder)) {
    results.errors.push({ file: targetFolder, error: 'Folder does not exist' });
    return results;
  }

  const entries = fs.readdirSync(targetFolder, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) continue;

    const filePath = path.join(targetFolder, entry.name);

    if (shouldIgnoreFile(filePath, config)) {
      results.skipped.push({ file: entry.name, reason: 'System/ignored/excluded file' });
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!ext) {
      results.skipped.push({ file: entry.name, reason: 'No extension' });
      continue;
    }

    // Determine the target folder name
    let folderName;
    let category;

    // Priority 1: Handle .lnk files with shortcut analyzer
    if (ext === '.lnk' && config.shortcuts && config.shortcuts.enabled) {
      const shortcutCategory = categorizeShortcut(filePath);
      category = shortcutCategory;
      folderName = shortcutCategory === 'Games'
        ? (config.shortcuts.gamesFolderName || 'Games')
        : (config.shortcuts.appsFolderName || 'Applications');
    }
    // Priority 2: Check custom rules
    else {
      const customRule = (config.customRules || []).find(
        r => r.extension && r.extension.toLowerCase() === ext
      );

      if (customRule && customRule.folder) {
        folderName = customRule.folder;
        category = customRule.folder;
      }
      // Priority 3: Default category with optional folder name override
      else {
        category = getCategoryForExtension(ext);
        folderName = (config.folderNames && config.folderNames[category])
          ? config.folderNames[category]
          : category;
      }
    }

    // Sanitize folder name (remove filesystem-invalid characters)
    folderName = folderName.replace(/[<>:"/\\|?*]/g, '').trim() || category;

    const categoryFolder = path.join(targetFolder, folderName);

    try {
      if (!fs.existsSync(categoryFolder)) {
        fs.mkdirSync(categoryFolder, { recursive: true });
        results.foldersCreated.push(folderName);
      }

      let destPath = path.join(categoryFolder, entry.name);

      // Handle duplicate filenames
      if (fs.existsSync(destPath)) {
        const baseName = path.basename(entry.name, ext);
        let counter = 1;
        while (fs.existsSync(destPath)) {
          destPath = path.join(categoryFolder, `${baseName} (${counter})${ext}`);
          counter++;
        }
      }

      fs.renameSync(filePath, destPath);
      results.moved.push({
        file: entry.name,
        from: filePath,
        to: destPath,
        category: folderName
      });
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
        fs.renameSync(item.to, item.from);
        results.restored.push(item.file);
      }
    } catch (err) {
      results.errors.push({ file: item.file, error: err.message });
    }
  }

  return results;
}

module.exports = { organizeFolder, undoOrganize };
