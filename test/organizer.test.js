const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const config = require('../src/config');
const { organizeFolder, undoOrganize, cleanEmptyFolders } = require('../src/organizer');

let dir;
let userData;

function touch(name, content = 'x') {
  fs.writeFileSync(path.join(dir, name), content);
}

function topLevelFiles() {
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile()).sort();
}

function withConfig(overrides) {
  return { ...config.get(), ...overrides };
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'declutter-test-'));
  userData = fs.mkdtempSync(path.join(os.tmpdir(), 'declutter-ud-'));
  config.init(userData);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(userData, { recursive: true, force: true });
});

// ─── Basic sorting ───────────────────────────

test('sorts files into default category folders', async () => {
  touch('photo.jpg');
  touch('notes.txt');
  touch('song.mp3');

  const r = await organizeFolder(dir);

  assert.equal(r.moved.length, 3);
  assert.ok(fs.existsSync(path.join(dir, 'Images', 'photo.jpg')));
  assert.ok(fs.existsSync(path.join(dir, 'Documents', 'notes.txt')));
  assert.ok(fs.existsSync(path.join(dir, 'Audio', 'song.mp3')));
  assert.deepEqual(topLevelFiles(), []);
});

test('skips system files, dotfiles and files without an extension', async () => {
  touch('desktop.ini');
  touch('.hidden');
  touch('README');

  const r = await organizeFolder(dir);

  assert.equal(r.moved.length, 0);
  assert.equal(r.skipped.length, 3);
});

test('dry run reports moves without touching the disk', async () => {
  touch('photo.jpg');

  const r = await organizeFolder(dir, null, { dryRun: true });

  assert.equal(r.moved.length, 1);
  assert.equal(r.moved[0].category, 'Images');
  assert.deepEqual(topLevelFiles(), ['photo.jpg']);
  assert.ok(!fs.existsSync(path.join(dir, 'Images')));
});

test('renames on collision instead of overwriting', async () => {
  fs.mkdirSync(path.join(dir, 'Documents'));
  fs.writeFileSync(path.join(dir, 'Documents', 'notes.txt'), 'already there');
  touch('notes.txt', 'new');

  await organizeFolder(dir);

  assert.equal(fs.readFileSync(path.join(dir, 'Documents', 'notes.txt'), 'utf8'), 'already there');
  assert.equal(fs.readFileSync(path.join(dir, 'Documents', 'notes (1).txt'), 'utf8'), 'new');
});

// ─── Rules ───────────────────────────────────

test('extension rules (including legacy ones without a type) override categories', async () => {
  touch('design.psd');

  const r = await organizeFolder(dir, withConfig({
    customRules: [{ extension: '.psd', folder: 'Photoshop' }]
  }));

  assert.equal(r.moved[0].category, 'Photoshop');
  assert.equal(r.moved[0].rule, '.psd');
});

test('name pattern rules match globs case-insensitively', async () => {
  touch('Screenshot 2026-10-07.png');
  touch('March_INVOICE.pdf');
  touch('cat.png');

  const r = await organizeFolder(dir, withConfig({
    customRules: [
      { type: 'pattern', pattern: 'screenshot*', folder: 'Screenshots' },
      { type: 'pattern', pattern: '*invoice*', folder: 'Finance' }
    ]
  }), { dryRun: true });

  const dest = Object.fromEntries(r.moved.map(m => [m.file, m.category]));
  assert.equal(dest['Screenshot 2026-10-07.png'], 'Screenshots');
  assert.equal(dest['March_INVOICE.pdf'], 'Finance');
  assert.equal(dest['cat.png'], 'Images');
});

test('? in a pattern matches exactly one character', async () => {
  touch('IMG_1.jpg');
  touch('IMG_12.jpg');

  const r = await organizeFolder(dir, withConfig({
    customRules: [{ type: 'pattern', pattern: 'IMG_?.jpg', folder: 'Singles' }]
  }), { dryRun: true });

  const dest = Object.fromEntries(r.moved.map(m => [m.file, m.category]));
  assert.equal(dest['IMG_1.jpg'], 'Singles');
  assert.equal(dest['IMG_12.jpg'], 'Images');
});

test('pattern rules win over extension rules', async () => {
  touch('Screenshot.psd');

  const r = await organizeFolder(dir, withConfig({
    customRules: [
      { type: 'extension', extension: '.psd', folder: 'Photoshop' },
      { type: 'pattern', pattern: 'Screenshot*', folder: 'Screenshots' }
    ]
  }), { dryRun: true });

  assert.equal(r.moved[0].category, 'Screenshots');
});

test('pattern rules can claim files without an extension', async () => {
  touch('README');

  const r = await organizeFolder(dir, withConfig({
    customRules: [{ type: 'pattern', pattern: 'README', folder: 'Notes' }]
  }), { dryRun: true });

  assert.equal(r.moved[0].category, 'Notes');
});

test('regex characters in patterns are treated literally', async () => {
  touch('report (final).pdf');
  touch('reportXfinal.pdf');

  const r = await organizeFolder(dir, withConfig({
    customRules: [
      { type: 'pattern', pattern: '[bad(regex', folder: 'Nope' },
      { type: 'pattern', pattern: 'report (final).pdf', folder: 'Final' }
    ]
  }), { dryRun: true });

  const dest = Object.fromEntries(r.moved.map(m => [m.file, m.category]));
  assert.equal(dest['report (final).pdf'], 'Final');
  assert.equal(dest['reportXfinal.pdf'], 'Documents');
});

test('folder names that would escape the target fall back to the category', async () => {
  touch('notes.txt');

  const r = await organizeFolder(dir, withConfig({
    customRules: [{ type: 'extension', extension: '.txt', folder: '..' }]
  }));

  assert.equal(r.moved[0].category, 'Documents');
  assert.ok(fs.existsSync(path.join(dir, 'Documents', 'notes.txt')));
});

// ─── Pins & selection ────────────────────────

test('pinned files are never moved, but show up in previews', async () => {
  touch('keep-me.txt');
  touch('other.txt');
  const cfg = withConfig({ pinnedFiles: [path.join(dir, 'keep-me.txt')] });

  const preview = await organizeFolder(dir, cfg, { dryRun: true });
  assert.deepEqual(preview.pinned.map(p => p.file), ['keep-me.txt']);
  assert.equal(preview.pinned[0].category, 'Documents');
  assert.deepEqual(preview.moved.map(m => m.file), ['other.txt']);

  const r = await organizeFolder(dir, cfg);
  assert.deepEqual(r.moved.map(m => m.file), ['other.txt']);
  assert.deepEqual(topLevelFiles(), ['keep-me.txt']);
});

test('pins match case-insensitively on Windows', { skip: process.platform !== 'win32' }, async () => {
  touch('keep-me.txt');

  await organizeFolder(dir, withConfig({ pinnedFiles: [path.join(dir, 'KEEP-ME.TXT')] }));

  assert.deepEqual(topLevelFiles(), ['keep-me.txt']);
});

test('onlyFiles organizes just the hand-picked files', async () => {
  touch('a.txt');
  touch('b.txt');
  touch('c.png');

  const r = await organizeFolder(dir, null, { onlyFiles: ['a.txt', 'c.png'] });

  assert.deepEqual(r.moved.map(m => m.file).sort(), ['a.txt', 'c.png']);
  assert.deepEqual(topLevelFiles(), ['b.txt']);
});

// ─── Undo ────────────────────────────────────

test('undo puts files back', async () => {
  touch('notes.txt', 'original');

  const r = await organizeFolder(dir);
  const u = await undoOrganize(r.moved);

  assert.deepEqual(u.restored, ['notes.txt']);
  assert.equal(fs.readFileSync(path.join(dir, 'notes.txt'), 'utf8'), 'original');
});

test('undo never overwrites a file that appeared at the original location', async () => {
  touch('notes.txt', 'original');
  const r = await organizeFolder(dir);
  touch('notes.txt', 'NEW');

  await undoOrganize(r.moved);

  assert.equal(fs.readFileSync(path.join(dir, 'notes.txt'), 'utf8'), 'NEW');
  assert.equal(fs.readFileSync(path.join(dir, 'notes (1).txt'), 'utf8'), 'original');
});

test('undo reports files that disappeared from the organized folder', async () => {
  touch('notes.txt');
  const r = await organizeFolder(dir);
  fs.rmSync(path.join(dir, 'Documents', 'notes.txt'));

  const u = await undoOrganize(r.moved);

  assert.equal(u.restored.length, 0);
  assert.equal(u.errors.length, 1);
});

// ─── Empty folder cleanup ────────────────────

test('cleanup removes only empty folders the app manages', async () => {
  fs.mkdirSync(path.join(dir, 'Images'));
  fs.mkdirSync(path.join(dir, 'Screenshots'));
  fs.mkdirSync(path.join(dir, 'My Empty Project'));
  fs.mkdirSync(path.join(dir, 'Documents'));
  fs.writeFileSync(path.join(dir, 'Documents', 'keep.txt'), 'x');
  config.save(withConfig({
    customRules: [{ type: 'pattern', pattern: 'Screenshot*', folder: 'Screenshots' }]
  }));

  const r = await cleanEmptyFolders(dir);

  assert.deepEqual(r.cleaned.sort(), ['Images', 'Screenshots']);
  assert.ok(fs.existsSync(path.join(dir, 'My Empty Project')));
  assert.ok(fs.existsSync(path.join(dir, 'Documents')));
});
