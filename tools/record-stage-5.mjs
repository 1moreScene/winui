import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8').replace(/^\uFEFF/, ''));
const result = read('references/validation/results.json');
const native = read('out/materials-native/materials.json');
const acrylic = read('references/validation/official-acrylic-comparison.json');
const gradient = read('references/validation/gradient-comparison.json');
const tint = read('references/validation/tint-animation-comparison.json');
const motionSources = read('gallery/src/official-motion.json');
const range = values => [Math.min(...values), Math.max(...values)];
if (result.browser.total < 33 || result.browser.passed !== result.browser.total || acrylic.results.length !== 12 || gradient.results.length !== 12 || tint.fixedProgress.frames.length !== 34)
  throw Error('Incomplete stage-5 evidence; run the full browser suite with its configured JSON reporter');
const remaining = [
  'Native exact pixel and compositor present-time equivalence remain unaccepted. Wall-clock color replay differs from fixed-progress effect sampling.',
  'Blur downsampling/kernel, 8-bit color-curve quantization, font/edge rasterization and untested native layer matrices remain quality/coverage limits.',
  'Property-transition page uses public animate calls for the first four scalar/2D vector samples; implicit property attachment, Z, background/local-theme BrushTransition and the last two examples remain pending.',
  'Theme/entrance/reposition/content/page/connected/spring/expression animation families remain pending, with phase-6/7 control and navigation dependencies; ElasticEase is not a spring solver.',
  'Mica/Desktop Acrylic require a Windows host; browser backdrop excludes desktop, other windows and external DOM.',
  'Native gradient comparisons cover opaque two-stop radial samples; 2..32-stop API support is not exhaustive native acceptance.',
  'Canvas reference caches radial/repeated brush pixels (8 entries, max 1MP each); GPU evaluates the gradient analytically. Whole-scene rendering is not rasterized through Canvas.',
];
const alignment = {
  generatedAtUtc: new Date().toISOString(), galleryCommit: '7360ac322414e118eadfb0c7c2f4ecc31a218f59',
  sourceCount: motionSources.sources.length, nativeDpr: native.dpi,
  acrylic: { examples: 3, comparisons: acrylic.results.length, meanChannelErrorRange: range(acrylic.results.map(r=>r.mean)), region: 'Full 400/652 x 252 DIP preview excluding 5 physical pixels at OS window edges' },
  easing: { examples: 4, families: 11, directions: 3, nativeScalarSamples: native.curves.reduce((n,c)=>n+c.values.length,0), absoluteTolerance: 1e-4 },
  propertyTransitions: { examples: 4, source: 'SharedTransitionAnimations.cpp', duration: native.transitionDefaults.scalarMs, cubic: [0.8,0,0.2,1], acceptance: 'source parameters and browser interactions; not native present-time equivalence' },
  gradients: { nativeCases: 6, backends: 2, comparisons: gradient.results.length, meanChannelErrorRange: range(gradient.results.map(r=>r.mean)) },
  tint: { durationMs: tint.durationMs, observedAutoColorSpace: tint.colorSpace, profileSamples: 129,
    fixedProgress: { frames: tint.fixedProgress.frames.length, p95MeanChannelError: tint.fixedProgress.p95, maxMeanChannelError: tint.fixedProgress.max },
    wallClock: { frames: tint.wallClock.frames.length, p95MeanChannelError: tint.wallClock.p95, maxMeanChannelError: tint.wallClock.max, boundary: tint.wallClock.boundary } },
  remaining,
};
writeFileSync(new URL('references/stage-5-alignment.json', root), JSON.stringify(alignment,null,2)+'\n');
const paths = ['src/animation.rs','src/easing.rs','src/scene/motion.rs','src/scene/mod.rs','src/scene/paint.rs','src/scene/properties.rs','src/material.rs','src/resources.rs','src/render.rs','src/gpu.rs','src/acrylic.glsl','packages/winui-wasm/src/scene.ts','packages/winui-wasm/src/index.ts','packages/winui-wasm/src/react.tsx','gallery/src/style.css','gallery/src/App.tsx','gallery/src/ButtonPage.tsx','gallery/src/MaterialsPage.tsx','gallery/src/EffectsPage.tsx','gallery/src/official-motion.json','packages/winui-wasm/src/enums.ts','references/api-enums.json','references/composition-color-profile.json','references/motion-native-defaults.json','tools/extract-gallery-motion.py','tools/extract-native-motion.mjs','tools/record-stage-5.mjs','tools/native-navigation/MaterialsProbe.cs','out/materials-native/materials.json','gallery/tests/materials.spec.ts','gallery/tests/effects.spec.ts','tests/easing.rs','tests/keyframes.rs','tests/scene.rs'];
const stage = {
  date: '2026-11-07', generatedAtUtc: new Date().toISOString(), stage:5, status:'implemented and validated within the recorded scope',
  scope: 'Reusable presentation/keyframe/easing tracks, application-local Acrylic, three official Acrylic examples, four easing examples, four 2D property transitions and gradient pages; remaining families are explicit below.',
  pages: { acrylic:'http://127.0.0.1:5173/#acrylic', easing:'http://127.0.0.1:5173/#easing', transitions:'http://127.0.0.1:5173/#transitions', gradients:'http://127.0.0.1:5173/#gradients', diagnostics:'http://127.0.0.1:5173/#effects-lab' },
  validation: { rust:result.rustTests, browser:{passed:result.browser.passed,total:result.browser.total,channel:result.browser.channel,
    followup:'After the full 33-test suite, targeted 5-test material verification covered easing-priority/cache updates; a further property/gradient interaction check covered the final preview-height/CSS adjustment. Full-suite startup metrics retain their original sampled WASM size.'}, checks:result.checks, alignment:'references/stage-5-alignment.json', nativeMotionFrames:result.effectsComparison.frames.length },
  remaining, evidence:['docs/stage-5.md','references/stage-5-alignment.json','references/validation/results.json','references/validation/effects-performance.json','out/materials-native/materials.json','out/materials/'],
  files: paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')})),
};
writeFileSync(new URL('references/stage-5.json', root),JSON.stringify(stage,null,2)+'\n');
console.log(`Recorded stage 5: ${result.rustTests.passed} Rust, ${result.browser.passed} browser, ${acrylic.results.length} Acrylic and ${gradient.results.length} gradient comparisons.`);
