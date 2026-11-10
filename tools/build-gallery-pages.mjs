import {resolve} from 'node:path';
import {readFileSync, writeFileSync} from 'node:fs';
import {root, git, repository, runNode} from './github-pages.mjs';

const repo = repository();
console.log(`Building Gallery for ${repo.slug} at ${repo.base}`);
runNode([resolve(root, 'tools/build-sdk-package.mjs')]);
runNode([resolve(root, 'gallery/node_modules/typescript/bin/tsc'), '--noEmit', '-p', resolve(root, 'gallery/tsconfig.json')]);
runNode([resolve(root, 'gallery/node_modules/vite/bin/vite.js'), 'build', '--base', repo.base, '--outDir', 'dist-pages'], resolve(root, 'gallery'));
const dist = resolve(root, 'gallery/dist-pages');
writeFileSync(resolve(dist, '.nojekyll'), '');
const stamp = JSON.parse(readFileSync(resolve(root, 'packages/winui-wasm/src/wasm/build-stamp.json'), 'utf8'));
writeFileSync(resolve(dist, 'pages-build.json'), JSON.stringify({repository: repo.slug, base: repo.base,
  sourceCommit: git(['rev-parse', 'HEAD']), includesWorkingTreeChanges: !!git(['status', '--porcelain']), wasmSha256: stamp.sha256,
  builtAt: new Date().toISOString()}, null, 2) + '\n');
console.log(`Pages build ready: ${dist}`);
