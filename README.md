# DeclutterMe

**A free desktop app that sorts your files into folders. Meet Tidy `[^_^]`, who does the sorting.**

You pick a folder (your Desktop by default), press **Declutter now**, and Tidy moves every file into a folder by type: Documents, Images, Audio, Video and so on. You can preview the moves first, pin files that should stay put, add your own rules, and undo if you change your mind.

![Electron](https://img.shields.io/badge/Electron-30-47848F?logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-green)

```
Desktop/
  report.pdf          ->  Documents/report.pdf
  vacation.jpg        ->  Images/vacation.jpg
  song.mp3            ->  Audio/song.mp3
  Screenshot 1.png    ->  Screenshots/Screenshot 1.png    (your own rule)
  taxes-2026.xlsx         stays where it is               (pinned)
```

---

## Download

Grab the latest version from the [releases page](https://github.com/erisbpdev/declutterme/releases/latest).

| System | File | Updates itself? |
|--------|------|-----------------|
| Windows | `DeclutterMe-Setup-x.y.z.exe` (installer) | Yes |
| Windows | `DeclutterMe-x.y.z.exe` (portable, no install) | No |
| macOS (Apple Silicon) | `DeclutterMe-x.y.z-arm64.dmg` | No |
| Linux | `DeclutterMe-x.y.z.AppImage` | Yes |

The builds aren't code-signed yet, so the first launch needs one extra click. On Windows, choose **More info → Run anyway**. On macOS, right-click the app and choose **Open**.

There's no Intel Mac build at the moment.

---

## What it does

| Feature | Details |
|---------|---------|
| **One-click sorting** | 100+ file types in 10 categories, out of the box |
| **Preview** | See where every file will go before anything moves. Untick a file to skip it once |
| **Pinned files** | Pin a file and it never moves, whether you sort by hand, on a schedule, by hotkey or in auto mode |
| **Custom rules** | Match by extension (`.blend` → `3D Models`) or by name (`Screenshot*` → `Screenshots`) |
| **Auto mode** | Watches the folder and sorts new files as they arrive |
| **Schedule** | Hourly, every 6 hours, daily or weekly. Keeps time across restarts |
| **Undo** | Goes back up to 10 runs. If a new file took an old file's spot, it gets a number instead of being replaced |
| **Global hotkey** | `Ctrl+Shift+D` sorts from any app. You can change it |
| **Cleanup** | Removes empty folders with Tidy's folder names. Your other empty folders stay |
| **Excluded types** | File extensions you never want touched |
| **Folder names** | Rename the default folders, e.g. `Images` → `Pictures` |
| **Shortcuts (Windows)** | Sort `.lnk` shortcuts into Games and Applications |
| **Profiles & stats** | Save folder + rule presets, see how many files Tidy has sorted |
| **Light & dark** | Follows your system, or pick one in Settings |
| **Auto-updates** | The Windows installer and Linux AppImage download new versions and install them on restart |
| **Tray** | Keeps running in the tray while auto mode or a schedule is on |

---

## Tidy

Tidy lives on a little screen at the top of the app. Its messages show up there and go back to a resting line after a few seconds. The line underneath says what it's doing: idle, watching a folder, or waiting for the next scheduled run.

```
[^_^]  idle
[o_o]  sorting files
[*_*]  done
[>_<]  something went wrong
[o_O]  undoing
[•_•]  auto mode is on
[°_°]  showing a preview
[^-^]  nothing to sort, already tidy
```

---

## File categories

| Category | Some of the extensions |
|----------|------------------------|
| **Documents** | pdf, doc, docx, txt, xls, xlsx, ppt, pptx, odt, rtf, csv, epub, md |
| **Images** | jpg, jpeg, png, gif, bmp, svg, webp, ico, tiff, raw, heic, psd, ai, eps |
| **Audio** | mp3, wav, flac, aac, ogg, wma, m4a, opus, aiff, midi |
| **Video** | mp4, avi, mkv, mov, wmv, flv, webm, m4v, mpeg, 3gp |
| **Archives** | zip, rar, 7z, tar, gz, bz2, xz, iso, dmg, cab |
| **Code** | js, ts, py, java, cpp, c, cs, rb, go, rs, php, swift, html, css, json, yaml, sql, sh, bat |
| **Executables** | exe, msi, app, deb, rpm, appimage, apk, jar |
| **Fonts** | ttf, otf, woff, woff2, eot |
| **Design** | fig, sketch, xd, indd, blend, obj, fbx, stl |
| **Other** | anything else |

The full list is in [`src/categories.js`](src/categories.js).

---

## Settings

Open **Settings** with the gear icon in the title bar.

### Custom rules

Each rule matches either by **extension** or by **file name**. In name rules, `*` matches anything and `?` matches exactly one character. Upper and lower case don't matter.

```
Ext   .psd           ->  Design Files
Ext   .blend         ->  3D Models
Name  Screenshot*    ->  Screenshots
Name  *invoice*      ->  Finance
Name  README         ->  Notes        (name rules also work on files with no extension)
```

### Preview and pinned files

**Preview** lists every file grouped by the folder it's going to. Untick a file to skip it this time, or click the pin to keep it where it is for good. Pinned files show up in Settings, where you can unpin them.

### Where settings are saved

| System | Path |
|--------|------|
| Windows | `%APPDATA%\DeclutterMe\settings.json` |
| macOS | `~/Library/Application Support/DeclutterMe/settings.json` |
| Linux | `~/.config/DeclutterMe/settings.json` |

### How Tidy picks a folder

For each file, in this order:

1. **Pinned?** Then it stays.
2. **Name rules.** If the name matches one, that folder wins.
3. **Shortcuts.** If shortcut sorting is on and the file is a `.lnk`, it goes to Games or Applications.
4. **Extension rules.** Your own rules by extension.
5. **Built-in categories.** The default folder for that extension, using your renamed folder name if you set one.
6. **Other.** Anything left over.

Always skipped: system files (`desktop.ini`, `thumbs.db`, `.DS_Store`), hidden files starting with `.`, `.lnk` / `.url` / `.ini` files (unless shortcut sorting is on), and files with no extension (unless a name rule matches them).

---

## Running it from source

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
git clone https://github.com/erisbpdev/declutterme.git
cd declutterme
npm install
npm start
```

Updates are switched off when running from source.

### Tests

```bash
npm test
```

This uses Node's built-in test runner, so there's nothing extra to install. The tests in `test/` sort, pin, undo and clean up real files in temporary folders.

### Building

```bash
npm run build
```

The builds end up in `dist/`: an NSIS installer and a portable `.exe` on Windows, a `.dmg` on macOS and an `.AppImage` on Linux.

---

## Releasing a new version

GitHub Actions (`.github/workflows/build.yml`) runs the tests and builds all three systems whenever a version tag is pushed.

1. Bump `version` in `package.json` and commit.
2. Tag it and push the tag: `git tag v1.2.1 && git push origin v1.2.1`
3. The build creates a **draft** release on GitHub. Check the files, then press **Publish**.
4. Installed copies notice the new version within a few hours (or right away via Settings → Updates → Check for updates), download it in the background and install it on the next restart.

---

## Project structure

```
main.js               Main process: window, tray, IPC, schedule, hotkey
preload.js            The bridge between the window and the main process

src/
  organizer.js        Sorting, rules, pins, undo and cleanup
  categories.js       Extension → category map
  config.js           Settings (JSON)
  stats.js            Files sorted, sessions, top categories
  updater.js          Auto-updates from GitHub Releases
  watcher.js          Auto mode (chokidar)
  shortcuts.js        Reads .lnk targets on Windows (PowerShell)
  tray.js             Tray icon and menu

renderer/
  index.html          Layout
  app.js              Everything on screen, including Tidy
  styles.css          Styles, light and dark
  fonts/              Instrument Sans and VT323 (SIL Open Font License)

test/
  organizer.test.js   Tests for the organizer
```

The website lives in its own repo: [erisbpdev/declutterme-web](https://github.com/erisbpdev/declutterme-web).

---

## Built with

Electron 30, chokidar, electron-updater and electron-builder. Tests use Node's built-in test runner, and releases are built with GitHub Actions.

The window can't touch your files directly: context isolation is on, and everything goes through a small API in `preload.js`.

---

## License

MIT

---

Made with `[^_^]` by [Eris](https://www.erisbp.com)
