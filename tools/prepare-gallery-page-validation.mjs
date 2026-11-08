// Keep validation independent of other sessions rebuilding gallery/dist or WASM.
import { cpSync, mkdirSync, existsSync, symlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gallery = resolve(root, 'gallery');
const name = process.env.GALLERY_VALIDATION_NAME ?? 'gallery-page';
if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid validation name.');
const snapshot = resolve(root, `out/${name}-dev`);
mkdirSync(snapshot, { recursive: true });
for (const path of ['src', 'public', 'index.html']) cpSync(resolve(gallery, path), resolve(snapshot, path), { recursive: true });
if (!existsSync(resolve(snapshot, 'node_modules'))) symlinkSync(resolve(gallery, 'node_modules'), resolve(snapshot, 'node_modules'), 'junction');
mkdirSync(resolve(snapshot, 'references'), { recursive: true });
cpSync(resolve(root, 'references/motion-native-defaults.json'), resolve(snapshot, 'references/motion-native-defaults.json'));
const materials = resolve(snapshot, 'src/MaterialsPage.tsx');
writeFileSync(materials, readFileSync(materials, 'utf8').replace('../../references/motion-native-defaults.json', '../references/motion-native-defaults.json'));
execFileSync(process.execPath, [resolve(gallery, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', resolve(root, `out/${name}-preview`), '--emptyOutDir'], { cwd: gallery, stdio: 'inherit' });
console.log('Prepared isolated production and source snapshots.');
