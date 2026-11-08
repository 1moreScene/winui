import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8').replace(/^\uFEFF/, ''));
const native = read('out/materials-native/materials.json');
const save = (path, value) => {
  let existing;
  try { existing = read(path); } catch {}
  if (JSON.stringify(existing) !== JSON.stringify(value))
    writeFileSync(new URL(path, root), JSON.stringify(value, null, 2) + '\n');
};
if (native.colorSpace !== 'Auto' || native.curves.length !== 33 || native.curves.some(c => c.values.length !== 257))
  throw Error('Unexpected fixed native easing/color contract');
const samples = native.colorProgress.filter(s => s.pair === 'red-blue');
if (samples.length !== 129 || samples[0].rgb.join() !== '255,0,0' || samples.at(-1).rgb.join() !== '0,0,255')
  throw Error('Native color reference endpoints are invalid; refuse desktop/occluded pixels');
// Red -> blue follows the shortest HSL hue arc via magenta. This recovers
// normalized progress from rasterized color without fitting a wall clock.
const defaultCurve = samples.map(({rgb: [r,g,b]}, i) => {
  if (g !== 0 || Math.max(r,b) !== 255 || samples[i].progress !== i/128)
    throw Error('Native color reference is outside the expected HSL arc');
  return r === 255 ? b / 510 : 1 - r / 510;
});
const captureModes = [...new Set(native.records.map(s => s.captureMode))];
if (captureModes.some(mode => !['foreground-client', 'PrintWindow-own-client'].includes(mode)))
  throw Error('Unverified native window capture mode');
save('references/composition-color-profile.json', {
  sdk: 'Microsoft.WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental',
  source: 'MaterialsProbe / CompositionColorBrush ColorKeyFrameAnimation Auto / paused AnimationController.Progress',
  colorSpace: 'Hsl', defaultCurve, samples: native.colorProgress, captureModes,
  boundary: '8-bit native reference raster quantization. Measured SDK default, not an application clock fit.',
});
save('references/validation/native-easing-functions.json', {
  sdk: 'WinUI 2.3.10-experimental', source: 'EasingFunctionBase.Ease / fixed MaterialsProbe', curves: native.curves,
});
save('references/motion-native-defaults.json', {sdk: 'WinUI 2.3.10-experimental', accentColor: native.accentColor, ...native.transitionDefaults});
console.log('Verified and extracted 8481 native easing samples, 129 color samples and transition defaults.');
