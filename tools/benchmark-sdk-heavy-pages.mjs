import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { chromium } from '../gallery/node_modules/@playwright/test/index.mjs';

const [tarballArg, outputArg] = process.argv.slice(2);
if (!tarballArg || !outputArg) throw new Error('Usage: node tools/benchmark-sdk-heavy-pages.mjs <sdk.tgz> <report.json>');
const tarball = resolve(tarballArg);
const output = resolve(outputArg);
mkdirSync(dirname(output), { recursive: true });
const project = mkdtempSync(join(dirname(output), 'sdk-heavy-consumer-'));
const report = {
  tarball, sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  backend: process.env.WINUI_STRESS_BACKEND ?? 'Canvas2D',
  project, viewport: { width: 1440, height: 1000 }, dpr: 1.5,
  pageCount: Number(process.env.WINUI_STRESS_PAGES ?? 14),
  cacheSize: Number(process.env.WINUI_STRESS_CACHE_SIZE ?? 10),
  distinctSources: process.env.WINUI_STRESS_DISTINCT_SOURCES === '1',
  runs: [],
};
const runs = Number(process.env.WINUI_STRESS_RUNS ?? 2);
assert(Number.isInteger(report.pageCount) && report.pageCount > 0 && Number.isInteger(runs) && runs > 0);
assert(Number.isInteger(report.cacheSize) && report.cacheSize >= 2);
const versions = JSON.parse(readFileSync(new URL('../gallery/package.json', import.meta.url)));
const npm = process.env.npm_execpath ?? resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const sdkVersion = 'file:' + tarball.replaceAll('\\', '/');
writeFileSync(join(project, 'package.json'), JSON.stringify({
  private: true,
  type: 'module',
  dependencies: { 'winui-wasm': sdkVersion, react: versions.dependencies.react, 'react-dom': versions.dependencies['react-dom'] },
  devDependencies: { vite: versions.devDependencies.vite },
}));
writeFileSync(join(project, 'index.html'), `<!doctype html><meta charset="utf-8">
  <style>body{margin:0} #app{width:1100px;height:900px} .scroll{overflow:auto;height:100%}</style>
  <div id="app"></div><script type="module" src="/main.jsx"></script>`);
writeFileSync(join(project, 'main.jsx'), `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { NavigationCacheMode, NodeKind, RendererBackend, WinUI } from 'winui-wasm';
import { Frame, SceneView, WinUIProvider } from 'winui-wasm/react';

const ui = await WinUI.create();
const params = new URL(location.href).searchParams;
const backend = params.get('backend') ?? RendererBackend.Canvas2D;
const cacheSize = Number(params.get('cacheSize'));
const distinctSources = params.get('distinctSources') === 'true';
const samples = new Map();
const wire = [];
const raw = ui.raw;
const sceneFrame = raw.scene_frame;
raw.scene_frame = function (...args) {
  const start = performance.now();
  const result = sceneFrame.apply(this, args);
  const ms = performance.now() - start;
  const marker = '"rustFrameTimings":';
  const offset = result.lastIndexOf(marker);
  const begin = offset + marker.length;
  const phases = offset < 0 ? null : JSON.parse(result.slice(begin, result.indexOf('}', begin) + 1));
  wire.push({ ms, bytes: result.length, phases });
  return result;
};
const data = Array.from({length: 5000}, (_, i) => ({
  id: 'person-' + i, name: 'Employee ' + i, team: 'Operations', age: i % 30 + 20, active: i % 2 === 0,
}));
const columns = [{field:'name',header:'Name',width:230},{field:'team',header:'Team',width:200},
  {field:'age',header:'Age',width:110},{field:'active',header:'Active',width:130}];
function populate(scene, page, example) {
  if (example === 0) {
    const items = distinctSources ? data.map(row => ({...row, id: page + '-' + row.id})) : data;
    const table = scene.root.tableView({ items, columns, width: 900, height: 320, autoGenerateColumns: false });
    samples.set(page, new WeakRef(table));
    return;
  }
  const grid = scene.root.grid({ width: 900, height: 320, background: '#F6F6F6' });
  for (let i = 0; i < 192; i++) {
    const cell = scene.create(grid, NodeKind.Grid, { width: 96, height: 34, row: i % 8, column: i % 9 });
    cell.text({ text: 'Item ' + i, fontSize: 12 });
  }
}
function HeavyPage({ name }) {
  return <div className="scroll" data-consumer-page={name}>
    {name === 'empty' ? <h1>Overview</h1> : [0, 1, 2, 3].map(example =>
      <section key={example}><h2>Example {example + 1}</h2>
        <SceneView style={{height:320,width:900}} backend={backend} reducedMotion onReady={scene => populate(scene, name, example)} />
      </section>)}
  </div>;
}
const renderPage = entry => <HeavyPage name={entry.page}/>;
function Demo() {
  return <WinUIProvider runtime={ui}><Frame page="empty" reducedMotion cacheMode={NavigationCacheMode.Enabled}
    cacheSize={cacheSize} style={{height:840}} onReady={frame => window.frame = frame} renderPage={renderPage}/></WinUIProvider>;
}
createRoot(document.querySelector('#app')).render(<Demo/>);
window.sdkStress = {
  navigate(name) { wire.length = 0; window.frame.navigate(name); },
  checkpoint(name) {
    const current = samples.get(name)?.deref();
    const frame = window.frame.snapshot;
    const visible = document.querySelector('[data-frame-instance]:not([inert])');
    const canvases = [...(visible?.querySelectorAll('.winui-surface > canvas') ?? [])];
    return {
      live: ui.liveCount, cached: frame.pages.length,
      canvasPixels: canvases.reduce((sum, canvas) => sum + canvas.width * canvas.height, 0),
      drawnSurfaces: canvases.filter(canvas => canvas.width > 0 && canvas.height > 0).length,
      wire: wire.slice(),
      rows: current?.tableSnapshot?.realized.length,
    };
  },
};
`);
execFileSync(process.execPath, [npm, 'install', '--offline', '--no-audit', '--no-fund'], { cwd: project, stdio: 'inherit' });
assert.equal(realpathSync(join(project, 'node_modules/winui-wasm')), join(project, 'node_modules/winui-wasm'));
const vite = join(project, 'node_modules/vite/bin/vite.js');
execFileSync(process.execPath, [vite, 'build'], { cwd: project, stdio: 'inherit' });
const server = spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', '0', '--strictPort'], { cwd: project, windowsHide: true });
let browser;
try {
  const url = await new Promise((done, reject) => {
    server.once('exit', code => reject(new Error(`Preview exited with ${code}`)));
    server.stdout.on('data', data => {
      const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) done(match[0]);
    });
    server.stderr.on('data', data => process.stderr.write(data));
  });
  const { backend, pageCount, cacheSize, distinctSources } = report;
  for (let run = 0; run < runs; run++) {
    browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
    report.browser = browser.version();
    const page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: report.dpr });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.stressMetrics = { memories: new Set(), tasks: [] };
      for (const method of ['instantiate', 'instantiateStreaming']) {
        const original = WebAssembly[method];
        WebAssembly[method] = async function (...args) {
          const result = await original.apply(this, args);
          const memory = (result.instance ?? result).exports.memory;
          if (memory) window.stressMetrics.memories.add(memory);
          return result;
        };
      }
      new PerformanceObserver(list => window.stressMetrics.tasks.push(...list.getEntries().map(
        entry => ({ start: entry.startTime, duration: entry.duration }),
      ))).observe({ type: 'longtask' });
    });
    const browserCDP = await browser.newBrowserCDPSession();
    const cdp = await page.context().newCDPSession(page);
    await page.goto(url + '?' + new URLSearchParams({ backend, cacheSize, distinctSources }));
    await page.waitForFunction(() => !!window.sdkStress && window.frame?.snapshot.current?.page === 'empty');
    const rows = [];
    async function point(name, measureProcesses) {
      const sample = await page.evaluate(async name => {
        const start = performance.now();
        if (name !== 'baseline' && name !== 'evicted') {
          window.sdkStress.navigate(name);
          await new Promise((done, reject) => {
            function wait() {
              const active = document.querySelector('[data-frame-instance]:not([inert])');
              if (active?.querySelector('[data-consumer-page]')?.dataset.consumerPage === name &&
                  (name === 'empty' || active.querySelector('.winui-surface > canvas')?.width > 0)) {
                requestAnimationFrame(done);
              } else if (performance.now() - start > 15000) reject(Error('Timed out waiting for ' + name));
              else requestAnimationFrame(wait);
            }
            requestAnimationFrame(wait);
          });
        }
        const elapsed = performance.now() - start;
        if (name.startsWith('page-')) {
          await new Promise((done, reject) => {
            function waitForVisibleSurfaces() {
              const active = document.querySelector('[data-frame-instance]:not([inert])');
              const canvases = [...active?.querySelectorAll('.winui-surface > canvas') ?? []];
              const visible = canvases.filter(canvas => {
                const rect = canvas.parentElement.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
              });
              if (visible.length && visible.every(canvas => canvas.width > 0 && canvas.height > 0)) done();
              else if (performance.now() - start > 15000) reject(Error('Timed out painting visible surfaces for ' + name));
              else requestAnimationFrame(waitForVisibleSurfaces);
            }
            waitForVisibleSurfaces();
          });
        }
        const allVisibleMs = performance.now() - start;
        await new Promise(resolve => setTimeout(resolve, 40));
        const { wire, ...state } = window.sdkStress.checkpoint(name);
        return {
          ...state, elapsed, allVisibleMs, frames: wire.length,
          wasmFrameMs: wire.reduce((sum, row) => sum + row.ms, 0),
          wireBytes: wire.reduce((sum, row) => sum + row.bytes, 0),
          rustPhases: Object.fromEntries(['layoutMs', 'displayListMs', 'paintMs', 'snapshotMs'].map(key =>
            [key, wire.reduce((sum, row) => sum + (row.phases?.[key] ?? 0), 0)])),
          maxTaskMs: Math.max(0, ...window.stressMetrics.tasks.filter(task => task.start >= start).map(task => task.duration)),
          wasmBytes: [...window.stressMetrics.memories].reduce((sum, memory) => sum + memory.buffer.byteLength, 0),
        };
      }, name);
      if (measureProcesses) {
        await cdp.send('HeapProfiler.collectGarbage');
        sample.jsBytes = (await cdp.send('Runtime.getHeapUsage')).usedSize;
        if (process.platform === 'win32') {
          const {processInfo} = await browserCDP.send('SystemInfo.getProcessInfo');
          const relevant = processInfo.filter(process => /^(browser|renderer|GPU)$/i.test(process.type));
          const raw = execFileSync('powershell.exe', ['-NoProfile', '-Command',
            `Get-Process -Id ${relevant.map(process => process.id).join(',')} -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress; exit 0`,
          ], {encoding:'utf8', windowsHide:true});
          const processes = [JSON.parse(raw)].flat();
          sample.processes = relevant.flatMap(process => {
            const counters = processes.find(counters => counters.Id === process.id);
            return counters ? [{ type: process.type, workingSet: counters.WorkingSet64, privateBytes: counters.PrivateMemorySize64 }] : [];
          });
        }
      }
      rows.push({ name, ...sample });
    }
    await point('baseline', true);
    for (let index = 0; index < pageCount; index++) await point('page-' + index, (index + 1) % 5 === 0 || index + 1 === pageCount);
    await point('empty', true);
    const restored = await page.evaluate(async name => {
      const deadline = performance.now() + 15000;
      const waitFor = predicate => new Promise((resolve, reject) => {
        const wait = () => {
          if (predicate()) resolve();
          else if (performance.now() >= deadline) reject(new Error('Timed out repainting cached content'));
          else requestAnimationFrame(wait);
        };
        requestAnimationFrame(wait);
      });
      window.sdkStress.navigate(name);
      const findPage = () => document.querySelector('[data-frame-instance]:not([inert]) [data-consumer-page="' + name + '"]');
      await waitFor(() => findPage()?.querySelector('.winui-surface > canvas')?.width > 0);
      const active = findPage();
      const lastCanvas = active.querySelector('section:last-child .winui-surface > canvas');
      lastCanvas.closest('section').scrollIntoView({block:'center'});
      await waitFor(() => lastCanvas.width > 0);
      return { width: lastCanvas.width, height: lastCanvas.height, rows: window.sdkStress.checkpoint(name).rows };
    }, 'page-' + (pageCount - 1));
    assert(restored.width > 0 && restored.height > 0 && restored.rows > 0);
    await point('empty', true);
    await page.evaluate(() => window.frame.configure({cacheSize:0}));
    await page.waitForFunction(() => window.frame.snapshot.pages.length === 1 && document.querySelectorAll('.winui-surface').length === 1);
    await point('evicted', true);
    assert.deepEqual(errors, []);
    assert.equal(rows.at(-1).live, rows[0].live);
    assert(rows.filter(row => row.name.startsWith('page-')).every(row => row.rows > 0 && row.rows < 100));
    report.runs.push(rows);
    writeFileSync(output, JSON.stringify(report, null, 2));
    console.log(`Completed run ${run + 1}/${runs}: ${output}`);
    await browser.close();
    browser = undefined;
  }
} finally {
  await browser?.close();
  if (server.exitCode === null) server.kill();
}
