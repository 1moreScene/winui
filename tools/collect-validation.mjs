import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const reportPath=process.env.WINUI_BROWSER_REPORT??'out/browser-results.json';
const reports=reportPath.split(';').map(path=>({path,report:JSON.parse(readFileSync(new URL(path,root),'utf8'))}));
const latestTests=new Map();
function collect(suite) {
  for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) latestTests.set(`${spec.file}:${spec.title}:${test.projectName}`,{file:spec.file,title: spec.title, ...test });
  for (const child of suite.suites ?? []) collect(child);
}
for(const {report} of reports)for(const suite of report.suites)collect(suite);
const tests=[...latestTests.values()];
const attachment = tests.flatMap(test => test.results.flatMap(result => result.attachments ?? [])).find(a => a.name === 'browser-metrics.json');
const metrics = attachment?.body ? JSON.parse(Buffer.from(attachment.body, 'base64').toString()) : null;
const assets = readdirSync(new URL('gallery/dist/assets/', root)).map(name => {
  const bytes = readFileSync(new URL(`gallery/dist/assets/${name}`, root));
  return { name, bytes: bytes.length, gzipBytes: gzipSync(bytes).length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
const result = {
  date: '2026-11-07', generatedAtUtc: new Date().toISOString(),
  browserReport:reportPath,
  validatedWasm:JSON.parse(readFileSync(new URL('gallery/src/wasm/build-stamp.json',root),'utf8')),
  currentWorkspace:JSON.parse(readFileSync(new URL('references/validation/overlays-current-workspace.json',root),'utf8')),
  browserRuns:reports.map(({path,report})=>({path,stats:report.stats})),
  integrationChecks:JSON.parse(readFileSync(new URL(process.env.WINUI_INTEGRATION_CHECKS??'references/validation/stage6-integration-checks.json',root),'utf8')),
  rustTests: JSON.parse(readFileSync(new URL('references/validation/rust-tests.json',root),'utf8')),
  checks: ['cargo fmt --all -- --check', 'cargo clippy --all-targets --locked -- -D warnings', 'cargo clippy --target wasm32-unknown-unknown --locked -- -D warnings', 'node tools/generate-enums.mjs --check', 'node tools/verify-baseline.mjs', 'npm run build (WASM, strict TypeScript including negative API cases, Vite, SDK declarations)'],
  browser: { passed: tests.filter(test => test.status === 'expected').length, total: tests.length, channel: 'chrome', tests: tests.map(test => ({ name: test.title, status: test.status })), metrics },
  assets,
  overlays:{canvas:JSON.parse(readFileSync(new URL('references/validation/overlays-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/overlays-WebGL2.json',root),'utf8')),themes:JSON.parse(readFileSync(new URL('references/validation/overlays-themes.json',root),'utf8'))},
  animatedIcons:{canvas:JSON.parse(readFileSync(new URL('references/validation/animated-icons-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/animated-icons-WebGL2.json',root),'utf8'))},
  vectors:{canvas:JSON.parse(readFileSync(new URL('references/validation/vectors-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/vectors-WebGL2.json',root),'utf8'))},
  nativeComparison: JSON.parse(readFileSync(new URL('references/validation/navigation-comparison.json',root),'utf8')),
  buttonComparison: JSON.parse(readFileSync(new URL('references/validation/button-comparison.json',root),'utf8')),
  gpuComparison: JSON.parse(readFileSync(new URL('references/validation/gpu-comparison.json',root),'utf8')),
  gpuEnvironment: JSON.parse(readFileSync(new URL('out/stages/gpu-environment.json',root),'utf8')),
  effectsComparison: JSON.parse(readFileSync(new URL('references/validation/effects-native-comparison.json',root),'utf8')),
  materialBackends: JSON.parse(readFileSync(new URL('references/validation/material-backends.json',root),'utf8')),
  officialAcrylic: JSON.parse(readFileSync(new URL('references/validation/official-acrylic-comparison.json',root),'utf8')),
  tintAnimation: JSON.parse(readFileSync(new URL('references/validation/tint-animation-comparison.json',root),'utf8')),
  gradients: JSON.parse(readFileSync(new URL('references/validation/gradient-comparison.json',root),'utf8')),
  acceptTiming: JSON.parse(readFileSync(new URL('references/validation/accept-timing-comparison.json',root),'utf8')),
  releaseAudit: JSON.parse(readFileSync(new URL('references/validation/release-audit.json',root),'utf8')),
  selection: JSON.parse(readFileSync(new URL('references/validation/selection-comparison.json',root),'utf8')),
  antialias: JSON.parse(readFileSync(new URL('references/validation/antialias.json',root),'utf8')),
  fiveControls:{canvas:JSON.parse(readFileSync(new URL('references/validation/five-controls-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/five-controls-WebGL2.json',root),'utf8')),caps:JSON.parse(readFileSync(new URL('references/validation/progress-cap-coverage.json',root),'utf8'))},
  icons:{canvas:JSON.parse(readFileSync(new URL('references/validation/icons-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/icons-WebGL2.json',root),'utf8')),coverage:{canvas:JSON.parse(readFileSync(new URL('references/validation/icon-path-coverage-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/icon-path-coverage-WebGL2.json',root),'utf8'))}},
  badgeGallery:{canvas:JSON.parse(readFileSync(new URL('references/validation/badge-gallery-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/badge-gallery-WebGL2.json',root),'utf8'))},
  basicNext:{canvas:JSON.parse(readFileSync(new URL('references/validation/basic-next-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/basic-next-WebGL2.json',root),'utf8'))},
  progress:{canvas:JSON.parse(readFileSync(new URL('references/validation/progress-Canvas2D.json',root),'utf8')),gpu:JSON.parse(readFileSync(new URL('references/validation/progress-WebGL2.json',root),'utf8'))},
  globalScrollbars:JSON.parse(readFileSync(new URL('references/validation/global-scrollbars.json',root),'utf8')),
  editorHelper:JSON.parse(readFileSync(new URL('references/validation/editor-helper-comparison.json',root),'utf8')),
  multilineAccent:JSON.parse(readFileSync(new URL('references/validation/multiline-accent.json',root),'utf8')),
  textScroll:JSON.parse(readFileSync(new URL('references/validation/text-scroll-comparison.json',root),'utf8')),
  textRounding:JSON.parse(readFileSync(new URL('references/validation/text-rounding.json',root),'utf8')),
  selectionInput: JSON.parse(readFileSync(new URL('references/validation/selection-input-comparison.json',root),'utf8')),
  imageText: JSON.parse(readFileSync(new URL('references/validation/image-text-comparison.json',root),'utf8')),
  rustAnalyzer: JSON.parse(readFileSync(new URL('references/validation/rust-analyzer.json',root),'utf8')),
  effectsPerformance: JSON.parse(readFileSync(new URL('references/validation/effects-performance.json',root),'utf8')),
  productionPerformance: JSON.parse(readFileSync(new URL('references/validation/production-performance.json',root),'utf8')),
  limitations: ['HighContrast Button comparisons use matching deterministic resource fixtures, not a change to the user OS accessibility configuration.', 'The real TextBox editor host validates Chromium IME composition and DOM anchor placement; OS candidate-window appearance and screen-reader acceptance are not established.', 'Dev-server local measurements, not a controlled cold-start benchmark.', 'Frame timings include synchronous WASM, Canvas submission and accessibility DOM work; Phase-5 GPU paint elapsed queries are measured separately; OS process CPU and total VRAM are not measured.', 'Static native/browser captures use matched 1000x500 DIP, DPR 1 (progress probes: 1.25) and per-case inputs. RenderTargetBitmap may differ from the live compositor, especially Acrylic/AnimatedIcon; native pixel parity is not accepted.', 'Native animation captures take about 150ms each; timestamp intervals are preserved. Phase-5 adds UI Rendering callback properties and bracketed GDI pixels; neither establishes precise compositor-present equivalence.']
};
mkdirSync(new URL('references/validation/', root), { recursive: true });
writeFileSync(new URL('references/validation/results.json', root), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.browser.passed, total: result.browser.total, metrics, assets }, null, 2));
