import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));
const hash = path => createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex');
const suites = ['navigation-quality-results', 'home-navigation-regression-results', 'sample-page-results'].map(name => {
  const result = json(`out/${name}.json`);
  if (result.stats.unexpected || result.stats.interrupted || result.errors.length) throw new Error(`${name} has failed or incomplete checks.`);
  return { result: `out/${name}.json`, passed: result.stats.expected, failed: result.stats.unexpected };
});
const rust = read('out/navigation-quality-rust-tests.log');
if (/test result: FAILED|error: test failed/.test(rust)) throw new Error('Rust tests failed.');
const counts = [...rust.matchAll(/test result: ok\. (\d+) passed/g)];
if (!counts.length) throw new Error('No completed Rust tests.');
const fullRust = read('out/navigation-quality-full-rust-tests.log');
const assets = readdirSync(new URL('../out/gallery-page-preview/assets/', import.meta.url));
const wasm = assets.find(name => name.endsWith('.wasm'));
const wasmPath = `out/gallery-page-preview/assets/${wasm}`;
const record = {
  date: '2026-11-08', implementation: 'Existing Rust NavigationView, shared TypeScript/React adapters',
  baseline: { winuiCommit: '7b12709347527238494ca28cb9fed326d513e779', source: 'NavigationView.cpp::AnimateSelectionChanged / PlayIndicatorNonSameLevelAnimations' },
  fixes: ['Use the native resource fallback for the Gallery navigation because its Canvas cannot sample external DOM.',
    'Preserve the indicator timeline when the same item scrolls or reflows.',
    'Scale indicators locally across indentation levels; retain same-level stretch and rapid reversal behavior.',
    'Clip each indicator to its owning menu or footer.',
    'Retire InputProbe and its legacy input protocol; use the real TextBox for IME diagnostics.'],
  performance: { before: json('out/navigation-performance/before.json'), after: json('out/navigation-performance/after.json'),
    measurement: 'Chrome, Canvas2D, 1440x1000, 35 pointer moves; SDK measured drawing time, not input-to-display latency or a cross-device FPS guarantee.' },
  suites, rust: { scope: 'navigation_indicator, navigation, text_scroll', passed: counts.reduce((sum, match) => sum + Number(match[1]), 0), failed: 0, log: 'out/navigation-quality-rust-tests.log' },
  fullRust: { passed: !/test result: FAILED|error: test failed/.test(fullRust),
    log: 'out/navigation-quality-full-rust-tests.log',
    note: 'Full run captured two failures in concurrently developed CommandBar tests: closed_secondary_accelerator_invokes_and_roving_tab_is_single and ordered_overflow_focus_and_close_do_not_reopen. Navigation and TextBox suites are validated separately.' },
  audit: 'references/control-origins.json', screenshot: 'out/navigation-performance/settled.png',
  productionWasm: { path: wasmPath, sha256: hash(wasmPath), matchesCurrentBinary: hash(wasmPath) === hash('packages/winui-wasm/src/wasm/winui_bg.wasm') },
  sources: ['src/animation.rs', 'src/navigation.rs', 'src/render.rs', 'tests/navigation_indicator.rs',
    'gallery/src/GalleryNavigation.tsx', 'gallery/tests/navigation-quality.spec.ts', 'tools/check-control-origins.mjs'].map(path => ({ path, sha256: hash(path) })),
  limits: ['No native release-window frame-by-frame Composition parity acceptance.',
    'Control origin audit classifies public APIs; it does not certify implementation completeness.',
    'The real browser IME test covers composition events and commit; OS candidate-window visuals are not captured.'],
};
writeFileSync(new URL('../references/navigation-quality-validation.json', import.meta.url), JSON.stringify(record, null, 2) + '\n');
console.log(`Recorded ${record.rust.passed} Rust tests and ${suites.reduce((sum, suite) => sum + suite.passed, 0)} browser checks.`);
