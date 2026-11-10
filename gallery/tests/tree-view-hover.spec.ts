import {test, expect} from '@playwright/test';
import {PNG} from 'pngjs';
import type {Scene, TreeViewController as TreeView, WinUI} from 'winui-wasm';

declare global {
  interface Window {
    treeHoverFixture: {scene: Scene; tree: TreeView<{id: string; text: string}>; sdk: WinUI; host: HTMLElement};
  }
}

for (const backend of ['Canvas2D', 'WebGL2'] as const) {
  for (const theme of ['Light', 'Dark'] as const) {
    test(`TreeView paints hover and selected hover in ${theme} ${backend}`, async ({page}) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/#tree-view');
      await page.getByRole('treeitem', {name: 'Work Documents', exact: true}).first().waitFor();
      await page.evaluate(async ({backend, theme}) => {
        const a = await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
        const sdk = await a.WinUI.create({globalScrollbars: false});
        const host = document.createElement('div');
        host.id = 'tree-hover-fixture';
        host.style.cssText = 'position:fixed;left:0;top:0;width:400px;height:220px;z-index:99999';
        document.body.append(host);
        const scene = sdk.scene(host, {
          theme: a.ThemeMode[theme], backend: a.RendererBackend[backend], reducedMotion: true,
        });
        const canvas = scene.root.canvas({width: 400, height: 220, background: theme === 'Light' ? '#ffffff' : '#202020'});
        const tree = canvas.treeView({
          canvasLeft: 20, canvasTop: 20, width: 300, height: 160,
          items: [{id: 'file', text: 'File'}],
        });
        window.treeHoverFixture = {scene, tree, sdk, host};
      }, {backend, theme});
      const row = page.locator('#tree-hover-fixture').getByRole('treeitem', {name: 'File', exact: true});
      await row.waitFor();
      const bounds = await row.boundingBox();
      if (!bounds) throw Error('Missing TreeView row');
      const x = bounds.x + bounds.width - 25;
      const y = bounds.y + bounds.height / 2;
      const pixel = async () => {
        await page.evaluate(() => window.treeHoverFixture.scene.render());
        const image = PNG.sync.read(await page.screenshot({clip: {x: Math.floor(x), y: Math.floor(y), width: 1, height: 1}}));
        return [...image.data.subarray(0, 3)];
      };
      await page.mouse.move(380, 200);
      const normal = await pixel();
      await page.mouse.move(x, y);
      await expect.poll(pixel).not.toEqual(normal);
      const hovered = await pixel();
      expect(hovered[0]).toBe(theme === 'Light' ? 246 : 45);
      await page.mouse.move(380, 200);
      await expect.poll(pixel).toEqual(normal);
      await page.evaluate(() => window.treeHoverFixture.tree.selectNode('file'));
      const selected = await pixel();
      await page.mouse.move(x, y);
      await expect.poll(pixel).not.toEqual(selected);
      await page.evaluate(() => window.treeHoverFixture.tree.update({enabled: false}));
      await expect.poll(pixel).toEqual(normal);
      await page.evaluate(() => {
        const {scene, sdk, host} = window.treeHoverFixture;
        scene.dispose(); sdk.dispose(); host.remove();
      });
      expect(errors).toEqual([]);
    });
  }
}

test('TreeView Gallery template renders a file glyph and highlights its row', async ({page}) => {
  await page.goto('/#tree-view');
  const sample = page.locator('#tree-template');
  const file = sample.getByRole('treeitem', {name: 'ProjectProposal.docx', exact: true});
  await file.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => {
    const nodes = window.navigationScenes['tree-template']?.snapshot.nodes ?? [];
    return nodes.filter(node => node.kind === 'TextBlock' && node.props.fontFamily === 'Segoe Fluent Icons')
      .map(node => node.props.text);
  })).toEqual(['\uE8A5', '\uE8A5', '\uE8A5']);
  const bounds = await file.boundingBox();
  if (!bounds) throw Error('Missing template row');
  const x = Math.floor(bounds.x + bounds.width - 25);
  const y = Math.floor(bounds.y + bounds.height / 2);
  await page.mouse.move(10, y);
  const before = await page.screenshot({clip: {x, y, width: 1, height: 1}});
  await file.hover();
  await expect.poll(async () => {
    const after = await page.screenshot({clip: {x, y, width: 1, height: 1}});
    return [...PNG.sync.read(after).data];
  }).not.toEqual([...PNG.sync.read(before).data]);
  await sample.screenshot({path: '../out/tree-view-template-hover.png'});
});
