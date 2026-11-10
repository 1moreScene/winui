// Real local tarball consumers. No source aliases, Rust installation, SDK code
// copying or consumer Vite plugins. The private package remains unpublished.
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, realpathSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname, join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {PNG} from '../gallery/node_modules/pngjs/lib/png.js';
import {checkSdkEntrypoints} from './check-sdk-entrypoints.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const gallery = JSON.parse(readFileSync(resolve(root, 'gallery/package.json'), 'utf8'));
const npm = process.env.npm_execpath ?? resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const out = resolve(root, 'out');
mkdirSync(out, {recursive: true});
const runRoot = mkdtempSync(join(out, 'npm-consumers-'));
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, {cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024});
  if (result.status !== 0) throw new Error(`${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
function write(folder, name, content) { writeFileSync(resolve(folder, name), content); }
run([npm, 'pack', '--pack-destination', runRoot, '--json'], resolve(root, 'packages/winui-wasm'));
const tarball = resolve(runRoot, readdirSync(runRoot).find(name => name.endsWith('.tgz')));
assert(existsSync(tarball));
const report = {tarball, packageVersion: JSON.parse(readFileSync(resolve(root, "packages/winui-wasm/package.json"), "utf8")).version, iconFontPolicy: "Windows local native aliases with open-source per-glyph fallback; other platforms portable font; native family names preserved", localOnly: false, resourceSource: "pinned MIT", published: false, cases: []};
const browser = await chromium.launch({channel: process.env.PW_CHANNEL ?? 'chrome'});
const test = async (folder, kind, mode, port) => {
  const cli = resolve(folder, 'node_modules/vite/bin/vite.js');
  const args = mode === 'development' ? ['--host', '127.0.0.1', '--port', String(port), '--strictPort'] : ['preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  let logs = '';
  const server = spawn(process.execPath, [cli, ...args], {cwd: folder, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
  server.stdout.on('data', data => { logs += data; });
  server.stderr.on('data', data => { logs += data; });
  const context = await browser.newContext({viewport: {width: 1400, height: 800}, deviceScaleFactor: 1.25});
  const page = await context.newPage();
  const errors = [], resources = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (/\.(?:wasm|woff)(?:\?|$)/.test(response.url())) resources.push({url: response.url(), status: response.status()}); });
  try {
    const url = `http://127.0.0.1:${port}/nested/`;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(logs);
      try { if ((await fetch(url)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await page.goto(url);
    for (const backend of ['Canvas2D', 'WebGL2']) {
      const button = page.getByRole('button', {name: `${backend} counter`, exact: true});
      await button.waitFor({timeout: 20000});
      await button.click();
      await page.waitForFunction(backend => document.querySelector(`[data-count="${backend}"]`)?.textContent === '1', backend);
      const input = page.getByRole('textbox', {name: `${backend} input`, exact: true});
      await input.fill('installed 中文');
      assert.equal(await input.inputValue(), 'installed 中文');
    }
    assert.equal(await page.locator('style[data-winui-sdk-host]').count(), 1, 'host CSS installed automatically once');
    for (const backend of ['Canvas2D', 'WebGL2']) assert.equal(await page.locator(`[data-renderer="${backend}"]`).count(), 1, `actual renderer is ${backend}`);
    const fonts = await page.evaluate(() => [...document.fonts].filter(face => face.status === 'loaded' && ['WinUI Native Fluent Icons', 'WinUI Native MDL2 Icons', 'WinUI Portable Icons'].includes(face.family.replaceAll('"', ''))).length);
    assert(fonts >= 1, 'open-source fallback loads automatically');
    assert.equal(await page.evaluate(() => [...document.fonts].filter(face => ['Segoe Fluent Icons','Segoe MDL2 Assets'].includes(face.family.replaceAll('"',''))).length), 0, 'SDK must not overwrite native font family names');
    const screenshot = await page.screenshot({path: resolve(folder, `${mode}.png`)});
    const pixels = PNG.sync.read(screenshot);
    let ink = 0;
    for (let index = 0; index < pixels.data.length; index += 4) if (pixels.data[index] < 100 && pixels.data[index + 1] < 100 && pixels.data[index + 2] < 100) ink++;
    assert(ink > 500, 'controls have visible raster output');
    assert(resources.some(resource => resource.url.includes('.wasm') && resource.status === 200), 'installed WASM requested successfully');
    assert(resources.every(resource => resource.status === 200), JSON.stringify(resources));
    if (kind === 'react') {
      await page.evaluate(() => window.unmountPackageDemo());
      assert.equal(await page.locator('.winui-scene').count(), 0);
      await page.evaluate(() => window.mountPackageDemo());
      await page.getByRole('button', {name: 'Canvas2D counter', exact: true}).waitFor();
    } else {
      await page.evaluate(() => window.disposePackageDemo());
      assert.equal(await page.locator('.winui-scene').count(), 0);
    }
    assert.deepEqual(errors, []);
    report.cases.push({kind, mode, base: '/nested/', backends: ['Canvas2D', 'WebGL2'], fonts, ink, resources, errors, interactions: true, cleanup: true});
    console.log(`Passed ${kind} ${mode}: installed tarball, both renderers, input, fonts, styles and cleanup.`);
  } catch (error) {
    throw new Error(`${kind} ${mode}: ${error.message}\n${logs}\npage errors: ${errors.join('\n')}\nresources: ${JSON.stringify(resources)}`);
  } finally {
    await context.close();
    if (server.exitCode === null) await new Promise(resolve => {server.once('exit', resolve); server.kill();});
  }
};
try {
  for (const kind of ['vanilla', 'react']) {
    const folder = resolve(runRoot, kind);
    mkdirSync(folder);
    const dependencies = {'winui-wasm': `file:${tarball.replaceAll('\\', '/')}`};
    const devDependencies = {vite: gallery.devDependencies.vite, typescript: gallery.devDependencies.typescript};
    if (kind === 'react') {
      Object.assign(dependencies, {react: gallery.dependencies.react, 'react-dom': gallery.dependencies['react-dom']});
      Object.assign(devDependencies, {'@types/react': gallery.devDependencies['@types/react'], '@types/react-dom': gallery.devDependencies['@types/react-dom']});
    }
    write(folder, 'package.json', JSON.stringify({name: `installed-sdk-${kind}`, version: '1.0.0', private: true, type: 'module', dependencies, devDependencies}, null, 2));
    write(folder, 'vite.config.ts', 'export default {base:"/nested/"};\n');
    write(folder, 'tsconfig.json', JSON.stringify({compilerOptions: {target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, jsx: 'react-jsx', skipLibCheck: true, lib: ['ES2022', 'DOM', 'DOM.Iterable']}, include: ['main.ts', 'main.tsx', 'contracts.ts']}));
    write(folder, 'index.html', `<!doctype html><html><meta charset="utf-8"><body style="margin:0;background:white"><div id="app"></div><script type="module" src="/main.${kind === 'react' ? 'tsx' : 'ts'}"></script></body></html>`);
    write(folder, 'contracts.ts', `import {ButtonVariant, FrameController, TableViewController, type ButtonOptions, type ButtonController} from 'winui-wasm';
// @ts-expect-error Unsuffixed controls must not be offered from the core entry.
import type {Button} from 'winui-wasm';
// @ts-expect-error Runtime control classes must also use Controller names.
import {ContentControl, Frame, TableView} from 'winui-wasm';
const valid:ButtonOptions={variant:ButtonVariant.Accent};
const update=(button:ButtonController)=>button.update(valid);
// @ts-expect-error enums must retain their public type constraints
const invalid:ButtonOptions={variant:'Accent'};
void [valid,invalid,update,FrameController,TableViewController];
`);
    if (kind === 'vanilla') write(folder, 'main.ts', `import {WinUI,RendererBackend,Symbol} from 'winui-wasm';
const ui=await WinUI.create({globalScrollbars:false});
for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2]){
 const host=document.createElement('div');host.style.cssText='display:inline-block;vertical-align:top;width:600px;height:440px';document.querySelector('#app')!.append(host);
 const scene=ui.scene(host,{backend,reducedMotion:true});host.dataset.renderer=scene.diagnostics.kind;const stack=scene.root.stack({spacing:12,padding:[16,16,16,16]});
 stack.text({text:'Installed SDK '+backend,fontSize:20});stack.symbolIcon({symbol:Symbol.Home});
 const status=document.createElement('span');status.dataset.count=backend;status.textContent='0';document.body.append(status);
 let count=0;stack.button({text:'Count 0',accessibleName:backend+' counter'}).onClick(()=>{status.textContent=String(++count);});
 stack.textBox({width:240,text:'initial',accessibleName:backend+' input'});
}
Object.assign(window,{disposePackageDemo:()=>ui.dispose()});\n`);
    else write(folder, 'main.tsx', `import {StrictMode,useState} from 'react';import {createRoot} from 'react-dom/client';
import {RendererBackend,Symbol} from 'winui-wasm';import {WinUIProvider,SceneView,StackPanel,TextBlock,SymbolIcon,Button,TextBox} from 'winui-wasm/react';
function Demo(){const [counts,setCounts]=useState({Canvas2D:0,WebGL2:0});return <WinUIProvider>{[RendererBackend.Canvas2D,RendererBackend.WebGL2].map(backend=><div key={backend} data-renderer-slot={backend} style={{display:'inline-block',verticalAlign:'top',width:600}}><span data-count={backend}>{counts[backend]}</span><SceneView backend={backend} onReady={scene=>document.querySelector('[data-renderer-slot="'+backend+'"]')!.setAttribute('data-renderer',scene.diagnostics.kind)} reducedMotion style={{height:440}}><StackPanel spacing={12} padding={[16,16,16,16]}><TextBlock text={'Installed React SDK '+backend} fontSize={20}/><SymbolIcon symbol={Symbol.Home}/><Button text={'Count '+counts[backend]} accessibleName={backend+' counter'} onClick={()=>setCounts(c=>({...c,[backend]:c[backend]+1}))}/><TextBox width={240} text="initial" accessibleName={backend+' input'}/></StackPanel></SceneView></div>)}</WinUIProvider>}
let root:ReturnType<typeof createRoot>;function mount(){root=createRoot(document.getElementById('app')!);root.render(<StrictMode><Demo/></StrictMode>);}mount();Object.assign(window,{mountPackageDemo:mount,unmountPackageDemo:()=>root.unmount()});\n`);
    console.log(`Installing tarball in independent ${kind} project...`);
    run([npm, 'install', '--offline', '--no-audit', '--no-fund'], folder);
    const installed = resolve(folder, 'node_modules/winui-wasm');
    assert.equal(realpathSync(installed), installed, 'consumer must install a real package, not link back to SDK sources');
    assert(!existsSync(resolve(installed, 'src')), 'package contains no SDK TypeScript implementation');
    assert(!existsSync(resolve(installed, 'Cargo.toml')), 'consumer needs no Rust project');
    assert(existsSync(resolve(installed, 'dist/wasm/winui_bg.wasm')));
    assert(existsSync(resolve(installed, 'THIRD_PARTY_NOTICES.txt')));
    if (kind === 'vanilla') {
      assert(!existsSync(resolve(folder, 'node_modules/react')), 'vanilla consumer must not need React');
      run(['--input-type=module', '-e', 'await import("winui-wasm");console.log("React-free ESM import passed")'], folder);
    }
    run([resolve(folder, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], folder);
    checkSdkEntrypoints(folder,{react:kind==='react'});
    await test(folder, kind, 'development', kind === 'vanilla' ? 5431 : 5432);
    run([resolve(folder, 'node_modules/vite/bin/vite.js'), 'build'], folder);
    await test(folder, kind, 'production', kind === 'vanilla' ? 5433 : 5434);
  }
  report.tarballSha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
  writeFileSync(resolve(root, 'references/validation/npm-package-consumers.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`All real consumer checks passed. Artifacts: ${runRoot}`);
} finally {
  await browser.close();
}
