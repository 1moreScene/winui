import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {checkSdkEntrypoints} from './check-sdk-entrypoints.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = resolve(root, 'packages/winui-wasm');
const source = resolve(pkg, 'src');
const gallery = resolve(root, 'gallery/src');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = readJson(resolve(pkg, 'package.json'));
assert.equal(manifest.name, 'winui-wasm');
assert.equal(manifest.exports['.'].import, './dist/index.js');
assert.equal(manifest.exports['./react'].import, './dist/react.js');
for (const hook of ['preinstall', 'install', 'postinstall']) assert(!manifest.scripts?.[hook], 'consumers must not build Rust or run repository tools');
assert(!manifest.files.includes('src'));
assert(manifest.peerDependenciesMeta.react.optional, 'React must remain optional for the basic SDK');
for (const file of readdirSync(source).filter(name => /\.(?:ts|tsx|css)$/.test(name))) {
  assert(!existsSync(resolve(gallery, file)), `Gallery must not retain SDK implementation ${file}`);
}
const walk = folder => readdirSync(folder, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? walk(resolve(folder, entry.name)) : [resolve(folder, entry.name)]);
let imports = 0;
for (const file of walk(gallery).filter(path => /\.tsx?$/.test(path))) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
    const name = match[1];
    if (name.startsWith('winui-wasm')) {
      assert(['winui-wasm', 'winui-wasm/react'].includes(name), `Gallery imports a nonpublic SDK path: ${file}: ${name}`);
      imports++;
    }
    if (name.startsWith('.')) {
      const target = resolve(dirname(file), name);
      assert(!target.startsWith(pkg), `Gallery imports SDK source/implementation directly: ${file}`);
    }
  }
  assert(!/\/(?:src|packages\/winui-wasm\/src)\/(?:sdk|scene|react|index)\.tsx?/.test(text), `Gallery contains a source URL bridge: ${file}`);
}
const require = createRequire(resolve(root, 'gallery/package.json'));
const installed = readJson(require.resolve('winui-wasm/package.json'));
assert.equal(installed.name, manifest.name);
assert.equal(installed.version, manifest.version);
for (const file of ['index.js', 'index.d.ts', 'react.js', 'react.d.ts', 'wasm/winui_bg.wasm', 'assets/winui-icons.woff']) assert(existsSync(resolve(pkg, 'dist', file)), `npm output is missing ${file}`);
checkSdkEntrypoints(resolve(root,'gallery'),{react:true});
console.log(`SDK package boundary passed: ${imports} Gallery imports use public package entries; no SDK implementation remains in Gallery.`);
