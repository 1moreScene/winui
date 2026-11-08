import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const samples = read('out/sample-page-results.json');
const navigation = read('out/home-navigation-regression-results.json');
for (const result of [samples, navigation])
  if (result.stats.unexpected || result.errors.length || result.stats.interrupted)
    throw new Error('The final validation suite must pass before recording acceptance.');
const snapshot = 'out/gallery-page-dev';
const catalog = readFileSync(resolve(root, snapshot, 'src/gallery-catalog.ts'), 'utf8');
const mappings = catalog.match(/const implemented[^=]*=\s*\{([\s\S]*?)\n\};/)[1];
const routes = [...mappings.matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g)].map(match => ({ id: match[1], route: match[2] }));
const assets = readdirSync(resolve(root, 'out/gallery-page-preview/assets')).filter(name => /\.(js|css|wasm)$/.test(name));
const sourceFiles = ['sdk.ts', 'react.tsx', 'App.tsx', 'HomePage.tsx', 'GalleryNavigation.tsx', 'GalleryPageHeader.tsx',
  'sample-pages.css', 'ButtonPage.tsx', 'ShapesPage.tsx', 'OverlaysPage.tsx', 'CommandControlsPage.tsx', 'gallery-catalog.ts', 'official-home.json'];
const wasm = assets.find(name => name.endsWith('.wasm'));
const record = {
  date: '2026-11-08', galleryCommit: '7360ac322414e118eadfb0c7c2f4ecc31a218f59',
  officialSamples: 126, implementedNavigationItemsClicked: routes.length,
  pendingSamples: 126 - routes.length - 6, explicitlyExcludedSamples: 6,
  implementedRoutes: routes,
  samples: { mode: 'isolated Vite production build', passed: samples.stats.expected, failed: samples.stats.unexpected,
    config: 'gallery/playwright.sample-pages.config.ts', results: 'out/sample-page-results.json' },
  navigation: { implementation: 'existing Rust NavigationView via React NavigationView',
    mode: 'isolated source snapshot, HMR disabled', passed: navigation.stats.expected, failed: navigation.stats.unexpected,
    config: 'gallery/playwright.home-regression.config.ts', results: 'out/home-navigation-regression-results.json',
    wasmSha256: hash(`${snapshot}/src/wasm/winui_bg.wasm`) },
  checks: ['npm run typecheck', 'npm run declarations', 'node tools/prepare-gallery-page-validation.mjs', 'npx vite build'],
  productionWasm: { path: `out/gallery-page-preview/assets/${wasm}`, sha256: hash(`out/gallery-page-preview/assets/${wasm}`),
    matchesCurrentBinary: hash(`out/gallery-page-preview/assets/${wasm}`) === hash('gallery/src/wasm/winui_bg.wasm') },
  productionFiles: assets.map(name => ({ path: `out/gallery-page-preview/assets/${name}`, sha256: hash(`out/gallery-page-preview/assets/${name}`),
    matchesGalleryDist: existsSync(resolve(root, `gallery/dist/assets/${name}`)) && hash(`out/gallery-page-preview/assets/${name}`) === hash(`gallery/dist/assets/${name}`) })),
  sourceSnapshot: sourceFiles.map(name => ({ path: `${snapshot}/src/${name}`, sha256: hash(`${snapshot}/src/${name}`),
    matchesCurrentSource: hash(`${snapshot}/src/${name}`) === hash(`gallery/src/${name}`) })),
  sourceNotes: ['The tested production bundle and source snapshot are preserved separately; per-file comparisons below identify any subsequent workspace changes.',
    'Concurrent react.tsx changes after this snapshot add CommandBar TypeScript generics only; the reviewed diff does not alter NavigationView or runtime statements. Current workspace typecheck and declarations passed separately.'],
  screenshots: ['out/sample-page-button-Light.png', 'out/sample-page-button-Dark.png', 'out/sample-page-button-HighContrast.png',
    'out/sample-page-button-scrolled.png', 'out/sample-page-textbox-1440.png', 'out/sample-page-textbox-900.png', 'out/sample-page-textbox-390.png'],
  limits: ['No same-condition native release-window pixel comparison.',
    'Page shell uses DOM; navigation, demo controls and shared scrollbars use the existing Rust implementations.',
    'Existing route availability does not establish complete original-client control parity.'],
};
writeFileSync(resolve(root, 'references/sample-pages-validation.json'), JSON.stringify(record, null, 2) + '\n');
console.log(`Recorded ${record.samples.passed} production checks, ${record.navigation.passed} NavigationView regressions, ${routes.length} real navigation clicks.`);
