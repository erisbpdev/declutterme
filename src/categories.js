const FILE_CATEGORIES = {
  'Documents': [
    'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx',
    'odt', 'ods', 'odp', 'rtf', 'csv', 'pages', 'numbers', 'key',
    'epub', 'md'
  ],
  'Images': [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico',
    'tiff', 'tif', 'raw', 'cr2', 'nef', 'heic', 'heif', 'psd',
    'ai', 'eps'
  ],
  'Audio': [
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus',
    'aiff', 'mid', 'midi'
  ],
  'Video': [
    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v',
    'mpg', 'mpeg', '3gp', 'ts'
  ],
  'Archives': [
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'dmg',
    'cab'
  ],
  'Code': [
    'js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'rb', 'go',
    'rs', 'php', 'swift', 'kt', 'scala', 'html', 'css', 'scss',
    'sass', 'less', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini',
    'cfg', 'sql', 'sh', 'bat', 'ps1', 'lua', 'r', 'dart', 'vue',
    'jsx', 'tsx'
  ],
  'Executables': [
    'exe', 'msi', 'app', 'deb', 'rpm', 'appimage', 'apk', 'jar'
  ],
  'Fonts': [
    'ttf', 'otf', 'woff', 'woff2', 'eot', 'fon'
  ],
  'Design': [
    'fig', 'sketch', 'xd', 'indd', 'blend', 'obj', 'fbx', 'stl',
    '3ds'
  ]
};

function getCategoryForExtension(ext) {
  const lowerExt = ext.toLowerCase().replace('.', '');
  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.includes(lowerExt)) {
      return category;
    }
  }
  return 'Other';
}

function getAllCategories() {
  return { ...FILE_CATEGORIES };
}

module.exports = { FILE_CATEGORIES, getCategoryForExtension, getAllCategories };
