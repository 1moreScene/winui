import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from '../gallery/node_modules/@playwright/test/index.mjs';

const [url, outputArg] = process.argv.slice(2);
if (!url || !outputArg) throw new Error('Usage: node tools/profile-gallery-table-view.mjs <gallery-url> <report.json>');
const output = resolve(outputArg);
mkdirSync(dirname(output), { recursive: true });
const runs = Number(process.env.WINUI_TABLE_RUNS ?? 3);
const recordCpu = process.env.WINUI_TABLE_CPU_PROFILE === '1';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const report = { url, browser: browser.version(), runs: [] };

try {
  for (let run = 0; run < runs; run++) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => window.gallery?.frame?.snapshot.current?.page === '#home');
    await page.waitForTimeout(250);
    const cdp = await page.context().newCDPSession(page);
    if (recordCpu) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.start');
    }
    await page.evaluate(() => {
      const sdk = window.gallery.sdk;
      const raw = sdk.raw;
      const probe = window.tableProfile = { calls: [], tasks: [], start: performance.now(), scrollbar: null };
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) probe.tasks.push({ time: entry.startTime, ms: entry.duration });
      }).observe({ type: 'longtask' });
      const wrap = (target, method, observe) => {
        const original = target[method];
        if (typeof original !== 'function') return;
        target[method] = function (...args) {
          const time = performance.now();
          const result = original.apply(this, args);
          observe(this, args, result, time, performance.now() - time);
          return result;
        };
      };
      wrap(raw, 'scene_node', (_, args, result, time, ms) => probe.calls.push({
        phase: 'wasmCreate', scene: args[0], kind: JSON.parse(args[2]), bytes: args[4]?.length ?? args[3].length, time, ms,
      }));
      wrap(raw, 'scene_update', (_, args, result, time, ms) => probe.calls.push({
        phase: 'wasmUpdate', scene: args[0], bytes: args[1].length, time, ms,
      }));
      wrap(raw, 'scene_frame', (_, args, result, time, ms) => {
        const marker = '"rustFrameTimings":';
        const start = result.lastIndexOf(marker);
        const from = start + marker.length;
        const rust = start < 0 ? null : JSON.parse(result.slice(from, result.indexOf('}', from) + 1));
        probe.calls.push({ phase: 'wasmFrame', scene: args[0], time, ms, rust, bytes: result.length, deferredRaster: args[5] });
      });
      const prototype = Object.getPrototypeOf(window.gallery.navigation.scene);
      for (const method of ['create', 'draw', 'project', 'dispatch']) {
        wrap(prototype, method, (scene, args, result, time, ms) => probe.calls.push({
          phase: method, scene: scene.handle, kind: method === 'create' ? args[1] : undefined, time, ms,
        }));
      }
      const scrollbars = sdk.installGlobalScrollbars();
      const initial = scrollbars.diagnostics;
      probe.readScrollbar = () => {
        const current = scrollbars.diagnostics;
        return { scans: current.scans - initial.scans, updates: current.updates - initial.updates };
      };
      probe.start = performance.now();
      location.hash = '#table-view';
    });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#table-native-runtime .winui-surface > canvas');
      return canvas?.width > 0 && window.tableViewControls?.large?.tableSnapshot?.totalCount === 10000;
    }, null, { timeout: 25000 });
    const readyMs = await page.evaluate(() => performance.now() - window.tableProfile.start);
    await page.waitForTimeout(350);
    if (recordCpu) {
      const { profile } = await cdp.send('Profiler.stop');
      writeFileSync(`${output}.${run + 1}.cpuprofile`, JSON.stringify(profile));
    }
    const sample = await page.evaluate(() => ({
      calls: window.tableProfile.calls,
      tasks: window.tableProfile.tasks,
      start: window.tableProfile.start,
      scrollbar: window.tableProfile.readScrollbar(),
      scenes: Object.fromEntries(Object.entries(window.tableViewScenes).map(([name, scene]) => [scene.handle, name])),
    }));
    const tasks = sample.tasks.filter(task => task.time >= sample.start).map(task => ({
      ...task,
      // These probes are nested. Each phase total is an inclusive measurement.
      phases: Object.fromEntries(['create', 'wasmCreate', 'wasmUpdate', 'draw', 'wasmFrame', 'project', 'dispatch'].map(phase =>
        [phase, sample.calls.filter(call => call.phase === phase && call.time >= task.time - 0.2 &&
          call.time < task.time + task.ms).reduce((sum, call) => sum + call.ms, 0)])),
    }));
    report.runs.push({ ...sample, tasks, readyMs, errors });
    writeFileSync(output, JSON.stringify(report, null, 2));
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally {
  await browser.close();
}
