import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from '../gallery/node_modules/playwright/index.mjs';

const output = new URL('../out/segmented-browser/', import.meta.url);
await mkdir(output, {recursive: true});
const path = name => fileURLToPath(new URL(name, output));
const url = process.env.GALLERY_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({channel: process.env.PW_CHANNEL ?? 'chrome'});
const cases = [];
try {
  for (const dpr of [1, 1.25]) {
    for (const theme of ['Light', 'Dark']) {
      const page = await browser.newPage({viewport: {width: 840, height: 700}, deviceScaleFactor: dpr});
      await page.goto(new URL('#segmented', url).href);
      await page.waitForFunction(() => window.gallery?.sdk);
      await page.evaluate(({theme}) => {
        document.getElementById('app').style.display = 'none';
        const host = document.createElement('div');
        host.id = 'segmented-fixture';
        host.style.cssText = 'position:fixed;left:0;top:0;width:500px;height:420px';
        document.body.append(host);
        const scene = window.gallery.sdk.scene(host, {theme});
        const root = scene.root.stack({
          width: 500, height: 420, padding: [12, 12, 12, 12], spacing: 12,
          background: theme === 'Light' ? '#F0F0F0' : '#202020',
        });
        const controls = [];
        for (const [segmentedStyle, orientation] of [
          ['Default', 'Horizontal'], ['Pivot', 'Horizontal'], ['Button', 'Horizontal'], ['Default', 'Vertical'],
        ]) {
          const control = root.segmented({segmentedStyle, orientation, selectedIndex: 0,
            accessibleName: `${segmentedStyle} ${orientation}`});
          for (const [content, icon] of [['Day', '\uE8BF'], ['Week', '\uE8C0'], ['Month', '\uE787']]) {
            control.segmentedItem({content, icon});
          }
          controls.push(control);
        }
        window.segmentedFixture = {scene, controls};
      }, {theme});
      const host = page.locator('#segmented-fixture');
      const first = host.getByRole('listbox', {name: 'Default Horizontal'}).getByRole('option', {name: 'Day'});
      await first.waitFor();
      const name = `${theme}-${dpr}`;
      await host.screenshot({path: path(name + '.png')});
      const geometry = await page.evaluate(() => window.segmentedFixture.controls.map(control => ({
        style: control.properties.segmentedStyle, orientation: control.properties.orientation, rect: control.snapshot.rect,
        items: control.items.map(item => item.snapshot.rect),
      })));

      const item = await first.boundingBox();
      await page.mouse.move(item.x + item.width / 2, item.y + item.height / 2);
      await page.mouse.down();
      const down = await pillFrames(page, item, theme);
      await host.screenshot({path: path(name + '-pressed.png')});
      await page.mouse.up();
      const up = await pillFrames(page, item, theme);
      cases.push({theme, dpr, geometry, down, up});
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(path('browser.json'), JSON.stringify(cases, null, 2) + '\n');

async function pillFrames(page, item, theme) {
  return page.evaluate(({item, theme}) => new Promise(resolve => {
    const canvas = document.querySelector('#segmented-fixture canvas');
    const scale = window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    const x = Math.round((item.x + item.width / 2 - 12) * scale);
    const y = Math.round((item.y + item.height - 2.5) * scale);
    const width = Math.ceil(24 * scale);
    const start = performance.now();
    const frames = [];
    function frame(now) {
      const data = ctx.getImageData(x, y, width, 1).data;
      let accentPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 2] - data[i] > (theme === 'Light' ? 70 : 65)) accentPixels++;
      }
      frames.push({timeMs: now - start, widthDip: accentPixels / scale});
      if (now - start < 215) requestAnimationFrame(frame);
      else resolve(frames);
    }
    requestAnimationFrame(frame);
  }), {item, theme});
}
