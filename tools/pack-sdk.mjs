// Build through the package's prepack lifecycle and create a local npm tarball.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = resolve(root, 'packages/winui-wasm');
let destination = resolve(root, 'out/npm');
let buildWasm = false;
for (let index = 2; index < process.argv.length; index++) {
  const argument = process.argv[index];
  if (argument === '--build-wasm') buildWasm = true;
  else if (argument === '--out-dir') {
    const value = process.argv[++index];
    if (!value || value.startsWith('--')) throw new Error('--out-dir requires a directory path');
    destination = resolve(value);
  } else if (argument === '--help' || argument === '-h') {
    console.log('Usage: node tools/pack-sdk.mjs [--build-wasm] [--out-dir <directory>]\nDefault output: out/npm. Uses the existing verified WASM unless --build-wasm is supplied.');
    process.exit(0);
  } else throw new Error(`Unknown argument: ${argument}`);
}

function run(args, cwd = root, capture = false) {
  const result = spawnSync(process.execPath, args, {
    cwd, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (capture) process.stderr.write(`${result.stdout ?? ''}${result.stderr ?? ''}`);
    throw new Error(`Packaging command failed (exit ${result.status ?? result.signal})`);
  }
  return result.stdout;
}

if (buildWasm) run([resolve(root, 'tools/build-wasm.mjs')]);
const npm = process.env.npm_execpath ?? resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
if (!existsSync(npm)) throw new Error('Cannot locate npm CLI. Run this script with npm run pack:sdk.');
mkdirSync(destination, {recursive: true});
console.log('Building and packing winui-wasm through its release prepack checks…');
// Explicitly keep lifecycle checks enabled, even if the caller has ignore-scripts configured.
const output = run([npm, 'pack', '--json', '--ignore-scripts=false', '--foreground-scripts=false', '--pack-destination', destination], pkg, true);
const [packed] = JSON.parse(output);
if (!packed?.filename || packed.name !== 'winui-wasm') throw new Error('npm pack did not return the expected SDK package');
const files = new Set(packed.files.map(file => file.path));
for (const required of ['dist/index.js', 'dist/index.d.ts', 'dist/react.js', 'dist/react.d.ts', 'dist/wasm/winui.js', 'dist/wasm/winui_bg.wasm', 'dist/licenses/resource-manifest.json', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', 'README.md']) {
  if (!files.has(required)) throw new Error(`Package is missing ${required}`);
}
const sources = [...files].filter(file => /\.(?:rs|tsx?)$/.test(file) && !file.endsWith('.d.ts'));
if (sources.length) throw new Error(`Package unexpectedly contains implementation sources: ${sources.join(', ')}`);
const tarball = resolve(destination, packed.filename);
const sha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
const report = `${tarball}.json`;
writeFileSync(report, JSON.stringify({name: packed.name, version: packed.version, filename: packed.filename, sha256, size: packed.size, unpackedSize: packed.unpackedSize, files: packed.files.length, published: false}, null, 2) + '\n');
console.log(`Package: ${tarball}\nSHA-256: ${sha256}\nReport: ${report}`);
