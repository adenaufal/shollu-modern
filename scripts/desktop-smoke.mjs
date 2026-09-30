// Run after `cargo build` with `pnpm dev` serving localhost:1420.
// This exercises the real Windows Tauri IPC; it does not install a mock backend.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const artifacts = path.join(root, '.smoke');
const config = path.join(artifacts, `native-data-${Date.now()}`);
await mkdir(config, { recursive: true });
const binary = process.env.SHOLLU_SMOKE_BINARY ?? path.join(root, 'src-tauri', 'target', 'debug', 'shollu-modern.exe');
const port = 9224;
const child = spawn(binary, [], { cwd: config, windowsHide: true,
  env: { ...process.env, SHOLLU_CONFIG_DIR: config,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
const errors = [];
let browser;
const report = [];
const note = message => { report.push(message); console.log(`PASS ${message}`); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const runFile = promisify(execFile);
try {
  const deadline = Date.now() + 30_000;
  while (true) {
    if (child.exitCode !== null) throw new Error(`Desktop exited with ${child.exitCode}: ${output}`);
    try { const response = await fetch(`http://127.0.0.1:${port}/json/version`); if (response.ok) break; } catch {}
    if (Date.now() > deadline) throw new Error(`Desktop CDP did not start: ${output}`);
    await pause(250);
  }
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('.calm-hero')).toBeVisible({ timeout: 20_000 });
  const invoke = (command, args = {}) => page.evaluate(({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args), { command, args });
  const handleDialog = savePath => runFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/native-dialog.ps1'), '-AppProcessId', String(child.pid), ...(savePath ? ['-SavePath', savePath] : [])], { windowsHide: true });
  const settings = await invoke('get_settings');
  assert.equal(settings.layout_mode, 'tenang');
  assert.equal(settings.location.name, 'Pekanbaru');
  assert.equal(settings.adzan_prayers.fajr, true);
  const cities = await invoke('search_cities', { query: 'Jakarta', limit: 8 });
  assert.ok(cities.some(city => /jakarta/i.test(`${city.name} ${city.region_name}`)), 'Bundled offline city database must contain Jakarta');
  note('Native startup, shared clock, defaults, offline city database');

  await page.screenshot({ path: path.join(artifacts, 'tenang-main.png') });
  const navigate = async name => { await page.getByRole('button', { name, exact: true }).first().click(); };
  await navigate('Lokasi');
  await expect(page.getByRole('radiogroup', { name: 'Metode perhitungan' })).toBeVisible();
  await page.getByRole('radio', { name: /Liga Dunia Islam/ }).click();
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeEnabled();
  await page.keyboard.press('Control+s');
  await expect.poll(async () => (await invoke('get_settings')).method).toBe(3);
  await expect(page.getByRole('button', { name: 'Simpan', exact: true })).toBeDisabled();
  await page.screenshot({ path: path.join(artifacts, 'tenang-location.png') });
  note('Live location preview and keyboard save persisted through real IPC');

  await navigate('Jadwal');
  await expect(page.locator('.calendar-cell')).toHaveCount(42);
  await expect(page.locator('.calendar-fajr').first()).toContainText(/\d{2}:\d{2}/);
  const initialMonth = await page.locator('.schedule-month-nav strong').innerText();
  await page.getByRole('button', { name: 'Bulan berikutnya', exact: true }).click();
  await expect(page.locator('.schedule-month-nav strong')).not.toHaveText(initialMonth);
  await page.locator('.calendar-cell').nth(14).click();
  await expect(page.locator('.detail-prayer')).toHaveCount(6);
  await page.screenshot({ path: path.join(artifacts, 'tenang-schedule.png') });
  note('42-cell month navigation and selected-day schedule');

  await navigate('Pengingat');
  await page.getByRole('button', { name: /Pengingat baru/ }).click();
  await page.locator('.task-form input').first().fill('Smoke reminder');
  const due = new Date();
  const hhmm = `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`;
  await page.locator('.task-form input[type=time]').fill(hhmm);
  await page.locator('.task-form textarea').fill('Native scheduler notification');
  await page.getByRole('button', { name: 'Simpan pengingat', exact: true }).click();
  await expect.poll(async () => (await invoke('list_tasks')).length).toBe(1);
  await expect(page.locator('.shell-toast')).toContainText('Smoke reminder', { timeout: 10_000 });
  await page.getByRole('switch', { name: 'Nonaktifkan Smoke reminder', exact: true }).click();
  await expect.poll(async () => (await invoke('list_tasks'))[0].enabled).toBe(false);
  await page.screenshot({ path: path.join(artifacts, 'tenang-reminders.png') });
  note('Task creation, scheduler event, native notification request and persisted toggle');

  await navigate('Konversi');
  await page.getByRole('combobox', { name: 'Bulan Masehi', exact: true }).selectOption('10');
  await page.getByRole('combobox', { name: 'Tanggal Masehi', exact: true }).selectOption('31');
  await expect(page.locator('.convert-page .u-alert.error')).toHaveCount(0);
  await expect(page.locator('.date-big').first()).toContainText('31');
  for (const adjustment of [-1, 0, 1]) {
    const hijri = await invoke('convert_gregorian_to_hijri', { year: 2026, month: 10, day: 31, adjustment });
    const gregorian = await invoke('convert_hijri_to_gregorian', { ...hijri, adjustment });
    assert.deepEqual([gregorian.year, gregorian.month, gregorian.day], [2026, 10, 31]);
  }
  await page.screenshot({ path: path.join(artifacts, 'tenang-convert.png') });
  note('Gregorian day 31 and Hijri roundtrips at offsets -1, 0, +1');

  await navigate('Pengaturan');
  await page.getByRole('button', { name: 'Gelap', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Sepia', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');
  await page.getByRole('button', { name: 'Terang', exact: true }).click();
  await page.getByRole('button', { name: 'Rose', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'rose');
  await page.getByRole('button', { name: 'Teal', exact: true }).click();
  await page.screenshot({ path: path.join(artifacts, 'tenang-settings.png') });
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.evaluate(() => {
    const original = window.__TAURI_INTERNALS__.invoke;
    window.__smokeAstronomyCalls = [];
    window.__TAURI_INTERNALS__.invoke = (command, ...args) => {
      if (['compute_prayer_times', 'qibla_bearing', 'convert_gregorian_to_hijri'].includes(command)) window.__smokeAstronomyCalls.push(command);
      return original(command, ...args);
    };
  });
  await page.keyboard.press('Control+Shift+M');
  await expect(page.locator('.shollu-shell')).toHaveClass(/ringkas/);
  await pause(250);
  assert.deepEqual(await page.evaluate(() => window.__smokeAstronomyCalls), [], 'Changing shell density must not recalculate astronomy');
  await page.reload();
  await expect(page.locator('.shollu-shell')).toHaveClass(/ringkas/);
  await expect.poll(() => page.locator('.compact-main-table tbody tr').count()).toBeGreaterThanOrEqual(28);
  note('Three themes, five-accent control, bilingual UI, mode shortcut and restart persistence');
  await page.screenshot({ path: path.join(artifacts, 'ringkas-main.png') });
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  const retainedMonth = await page.locator('.compact-main-month strong').innerText();
  const retainedDay = await page.locator('.compact-selected-date').innerText();
  await page.keyboard.press('Control+Shift+M');
  await expect(page.locator('.calm-hero')).toBeVisible();
  await page.keyboard.press('Control+Shift+M');
  await expect(page.locator('.compact-main-month strong')).toHaveText(retainedMonth);
  await expect(page.locator('.compact-selected-date')).toHaveText(retainedDay);
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  note('Selected month and day survive switching display modes');
  for (const name of ['Schedule', 'Location', 'Reminders', 'Convert', 'Settings', 'About']) {
    await navigate(name);
    await expect(page.locator('#main-content')).not.toBeEmpty();
    if (['Location', 'Settings'].includes(name)) {
      const inspector = await page.locator(name === 'Location' ? '.location-inspector' : '.compact-settings-inspector').boundingBox();
      const mainBounds = await page.locator('#main-content').boundingBox();
      assert.ok(Math.abs(inspector.y + inspector.height - mainBounds.y - mainBounds.height) <= 1, `${name} inspector must fill the Ringkas pane`);
      assert.equal(inspector.width, 284);
    }
    await page.screenshot({ path: path.join(artifacts, `ringkas-${name.toLowerCase()}.png`) });
  }
  note('All seven Ringkas pages render through real backend');

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search commands or cities' }).fill('Location');
  await page.keyboard.press('Enter');
  await expect(page.locator('.location-page')).toBeVisible();
  await expect(page.locator('.inspector-prayer-list strong').first()).toContainText(/\d{2}:\d{2}/);
  await page.getByRole('spinbutton', { name: 'Altitude', exact: true }).fill('10001');
  await expect(page.locator('.location-page [role=alert]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Revert', exact: true }).click();
  await expect(page.locator('.location-page [role=alert]')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Timezone', exact: true }).selectOption('5.75');
  await page.keyboard.press('Control+s');
  await expect.poll(async () => (await invoke('get_settings')).location.timezone).toBe(5.75);
  note('Command palette keyboard navigation, invalid preview recovery and quarter-hour timezone save');

  await navigate('Reminders');
  await page.getByRole('group', { name: 'Smoke reminder', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Edited reminder');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect.poll(async () => (await invoke('list_tasks'))[0].name).toBe('Edited reminder');
  assert.equal((await invoke('list_tasks'))[0].enabled, false, 'Editing must retain disabled state');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(async () => (await invoke('list_tasks')).length).toBe(0);
  await page.getByRole('switch', { name: 'Fajr', exact: true }).click();
  await expect.poll(async () => (await invoke('get_settings')).adzan_prayers.fajr).toBe(false);
  note('Reminder editing/deletion and per-prayer alarm settings persist');
  await page.locator('.task-heading-actions').getByRole('button', { name: /New/ }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Once smoke reminder');
  await page.getByRole('combobox', { name: 'Frequency', exact: true }).selectOption('Once');
  const onceDue = new Date();
  await page.getByRole('spinbutton', { name: 'Day of month', exact: true }).fill(String(onceDue.getDate()));
  await page.getByRole('spinbutton', { name: 'Month', exact: true }).fill(String(onceDue.getMonth() + 1));
  await page.locator('.task-form input[type=time]').fill(`${String(onceDue.getHours()).padStart(2, '0')}:${String(onceDue.getMinutes()).padStart(2, '0')}`);
  await page.getByRole('button', { name: 'Save reminder', exact: true }).click();
  await expect(page.locator('.task-form [role=alert]')).toContainText('Enter a reminder message.');
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Once native notification');
  await page.getByRole('button', { name: 'Save reminder', exact: true }).click();
  await expect.poll(async () => (await invoke('list_tasks')).find(task => task.name === 'Once smoke reminder')?.enabled).toBe(false);
  await expect(page.getByRole('switch', { name: 'Enable Once smoke reminder', exact: true })).toBeVisible();
  note('Once reminders disable after firing and sync their enabled state into the visible UI');

  await navigate('Settings');
  await page.getByRole('switch', { name: 'Floating bar', exact: true }).click();
  await expect.poll(async () => (await invoke('get_settings')).floating_bar_visible).toBe(true);
  await page.getByRole('switch', { name: 'Drop zone', exact: true }).click();
  await expect.poll(async () => (await invoke('get_settings')).drop_zone_visible).toBe(true);
  await expect.poll(() => context.pages().length).toBe(3);
  const bar = context.pages().find(item => item.url().includes('window=floating-bar'));
  const zone = context.pages().find(item => item.url().includes('window=drop-zone'));
  assert.ok(bar && zone, 'Distinct overlay app URLs');
  await expect(bar.locator('.prayer-overlay-bar')).toHaveClass(/ringkas/);
  await expect(zone.locator('.prayer-overlay-zone')).toHaveClass(/ringkas/);
  assert.deepEqual(await zone.evaluate(() => [innerWidth, innerHeight]), [152, 52]);
  await zone.screenshot({ path: path.join(artifacts, 'ringkas-dropzone.png') });
  await bar.screenshot({ path: path.join(artifacts, 'ringkas-floatingbar.png') });
  await page.keyboard.press('Control+Shift+M');
  await expect(zone.locator('.prayer-overlay-zone')).toHaveClass(/tenang/);
  await expect.poll(() => zone.evaluate(() => [innerWidth, innerHeight])).toEqual([132, 132]);
  await zone.screenshot({ path: path.join(artifacts, 'tenang-dropzone.png') });
  await bar.screenshot({ path: path.join(artifacts, 'tenang-floatingbar.png') });
  await zone.getByRole('button', { name: 'Close drop zone', exact: true }).click();
  await bar.getByRole('button', { name: 'Close floating bar', exact: true }).click();
  await expect.poll(async () => (await invoke('get_settings')).drop_zone_visible).toBe(false);
  await expect.poll(async () => (await invoke('get_settings')).floating_bar_visible).toBe(false);
  note('Both native overlay URLs, live mode resizing, settings sync and persistent close');

  await assert.rejects(invoke('qibla_bearing', { latitude: 91, longitude: 0 }));
  await assert.rejects(invoke('convert_gregorian_to_hijri', { year: 2026, month: 2, day: 31, adjustment: 0 }));
  await assert.rejects(invoke('play_adzan', { filePath: path.join(config, 'missing.mp3') }));
  const saved = await invoke('get_settings');
  await assert.rejects(invoke('save_settings', { settings: { ...saved, location: { ...saved.location, latitude: 91 } } }));
  assert.equal((await invoke('get_settings')).location.latitude, saved.location.latitude);
  assert.deepEqual(errors, [], 'No uncaught frontend errors');
  note('Invalid coordinates/dates/audio/settings reject without corrupting saved settings');
  const exportPath = path.join(config, 'native-export.csv');
  const exportContent = 'Date,Fajr,Maghrib\r\n2026-09-30,04:51,18:07\r\n';
  const exportWork = invoke('save_export_file', { defaultName: 'native-export.csv', content: exportContent });
  exportWork.catch(() => {});
  await handleDialog(exportPath);
  assert.equal(await exportWork, true);
  assert.equal(await readFile(exportPath, 'utf8'), exportContent);
  for (const command of ['choose_audio_file', 'choose_task_file']) {
    const selection = invoke(command);
    selection.catch(() => {});
    await handleDialog();
    assert.equal(await selection, null);
  }
  const cancelledExport = invoke('save_export_file', { defaultName: 'cancel.csv', content: exportContent });
  cancelledExport.catch(() => {});
  await handleDialog();
  assert.equal(await cancelledExport, false);
  note('Native export writes exact content; export/audio/task dialogs cancel without hanging');
  const wav = Buffer.alloc(44 + 1600);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(1600, 40);
  const audioPath = path.join(config, 'silent-test.wav');
  await writeFile(audioPath, wav);
  await invoke('set_volume', { volume: 0 });
  await invoke('play_adzan', { filePath: audioPath });
  await invoke('stop_audio');
  await assert.rejects(invoke('set_volume', { volume: 2 }));
  note('Real WAV decode/play/stop and volume validation');
  await navigate('Settings');
  await expect(page.getByText('Bundled Shollu3 audio', { exact: true })).toBeVisible();
  for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    await page.getByLabel('Preview prayer', { exact: true }).selectOption(prayer);
    await page.getByRole('button', { name: '▶ Test audio', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
    await expect.poll(() => invoke('is_audio_playing')).toBe(true);
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    assert.equal(await invoke('is_audio_playing'), false);
  }
  await assert.rejects(invoke('play_prayer_adzan', { prayer: 'sunrise' }));
  await invoke('save_settings', { settings: { ...(await invoke('get_settings')), adzan_file_path: audioPath } });
  await expect(page.getByText('silent-test.wav', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '▶ Test audio', exact: true }).click();
  await pause(500);
  assert.equal(await invoke('is_audio_playing'), true, 'Dua must continue after the 0.1-second custom adhan');
  await expect.poll(() => invoke('is_audio_playing'), { timeout: 45_000 }).toBe(false);
  await expect(page.getByRole('button', { name: '▶ Test audio', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Use bundled audio', exact: true }).click();
  await expect(page.getByText('Bundled Shollu3 audio', { exact: true })).toBeVisible();
  assert.equal((await invoke('get_settings')).adzan_file_path, '');
  note('All five original adhan previews, queued dua completion, stop, invalid prayer and bundled reset');
  await page.setViewportSize({ width: 600, height: 480 });
  for (const mode of ['tenang', 'ringkas']) {
    await invoke('save_settings', { settings: { ...(await invoke('get_settings')), layout_mode: mode } });
    await expect(page.locator('.shollu-shell')).toHaveClass(new RegExp(mode));
    for (const name of ['Main', 'Schedule', 'Reminders', 'Convert', 'Location', 'Settings', 'About']) {
      await navigate(name);
      await expect(page.locator('#main-content')).not.toBeEmpty();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} ${name} must fit the minimum window width`);
      if (['Main', 'Location', 'Settings'].includes(name)) await page.screenshot({ path: path.join(artifacts, `${mode}-${name.toLowerCase()}-minimum.png`) });
    }
  }
  assert.deepEqual(errors, [], 'No uncaught frontend errors after minimum-size navigation');
  note('All pages remain navigable in both modes at the 600 × 480 minimum viewport');
  await writeFile(path.join(artifacts, 'desktop-report.json'), JSON.stringify({ checks: report, errors, config }, null, 2));
} catch (error) {
  console.error(error);
  await writeFile(path.join(artifacts, 'desktop-failure.log'), `${error.stack}\n${output}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  child.kill();
}
