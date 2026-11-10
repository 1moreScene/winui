// CI compiles the checked-in, verified resource IR. Regeneration from native
// reference installations is a separate developer operation, never a CI input.
import {spawnSync} from 'node:child_process';
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stampWasm} from './stamp-wasm-build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(command, args) {
  const result = spawnSync(command, args, {cwd: root, stdio: 'inherit', windowsHide: true});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit ${result.status}`);
}
const version = readFileSync(resolve(root, 'Cargo.toml'), 'utf8').match(/wasm-bindgen\s*=\s*"=([^"]+)"/)?.[1];
const cli = spawnSync('wasm-bindgen', ['--version'], {encoding: 'utf8', windowsHide: true});
if (!version || cli.status !== 0 || cli.stdout.trim() !== `wasm-bindgen ${version}`) throw new Error(`Install wasm-bindgen-cli ${version} to match the pinned Rust runtime`);
run('python', ['-X', 'utf8', 'tools/check-resource-licenses.py', '--release']);
run('node', ['tools/check-control-origins.mjs', '--check']);
run('node', ['tools/check-icon-fonts.mjs']);
run('node', ['tools/generate-enums.mjs', '--check']);
run('cargo', ['build', '--locked', '--release', '--target', 'wasm32-unknown-unknown']);
const output = resolve(root, 'packages/winui-wasm/src/wasm');
mkdirSync(output, {recursive: true});
run('wasm-bindgen', ['--target', 'web', '--out-dir', output, '--out-name', 'winui', resolve(root, 'target/wasm32-unknown-unknown/release/winui_wasm.wasm')]);
stampWasm(output);
