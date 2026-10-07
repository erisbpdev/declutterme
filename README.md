# DeclutterMe

**Your friendly desktop buddy that organizes files into tidy folders by type.**

DeclutterMe is a lightweight Electron app with a companion called **Tidy** `[^_^]` — a retro ASCII robot that lives in your system tray and keeps your desktop clean. One click and Tidy sorts your files into categorized folders. No config needed, works out of the box.

![Electron](https://img.shields.io/badge/Electron-30-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## How It Works

1. **Pick a folder** — defaults to your Desktop
2. **Click "Declutter Now"** — Tidy scans every file and moves them into categorized folders
3. **Done** — Documents, Images, Audio, Video, Archives, Code, and more

Tidy recognizes **100+ file extensions** across **10 categories** and handles duplicates, hidden files, and system files automatically.

```
Desktop/
  report.pdf        -->  Documents/report.pdf
  vacation.jpg      -->  Images/vacation.jpg
  song.mp3          -->  Audio/song.mp3
  project.zip       -->  Archives/project.zip
  app.exe           -->  Executables/app.exe
```

---

## Features

| Feature | Description |
|---------|-------------|
| **One-Click Organize** | Select a folder, press the button, done |
| **Auto Mode** | Background file watcher — new files get sorted the moment they land |
| **Preview & Pick** | See exactly where every file will go, untick the ones you want left alone |
| **Pinned Files** | Pin a file once and it's never moved — not by the button, auto mode, schedule or hotkey |
| **Multi-Level Undo** | Undo the last 10 organize runs, without ever overwriting newer files |
| **Custom Rules** | Route by extension (`.blend` -> `3D Models`) or by name pattern (`Screenshot*` -> `Screenshots`) |
| **File Exclusions** | Exclude specific extensions from being organized |
| **Folder Name Overrides** | Rename default category folders (e.g. `Images` -> `Pictures`) |
| **Shortcut Organization** | Categorize Windows `.lnk` shortcuts as Games or Applications |
| **Schedule** | Organize hourly, every 6h, daily or weekly — survives app restarts |
| **Global Hotkey** | `Ctrl+Shift+D` organizes from anywhere (configurable) |
| **Empty Folder Cleanup** | Removes empty category folders — never your own empty folders |
| **Profiles & Stats** | Save folder + rule presets, and see how much Tidy has sorted for you |
| **System Tray** | Minimize to tray, right-click for quick actions |
| **Cross-Platform** | Windows (NSIS + portable), macOS (DMG), Linux (AppImage) |
| **Tidy Companion** | ASCII robot buddy with reactive expressions |

---

## Tidy — The Companion

Tidy is a retro ASCII robot face that reacts to what's happening in the app:

```
[^_^]  Idle — ready and waiting
[o_o]  Working — organizing your files
[*_*]  Success — files moved!
[>_<]  Error — something went wrong
[o_O]  Undo — restoring files
[@_@]  Settings — tweaking config
[•_•]  Auto — watching in background
[°_°]  Preview — just peeking
[^-^]  Tidy — folder already clean
```

Tidy lives in the logo orb and the title bar. Expressions animate with a pop effect and temporary states revert after 3 seconds.

---

## File Categories

DeclutterMe sorts files into these default categories:

| Category | Extensions |
|----------|-----------|
| **Documents** | pdf, doc, docx, txt, xls, xlsx, ppt, pptx, odt, rtf, csv, epub, md |
| **Images** | jpg, jpeg, png, gif, bmp, svg, webp, ico, tiff, raw, heic, psd, ai, eps |
| **Audio** | mp3, wav, flac, aac, ogg, wma, m4a, opus, aiff, midi |
| **Video** | mp4, avi, mkv, mov, wmv, flv, webm, m4v, mpeg, 3gp |
| **Archives** | zip, rar, 7z, tar, gz, bz2, xz, iso, dmg, cab |
| **Code** | js, ts, py, java, cpp, c, cs, rb, go, rs, php, swift, html, css, json, yaml, sql, sh, bat |
| **Executables** | exe, msi, app, deb, rpm, appimage, apk, jar |
| **Fonts** | ttf, otf, woff, woff2, eot |
| **Design** | fig, sketch, xd, indd, blend, obj, fbx, stl |
| **Other** | Everything else |

All category names can be overridden in Settings.

---

## Customization

Open **Settings** (gear icon in the title bar) to configure:

### Custom Rules
Each rule matches either by **extension** or by **file name**. Name rules use simple wildcards — `*` matches anything, `?` matches exactly one character — and ignore upper/lowercase.

```
Ext   .psd           -->  Design Files
Ext   .blend         -->  3D Models
Name  Screenshot*    -->  Screenshots
Name  *invoice*      -->  Finance
Name  README         -->  Notes        (name rules work on files without an extension too)
```

### Preview & Pinned Files
**Preview** opens a list of every file grouped by where it'll go. Untick files to skip them just this once, or hit the 📌 pin to make DeclutterMe leave a file alone forever. Pinned files are listed in Settings, where you can unpin them.

### Excluded Extensions
Prevent certain file types from being organized. Add extensions like `.tmp`, `.bak`, `.log` to the exclusion list.

### Folder Name Overrides
Rename any default category folder:

```
Documents  -->  My Documents
Images     -->  Pictures
Video      -->  Movies
```

### Shortcut Organization (Windows)
When enabled, DeclutterMe analyzes `.lnk` shortcut targets to determine if they point to games or applications. Detection checks against 25+ game platform path indicators (Steam, Epic, Riot, Ubisoft, etc.) and 14 known launcher executables.

---

## Settings Storage

Configuration is stored as JSON in the platform's user data directory:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\DeclutterMe\settings.json` |
| macOS | `~/Library/Application Support/DeclutterMe/settings.json` |
| Linux | `~/.config/DeclutterMe/settings.json` |

---

## Organization Priority

When organizing a file, DeclutterMe checks in this order:

1. **Pinned?** — pinned files are never moved
2. **Name rules** — if the file name matches a pattern rule, use that folder
3. **Shortcut analysis** — if enabled and the file is `.lnk`, categorize as Games/Applications
4. **Extension rules** — if the extension matches a user-defined rule, use that folder
5. **Default categories** — look up the extension in the built-in category map
6. **Folder name override** — apply any custom folder name from settings
7. **Fallback** — move to "Other"

Files that are always skipped:
- System files (`desktop.ini`, `thumbs.db`, `.DS_Store`)
- Hidden files (starting with `.`)
- Shortcut/config files (`.lnk`, `.url`, `.ini`) unless shortcut org is enabled
- Files without an extension, unless a name rule claims them

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

### Install & Run

```bash
# Clone the repository
git clone https://github.com/erisbpdev/declutterme.git
cd declutterme

# Install dependencies
npm install

# Run in development
npm start
```

### Run Tests

```bash
npm test
```

Uses Node's built-in test runner — no extra dependencies. Tests live in `test/` and cover sorting, rules, pins, undo and cleanup against real temp folders.

### Build Distributables

```bash
# Build for current platform
npm run build
```

Output will be in `app/dist/`:

| Platform | Output |
|----------|--------|
| Windows | NSIS installer + portable `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage` |

---

## CI/CD

A GitHub Actions workflow (`.github/workflows/build.yml`) builds and publishes releases automatically when a version tag is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow runs the test suite, then builds on Windows, macOS, and Linux in parallel using Node.js 22 and electron-builder.

---

## Project Structure

```
app/
  main.js               Electron main process — app lifecycle, IPC, tray
  preload.js            Secure IPC bridge (contextBridge)
  package.json          Dependencies & electron-builder config

  src/
    organizer.js        Core file organization engine with undo
    categories.js       100+ extensions mapped to 10 categories
    config.js           Settings persistence (JSON)
    stats.js            Usage stats (files organized, sessions, top categories)
    watcher.js          Chokidar-based auto-mode file watcher
    shortcuts.js        Windows .lnk shortcut analyzer (PowerShell)
    tray.js             System tray icon & context menu

  renderer/
    index.html          App UI layout (frameless window)
    app.js              Frontend logic, state, companion system
    styles.css          Japanese stationery / sakura paper design

  test/
    organizer.test.js   Organizer test suite (node:test)

  assets/
    icon.png            App icon

website/
  app/
    page.js             Next.js landing page
    layout.js           Root layout & metadata
    globals.css         Landing page styles
  components/
    GlassSurface.js     SVG filter glass distortion component
    GlassSurface.css    Glass surface styles
  package.json          Next.js dependencies
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop app | Electron 30 |
| File watching | Chokidar 3.6 |
| Shortcut analysis | PowerShell (Windows COM) |
| Packaging | electron-builder |
| Landing page | Next.js 14, React 18 |
| Glass effects | Custom SVG displacement filters |
| Design | Retro Japanese stationery — warm paper & sakura ink |
| Tests | Node.js built-in test runner |
| CI/CD | GitHub Actions |

---

## Architecture

```
┌─────────────────────────────────┐
│        Renderer Process         │
│  index.html + app.js + CSS      │
│  Companion system, settings UI  │
└────────────┬────────────────────┘
             │ IPC (contextBridge)
┌────────────┴────────────────────┐
│         Main Process            │
│  main.js + tray.js              │
│  Window management, IPC routing │
└────────────┬────────────────────┘
             │
    ┌────────┼────────┬───────────┐
    │        │        │           │
┌───┴──┐ ┌──┴───┐ ┌──┴──┐ ┌─────┴────┐
│config│ │organ-│ │watch│ │shortcuts │
│ .js  │ │izer  │ │er   │ │  .js     │
│      │ │ .js  │ │ .js │ │(Windows) │
└──────┘ └──┬───┘ └─────┘ └──────────┘
             │
        ┌────┴────┐
        │catego-  │
        │ries.js  │
        └─────────┘
```

**Security:** Context isolation is enabled. The renderer has no direct access to Node.js APIs — all system interactions go through the preload bridge (`preload.js`) which exposes a minimal, typed API surface.

---

## License

MIT

---

**Made with `[^_^]` by [Eris](mailto:erisbp.dev@gmail.com)**
