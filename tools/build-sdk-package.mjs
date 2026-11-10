import {resourceFingerprint} from './stamp-wasm-build.mjs';
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname, extname} from 'node:path';
import {createHash} from 'node:crypto';
import {syncLicenseBundle} from './sync-license-bundle.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = resolve(root, 'packages/winui-wasm');
const dist = resolve(pkg, 'dist');
const local = process.argv.includes('--local');
function run(command, args) {
  const result = spawnSync(command, args, {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run('python', ['-X', 'utf8', 'tools/check-resource-licenses.py', local ? '--files' : '--release']);
run('node', ['tools/check-control-origins.mjs', '--check']);
const wasm = resolve(pkg, 'src/wasm/winui_bg.wasm');
if (!existsSync(wasm)) throw new Error('Build the Rust/WASM runtime before building the npm package. Consumers never run this step.');
const stamp = JSON.parse(readFileSync(resolve(pkg, 'src/wasm/build-stamp.json'), 'utf8'));
if (createHash('sha256').update(readFileSync(wasm)).digest('hex') !== stamp.sha256) throw new Error('WASM build stamp does not match the runtime');
if (stamp.resourceSource !== 'MIT' || stamp.resourceFingerprint !== resourceFingerprint()) throw new Error('Rebuild Rust/WASM from the current verified MIT resources before packing.');
run('node', ['packages/winui-wasm/node_modules/typescript/bin/tsc', '-p', 'packages/winui-wasm/tsconfig.json']);
for (const folder of ['wasm', 'assets']) cpSync(resolve(pkg, 'src', folder), resolve(dist, folder), {recursive: true});
cpSync(resolve(pkg, 'src/host.css'), resolve(dist, 'host.css'));
cpSync(resolve(pkg, 'src/host-styles.d.ts'), resolve(dist, 'host-styles.d.ts'));
const css = readFileSync(resolve(pkg, 'src/host.css'), 'utf8');
writeFileSync(resolve(dist, 'host-styles.js'), `const css=${JSON.stringify(css)};\nexport function ensureHostStyles(document){if(document.querySelector('style[data-winui-sdk-host]'))return;const style=document.createElement('style');style.dataset.winuiSdkHost='';style.textContent=css;(document.head??document.documentElement).append(style);}\n`);
const walk = folder => readdirSync(folder, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? walk(resolve(folder, entry.name)) : [resolve(folder, entry.name)]);
// Native ESM and declarations use explicit relative extensions; no TS source,
// Vite-only imports, repository aliases or consumer-side Rust build is needed.
for (const file of walk(dist).filter(file => file.endsWith('.js') || file.endsWith('.d.ts'))) {
  let text = readFileSync(file, 'utf8');
  text = text.replace(/\b(from\s*|import\s*\(\s*|import\s*)(['"])(\.[^'"\r\n]+)\2/g, (all, prefix, quote, name) => {
    if (extname(name)) return all;
    return existsSync(resolve(dirname(file), name + '.js')) ? `${prefix}${quote}${name}.js${quote}` : all;
  });
  if (file.endsWith('.js')) text = text.replace(/(from\s*['"][^'"]+\.json['"])(?!\s*with\s*\{)/g, '$1 with {type:"json"}');
  writeFileSync(file, text);
}
cpSync(resolve(root, 'LICENSE'), resolve(pkg, 'LICENSE'));
cpSync(resolve(root, 'THIRD_PARTY_NOTICES.txt'), resolve(pkg, 'THIRD_PARTY_NOTICES.txt'));
syncLicenseBundle(['packages/winui-wasm/dist/licenses']);
writeFileSync(resolve(pkg, 'RELEASE-STATUS.txt'), 'See dist/licenses/resource-manifest.json for reviewed sources, scope and license conditions. Package publication is a separate action.\n');
writeFileSync(resolve(dist, 'package-build.json'), JSON.stringify({wasmSha256: stamp.sha256, resourceSource: stamp.resourceSource, resourceFingerprint: stamp.resourceFingerprint, localOnly: local, format: 'ESM', entries: ['winui-wasm', 'winui-wasm/react']}, null, 2) + '\n');
console.log(`Built independent npm SDK (${local ? 'local verification only' : 'release'}): ${dist}`);
