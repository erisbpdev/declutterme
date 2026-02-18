const { execSync } = require('child_process');
const path = require('path');

// Known game platform directories (case-insensitive matching)
const GAME_PATH_INDICATORS = [
  'steam', 'steamapps', 'steampowered',
  'epic games',
  'riot games', 'riot client',
  'gog galaxy',
  'origin games', 'ea games', 'electronic arts',
  'ubisoft', 'ubisoft game launcher',
  'blizzard', 'battle.net',
  'xbox', 'windowsapps',
  'bethesda.net launcher',
  'rockstar games',
  'program files\\games', 'program files (x86)\\games',
  'roblox',
  'minecraft',
  'valorant',
  'league of legends',
  'fortnite'
];

// Known game platform launcher executables
const GAME_EXECUTABLES = [
  'steam.exe',
  'epicgameslauncher.exe',
  'origin.exe',
  'eadesktop.exe',
  'galaxyclient.exe',
  'bethesdalauncher.exe',
  'riotclientservices.exe',
  'battle.net.exe',
  'ubisoftconnect.exe',
  'playnite.desktop.exe',
  'gog.exe',
  'rockstarlauncher.exe',
  'riotclient.exe'
];

function getShortcutTarget(lnkPath) {
  if (process.platform !== 'win32') {
    return null;
  }
  try {
    // Escape single quotes for PowerShell
    const safePath = lnkPath.replace(/'/g, "''");
    const cmd = `powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).CreateShortcut('${safePath}').TargetPath"`;
    const result = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
    return result || null;
  } catch {
    return null;
  }
}

function categorizeShortcut(lnkPath) {
  const target = getShortcutTarget(lnkPath);
  if (!target) return 'Applications';

  const targetLower = target.toLowerCase();
  const targetBasename = path.basename(targetLower);

  // Check if the target is in a known game directory
  for (const indicator of GAME_PATH_INDICATORS) {
    if (targetLower.includes(indicator)) {
      return 'Games';
    }
  }

  // Check if the target is a game launcher itself
  for (const exe of GAME_EXECUTABLES) {
    if (targetBasename === exe) {
      return 'Games';
    }
  }

  return 'Applications';
}

module.exports = { getShortcutTarget, categorizeShortcut };
