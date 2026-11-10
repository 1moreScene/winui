// Called only after cargo and wasm-bindgen finish successfully.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export function resourceFingerprint() {
  const hash = createHash('sha256');
  for (const name of ['references/mit-xaml-generation.json', 'references/mit-palette-generation.json', 'references/browser-theme-profile.json']) {
    hash.update(name).update(readFileSync(resolve(root, name)));
  }
  return hash.digest('hex');
}
export function stampWasm(outputDir) {
  const sha256 = createHash('sha256').update(readFileSync(resolve(outputDir, 'winui_bg.wasm'))).digest('hex');
  writeFileSync(resolve(outputDir, 'build-stamp.json'), JSON.stringify({sha256, completedAt:Date.now(),
    resourceSource:'MIT', resourceCommit:'7b12709347527238494ca28cb9fed326d513e779', resourceFingerprint:resourceFingerprint()}));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  stampWasm(resolve(root, process.argv[2] ?? 'packages/winui-wasm/src/wasm'));
}
