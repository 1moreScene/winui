import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '../gallery/node_modules/@playwright/test/index.mjs';

const [tarballArg, outputArg] = process.argv.slice(2);
if (!tarballArg || !outputArg) throw new Error('Usage: node tools/benchmark-table-renderers.mjs <sdk.tgz> <report.json>');
const tarball = resolve(tarballArg);
const output = resolve(outputArg);
mkdirSync(dirname(output), { recursive: true });
const project = mkdtempSync(join(dirname(output), 'table-consumer-'));
const version = JSON.parse(readFileSync(new URL('../gallery/package.json', import.meta.url)));
const rowCount = 10000, rowHeight = 32, headerHeight = 32, width = 760, height = 352;
const viewport = { width: 1440, height: 1000 }, dpr = 1.5;
const repetitions = Number(process.env.WINUI_TABLE_RUNS ?? 3);
const profile = process.env.WINUI_TABLE_PROFILE === '1';
const ablation = process.env.WINUI_TABLE_ABLATION ?? '';
assert(['', 'projection', 'raster'].includes(ablation));
assert(Number.isInteger(repetitions) && repetitions > 0);
writeFileSync(join(project, 'package.json'), JSON.stringify({
  private: true, type: 'module',
  dependencies: { 'winui-wasm': 'file:' + tarball.replaceAll('\\', '/') },
  devDependencies: { vite: version.devDependencies.vite },
}));
writeFileSync(join(project, 'index.html'), `<!doctype html><meta charset="utf-8"><style>
  body{margin:24px;font:14px "Segoe UI",sans-serif}
  #host{width:${width}px;height:${height}px}
  .row{box-sizing:border-box;display:grid;grid-template-columns:220px 190px 130px 180px;height:${rowHeight}px}
  .cell{box-sizing:border-box;padding:6px 16px;border-bottom:1px solid #eee;border-right:1px solid #ddd;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .header{background:#f3f3f3}
  .body{height:${height-headerHeight}px;overflow:auto;scrollbar-width:thin}
  .row[aria-selected=true]{background:#c6e4fa}
  .spacer{position:relative}.spacer>.row{position:absolute;left:0;right:0}
</style><button id="mount">Mount table</button><div id="host"></div><script type="module" src="/main.js"></script>`);
writeFileSync(join(project, 'main.js'), `
const host = document.querySelector('#host');
const button = document.querySelector('#mount');
const mode = new URL(location.href).searchParams.get('renderer');
const rowCount = ${rowCount}, rowHeight = ${rowHeight}, height = ${height};
const columns = [{field:'name', header:'Name', width:220},{field:'team', header:'Team', width:190},
  {field:'age', header:'Age', width:130},{field:'active', header:'Active', width:180}];
const rows = Array.from({length:rowCount}, (_, i) => ({
  id:'person-'+i, name:'Employee '+(i+1), team:['Engineering','Operations','Research','Design'][i%4],
  age:22+i%40, active:i%3===0,
}));
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
function mountDom() {
  host.setAttribute('role','grid');
  host.setAttribute('aria-label','People');
  host.setAttribute('aria-rowcount',String(rowCount+1));
  host.setAttribute('aria-colcount',String(columns.length));
  let ordered=rows, selected=null, sortField=null, descending=false;
  const element=(className,role)=>{const node=document.createElement('div');node.className=className;if(role)node.setAttribute('role',role);return node;};
  const header=element('row header','row'), body=element('body','rowgroup'), spacer=element('spacer');
  body.tabIndex=0;
  spacer.style.height=(rowCount*rowHeight)+'px';
  body.append(spacer);host.append(header,body);
  for(const column of columns){
    const cell=element('cell','columnheader');
    const sort=document.createElement('button');sort.textContent=column.header;cell.append(sort);header.append(cell);
    sort.onclick=()=>{
      descending=sortField===column.field&&!descending;sortField=column.field;
      const direction=descending?-1:1;
      ordered=[...rows].sort((a,b)=>direction*(a[sortField]<b[sortField]?-1:a[sortField]>b[sortField]?1:0));
      body.scrollTop=0;render();
    };
  }
  const pool=[];
  function render() {
    const first=Math.max(0,Math.floor(body.scrollTop/rowHeight)-1);
    const end=Math.min(rowCount,Math.ceil((body.scrollTop+body.clientHeight)/rowHeight)+1);
    while(pool.length<end-first){
      const row=element('row','row');
      for(const _ of columns)row.append(element('cell','gridcell'));
      row.onclick=()=>{selected=row.dataset.key;render();};
      spacer.append(row);pool.push(row);
    }
    for(const [i,row] of pool.entries()){
      row.hidden=first+i>=end;row.style.display=row.hidden?'none':'grid';
      if(row.hidden)continue;
      const source=ordered[first+i];row.dataset.key=source.id;
      row.style.top=((first+i)*rowHeight)+'px';row.setAttribute('aria-rowindex',String(first+i+2));
      row.setAttribute('aria-selected',String(selected===source.id));
      for(const [c,column] of columns.entries())row.children[c].textContent=String(source[column.field]);
    }
  }
  body.addEventListener('scroll',render,{passive:true});render();
  return { setOffset:offset=>{body.scrollTop=offset;render();},
    read:()=>({offset:body.scrollTop, realized:pool.filter(row=>!row.hidden).length}) };
}
let sdk;
const phases = [];
let scenePrototype;
function measure(target, method, report) {
  const original = target[method];
  target[method] = function (...args) {
    const start = performance.now();
    const result = original.apply(this, args);
    report(start, performance.now()-start, args, result);
    return result;
  };
}
if(mode==='wasm'){
  const {WinUI}=await import('winui-wasm');
  sdk=await WinUI.create({globalScrollbars:false});
  if('${ablation}'==='raster'){
    const frame=sdk.raw.scene_frame;
    sdk.raw.scene_frame=function(id,time,width,height,dpr){return frame.call(this,id,time,width,height,dpr,true);};
  }
  if(${profile}){
    measure(sdk.raw,'scene_node',(start,ms,args)=>phases.push({name:'wasmCreate',start,ms,wire:args[4]?.length??0}));
    measure(sdk.raw,'scene_frame',(start,ms,args,result)=>{
      const marker='"rustFrameTimings":';
      const offset=result.lastIndexOf(marker)+marker.length;
      const rust=offset>=marker.length?JSON.parse(result.slice(offset,result.indexOf('}',offset)+1)):null;
      phases.push({name:'wasmFrame',start,ms,wire:result.length,rust});
    });
  }
}
async function mount() {
  const start=performance.now();
  let table, createMs;
  if(mode==='wasm'){
    const scene=sdk.scene(host,{reducedMotion:true});
    if('${ablation}'==='projection')Object.getPrototypeOf(scene).project=()=>{};
    if(${profile}){
      phases.push({name:'sceneConstructor',start,ms:performance.now()-start});
      scenePrototype=Object.getPrototypeOf(scene);
      for(const method of ['create','draw','project','dispatch'])measure(scenePrototype,method,(start,ms)=>phases.push({name:method,start,ms}));
    }
    const control=scene.root.tableView({items:rows,columns,autoGenerateColumns:false,height,rowHeight,headerRowHeight:rowHeight,isReadOnly:true});
    createMs=performance.now()-start;
    table={wheel:dy=>scene.hostWheel(new WheelEvent('wheel',{deltaY:dy,clientX:274,clientY:213})),
      setOffset:offset=>control.scrollIntoView('person-'+Math.floor(offset/rowHeight)),read:()=>{
      const state=control.tableSnapshot;
      return {offset:state?.scroll?.verticalOffset??0,realized:new Set(state?.realized.map(slot=>slot.row)).size};
    }};
    while(!table.read().realized || ('${ablation}'!=='raster' && !scene.element.querySelector('canvas').width))await nextFrame();
  }else{
    table=mountDom();
    createMs=performance.now()-start;
  }
  window.tableProbe.table=table;
  window.tableProbe.createMs=createMs;
  await nextFrame();await nextFrame();
  window.tableProbe.mountMs=performance.now()-start;
  window.tableProbe.readyMs=performance.now();
  window.tableProbe.firstPhases=phases.splice(0);
}
button.onclick=()=>void mount();
window.tableProbe={initializedMs:performance.now(),readyMs:0,phases};
`);

const npm = process.env.npm_execpath ?? resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
execFileSync(process.execPath, [npm, 'install', '--offline', '--no-audit', '--no-fund'], { cwd: project, stdio: 'inherit' });
const vite = join(project, 'node_modules/vite/bin/vite.js');
execFileSync(process.execPath, [vite, 'build'], { cwd: project, stdio: 'inherit' });
const server = spawn(process.execPath, [vite, 'preview', '--host', '127.0.0.1', '--port', '0', '--strictPort'], { cwd: project, windowsHide: true });
let browser;
const report = {
  project, tarball, sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  rows: rowCount, columns: 4, rowHeight, headerHeight, size: { width, height }, viewport, dpr,
  pagesPerTab: 1, cachedPages: 0, ablation: ablation || null, wheel: { ticks: 40, delta: 128, intervalMs: 32 }, runs: [],
};
try {
  const base = await new Promise((done, reject) => {
    server.once('exit', code => reject(new Error(`Preview exited with ${code}`)));
    server.stdout.on('data', data => {
      const url = String(data).match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (url) done(url[0]);
    });
    server.stderr.on('data', data => process.stderr.write(data));
  });
  for (let i = 0; i < repetitions; i++) {
    for (const renderer of ablation ? ['wasm'] : i % 2 ? ['wasm', 'dom'] : ['dom', 'wasm']) {
      browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
      report.browser = browser.version();
      const page = await browser.newPage({ viewport, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(profile => {
        const probe = window.metrics = { memories: new Set(), canvases: [], tasks: [], frames: [], recording: false };
        if (profile) {
          const getContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (...args) {
            const context = getContext.apply(this, args);
            if (context && !probe.canvases.some(entry => entry.canvas.deref() === this)) {
              probe.canvases.push({ canvas: new WeakRef(this), software: args[1]?.willReadFrequently === true });
            }
            return context;
          };
        }
        for (const name of ['instantiate', 'instantiateStreaming']) {
          const original = WebAssembly[name];
          WebAssembly[name] = async function (...args) {
            const result = await original.apply(this, args);
            const memory = (result.instance ?? result).exports.memory;
            if (memory) probe.memories.add(memory);
            return result;
          };
        }
        new PerformanceObserver(list => {
          for (const task of list.getEntries()) probe.tasks.push({ at: task.startTime, ms: task.duration });
        }).observe({ type: 'longtask' });
      }, profile);
      const cdp = await page.context().newCDPSession(page);
      const browserCdp = await browser.newBrowserCDPSession();
      async function memory() {
        await cdp.send('HeapProfiler.collectGarbage');
        const heap = await cdp.send('Runtime.getHeapUsage');
        const state = await page.evaluate(() => ({
          nodes: document.querySelectorAll('*').length,
          gridCells: document.querySelectorAll('[role=gridcell]').length,
          canvasBytes: [...document.querySelectorAll('canvas')].reduce((sum,c)=>sum+4*c.width*c.height,0),
          detachedCanvas: window.metrics.canvases.reduce((result,entry)=>{
            const canvas=entry.canvas.deref();
            if(canvas&&!canvas.isConnected&&canvas.width&&canvas.height){
              result.count++;
              result.bytes+=4*canvas.width*canvas.height;
              if(entry.software)result.software++;
            }
            return result;
          },{count:0,bytes:0,software:0}),
          wasm: [...window.metrics.memories].reduce((sum, m) => sum + m.buffer.byteLength, 0),
        }));
        const processes = [];
        if (process.platform === 'win32') {
          const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
          const entries = processInfo.filter(p => /^(renderer|gpu)$/i.test(p.type));
          const raw = execFileSync('powershell.exe', ['-NoProfile', '-Command',
            `Get-Process -Id ${entries.map(p=>p.id).join(',')} -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress; exit 0`,
          ], { encoding:'utf8', windowsHide:true });
          for (const row of [JSON.parse(raw)].flat()) {
            processes.push({ type: entries.find(p => p.id === row.Id).type, workingSet: row.WorkingSet64, privateBytes: row.PrivateMemorySize64 });
          }
        }
        return { ...state, js: heap.usedSize, jsTotal: heap.totalSize, embedder: heap.embedderHeapUsedSize, backingStorage: heap.backingStorageSize, processes };
      }
      await page.goto(base + '?renderer=' + renderer);
      await page.waitForFunction(() => !!window.tableProbe);
      const startupMs = await page.evaluate(() => window.tableProbe.initializedMs);
      const before = await memory();
      await page.locator('#mount').click();
      await page.waitForFunction(() => !!window.tableProbe.readyMs);
      const first = await page.evaluate(() => ({
        mountMs: window.tableProbe.mountMs, createMs: window.tableProbe.createMs, phases:window.tableProbe.firstPhases, ...window.tableProbe.table.read(),
      }));
      const mounted = await memory();
      const bounds = await page.locator('#host').boundingBox();
      await page.mouse.move(bounds.x + 250, bounds.y + 165);
      // Chromium's native scroller and the SDK normalize wheel deltas at
      // different scales. Calibrate the input so the realized range advances
      // by the same number of rows during the timed pass.
      if (ablation) {
        // A diagnostic build with a rendering stage removed may lack the
        // input surface. Send the same raw wheel input at the same cadence.
        await page.evaluate(delta => window.tableProbe.table.wheel(delta), report.wheel.delta);
      } else await page.mouse.wheel(0, report.wheel.delta);
      await page.waitForFunction(() => window.tableProbe.table.read().offset > 0);
      const step = await page.evaluate(() => window.tableProbe.table.read().offset);
      const wheelDelta = Math.round(report.wheel.delta * report.wheel.delta / step);
      await page.evaluate(() => window.tableProbe.table.setOffset(0));
      await page.waitForFunction(() => window.tableProbe.table.read().offset === 0);
      await page.evaluate(() => {
        const p = window.metrics;
        p.scrollStart = performance.now();
        window.tableProbe.phases.length=0;
        p.recording = true;
        function record(time) {
          if (!p.recording) return;
          p.frames.push(time);
          requestAnimationFrame(record);
        }
        requestAnimationFrame(record);
      });
      for (let tick = 0; tick < report.wheel.ticks; tick++) {
        if (ablation) await page.evaluate(delta=>window.tableProbe.table.wheel(delta),wheelDelta);
        else await page.mouse.wheel(0, wheelDelta);
        await page.waitForTimeout(report.wheel.intervalMs);
      }
      await page.waitForTimeout(250);
      const scroll = await page.evaluate(() => {
        const p = window.metrics;
        p.recording = false;
        return {
          ...window.tableProbe.table.read(),
          durationMs: performance.now() - p.scrollStart,
          frameGaps: p.frames.slice(1).map((time, i) => time - p.frames[i]),
          longTasks: p.tasks.filter(task => task.at >= p.scrollStart).map(task => task.ms),
          phases: window.tableProbe.phases.slice(),
        };
      });
      const scrolled = await memory();
      if (process.env.WINUI_TABLE_HEAP === '1' && renderer === 'wasm') {
        const fd = openSync(`${output}.${i+1}.heapsnapshot`, 'w');
        const saveChunk = ({chunk}) => writeSync(fd, chunk);
        cdp.on('HeapProfiler.addHeapSnapshotChunk', saveChunk);
        try { await cdp.send('HeapProfiler.takeHeapSnapshot'); }
        finally { cdp.off('HeapProfiler.addHeapSnapshotChunk', saveChunk); closeSync(fd); }
      }
      assert(first.realized >= 8 && first.realized < 20, JSON.stringify(first));
      assert(Math.abs(scroll.offset - report.wheel.ticks * report.wheel.delta) < 128 && scroll.realized < 20, JSON.stringify(scroll));
      assert.deepEqual(errors, []);
      report.runs.push({ renderer, startupMs, first, scroll: {...scroll, wheelDelta}, before, mounted, scrolled });
      writeFileSync(output, JSON.stringify(report, null, 2));
      console.log(`${renderer} run ${i+1}/${repetitions}: ${Math.round(first.mountMs)} ms, scrolled ${Math.round(scroll.offset)} px`);
      await browser.close();
      browser = undefined;
    }
  }
} finally {
  await browser?.close();
  if (server.exitCode === null) server.kill();
}
