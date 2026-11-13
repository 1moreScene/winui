import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from '../gallery/node_modules/@playwright/test/index.mjs';

const [url, outputPath, tracePath] = process.argv.slice(2);
if (!url || !outputPath) {
  throw new Error('Usage: node tools/benchmark-gallery-gpu.mjs <gallery-url> <report.json> [memory-dumps.json]');
}
const routes = [
  '#navigation-view', '#button', '#grid', '#text-box', '#rich-edit-box',
  '#list-view', '#grid-view', '#table-view', '#items-repeater', '#calendar-view',
  '#color-picker', '#flip-view', '#tree-view', '#tab-view', '#connected-animation',
  '#acrylic', '#effects-lab', '#person-picture', '#segmented', '#scroll-viewer',
  '#all', '#home',
];
const viewport = { width: 1440, height: 1000 };
const dpr = Number(process.env.WINUI_GALLERY_DPR ?? 1.5);
const laps = Number(process.env.WINUI_GALLERY_LAPS ?? 2);
const headed = process.env.WINUI_GALLERY_HEADED === '1';
const software = process.env.WINUI_GALLERY_SOFTWARE_CANVAS === '1';
const allPages = process.env.WINUI_GALLERY_ALL_PAGES === '1';
const suppressImages = process.env.WINUI_GALLERY_NO_CANVAS_IMAGES === '1';
const suppressSceneRaster = process.env.WINUI_GALLERY_NO_SCENE_RASTER === '1';
const dumpAt = new Set((process.env.WINUI_GALLERY_DUMP_AT ?? '').split(',').filter(Boolean));
assert(Number.isInteger(laps) && laps > 0 && Number.isFinite(dpr) && dpr > 0);
const output = resolve(outputPath);
mkdirSync(dirname(output), { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome', headless: !headed,
  args: software ? ['--disable-accelerated-2d-canvas'] : [] });
try {
  const page = await browser.newPage({ viewport, deviceScaleFactor: dpr, colorScheme: 'light' });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const browserSession = await browser.newBrowserCDPSession();
  const pageSession = await page.context().newCDPSession(page);
  const {gpu} = await browserSession.send('SystemInfo.getInfo');
  const report = { url, browser: browser.version(), viewport, dpr, headed, software, suppressImages, suppressSceneRaster, gpu, routes, laps, samples: [], pageErrors };
  const dumps = [];

  await page.addInitScript(suppressImages => {
    const probe = window.galleryBenchmark = { memories: [], tasks: [], imageSources: new Map() };
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
      if (source instanceof HTMLImageElement) {
        const url = source.currentSrc || source.src;
        if (url && !probe.imageSources.has(url)) probe.imageSources.set(url, [source.naturalWidth, source.naturalHeight]);
        if (suppressImages) return;
      }
      return drawImage.call(this, source, ...args);
    };
    for (const method of ['instantiate', 'instantiateStreaming']) {
      const original = WebAssembly[method];
      WebAssembly[method] = async function (...args) {
        const result = await original.apply(this, args);
        const memory = (result.instance ?? result).exports.memory;
        if (memory && !probe.memories.some(ref => ref.deref() === memory)) {
          probe.memories.push(new WeakRef(memory));
        }
        return result;
      };
    }
    new PerformanceObserver(list => {
      for (const task of list.getEntries()) probe.tasks.push([task.startTime, task.duration]);
    }).observe({ type: 'longtask' });
  }, suppressImages);
  await page.goto(url);
  await page.waitForFunction(() => window.gallery?.frame?.snapshot.current?.page === '#home');
  if (suppressSceneRaster) await page.evaluate(() => {
    const raw = window.gallery.sdk.raw;
    const frame = raw.scene_frame;
    raw.scene_frame = (id, time, width, height, dpr) => frame.call(raw, id, time, width, height, dpr, true);
  });
  if (allPages) {
    await page.evaluate(() => { location.hash = '#all'; });
    const links = await page.waitForFunction(() => {
      const active = document.querySelector('[data-frame-page="#all"]:not([inert])');
      const hashes = [...(active?.querySelectorAll('a[href^="#"]')??[])].map(a => a.hash);
      return hashes.length > 30 ? [...new Set(hashes)] : false;
    });
    routes.splice(0, routes.length, ...(await links.jsonValue()).filter(route => route !== '#home' && route !== '#all'), '#all', '#home');
    await page.evaluate(() => { location.hash = '#home'; });
    await page.waitForFunction(() => window.gallery.frame.snapshot.current?.page === '#home' && !window.gallery.frame.snapshot.animating);
  }

  async function readMemoryDump(label) {
    const completed = new Promise(done => browserSession.once('Tracing.tracingComplete', done));
    await browserSession.send('Tracing.start', {
      transferMode: 'ReturnAsStream',
      traceConfig: {
        excludedCategories: ['*'],
        includedCategories: ['disabled-by-default-memory-infra'],
      },
    });
    const dump = await browserSession.send('Tracing.requestMemoryDump', { levelOfDetail: 'detailed' });
    await browserSession.send('Tracing.end');
    const { stream } = await completed;
    assert(dump.success && stream, `Missing Chromium memory dump at ${label}`);
    const chunks = [];
    try {
      while (true) {
        const chunk = await browserSession.send('IO.read', { handle: stream, size: 1024 * 1024 });
        chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
        if (chunk.eof) break;
      }
    } finally {
      await browserSession.send('IO.close', { handle: stream });
    }
    dumps.push({ label, ...JSON.parse(Buffer.concat(chunks).toString('utf8')) });
  }

  async function sample(label, timings = {}, readProcesses = true, pageClosed = false) {
    if (readProcesses && !pageClosed) await pageSession.send('HeapProfiler.collectGarbage');
    const heap = pageClosed ? {} : await pageSession.send('Runtime.getHeapUsage');
    const pageMemory = pageClosed ? {} : await page.evaluate(() => {
      const frame = window.gallery.frame.snapshot;
      const canvases = [...document.querySelectorAll('canvas')];
      const pixels = list => list.reduce((total, canvas) => total + canvas.width * canvas.height, 0);
      return {
        cachedPages: frame.pages.length,
        navigationCount: frame.backStack.length,
        live: window.gallery.sdk.liveCount,
        canvasBytes: 4 * pixels(canvases),
        hiddenCanvasBytes: 4 * pixels(canvases.filter(canvas => canvas.closest('[data-frame-instance][hidden]'))),
        wasmBytes: window.galleryBenchmark.memories.reduce((total, ref) => total + (ref.deref()?.buffer.byteLength ?? 0), 0),
        drawnImageSources: window.galleryBenchmark.imageSources.size,
        drawnSourcePixels: [...window.galleryBenchmark.imageSources.values()].reduce((sum,[w,h])=>sum+w*h,0),
      };
    });
    const row = { label, ...timings, ...pageMemory, jsBytes: heap.usedSize };
    if (readProcesses && process.platform === 'win32') {
      const { processInfo } = await browserSession.send('SystemInfo.getProcessInfo');
      const relevant = processInfo.filter(process => /^(browser|renderer|GPU)$/i.test(process.type));
      const raw = execFileSync('powershell.exe', ['-NoProfile', '-Command',
        `Get-Process -Id ${relevant.map(process => process.id).join(',')} -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress; exit 0`,
      ], { encoding: 'utf8', windowsHide: true });
      const counters = new Map([JSON.parse(raw)].flat().map(row => [row.Id, row]));
      row.processes = relevant.flatMap(process => {
        const entry = counters.get(process.id);
        return entry ? [{ type: process.type, pid: process.id, workingSet: entry.WorkingSet64, privateBytes: entry.PrivateMemorySize64 }] : [];
      });
    }
    if (tracePath && (label === 'initial home' || label.endsWith(':#home') || label === 'after evict' || label === 'after tab close' || dumpAt.has(label))) {
      await readMemoryDump(label);
    }
    report.samples.push(row);
    writeFileSync(output, JSON.stringify(report, null, 2));
  }

  await sample('initial home');
  for (let lap = 1; lap <= laps; lap++) {
    for (const [index, route] of routes.entries()) {
      const start = await page.evaluate(route => {
        const start = performance.now();
        location.hash = route;
        return start;
      }, route);
      await page.waitForFunction(route => {
        const frame = window.gallery.frame.snapshot;
        const active = document.querySelector('.gallery-frame > [data-frame-instance]:not([inert])');
        return frame.current?.page === route && !frame.animating &&
          active?.dataset.framePage === route && !active.querySelector('.gallery-page-loading');
      }, route, { timeout: 25000 });
      const timings = await page.evaluate(async start => {
        await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
        const durations = window.galleryBenchmark.tasks.filter(([time]) => time >= start).map(([, duration]) => duration);
        return { elapsedMs: performance.now() - start, maxTaskMs: Math.max(0, ...durations) };
      }, start);
      const label = `${lap}:${route}`;
      await sample(label, timings, (index + 1) % 5 === 0 || index === routes.length - 1 || dumpAt.has(label));
    }
  }
  await page.evaluate(() => window.gallery.frame.configure({ cacheSize: 0 }));
  await page.waitForFunction(() => window.gallery.frame.snapshot.pages.length === 1);
  await sample('after evict');
  report.imageSources = await page.evaluate(() => [...window.galleryBenchmark.imageSources].sort((a,b)=>b[1][0]*b[1][1]-a[1][0]*a[1][1]));
  await page.close();
  await new Promise(done => setTimeout(done, 3000));
  await sample('after tab close', {}, true, true);
  if (tracePath) {
    const path = resolve(tracePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(dumps));
  }
  assert.deepEqual(pageErrors, []);
  console.log(`Completed ${routes.length * laps} Gallery navigations: ${output}`);
} finally {
  await browser.close();
}
