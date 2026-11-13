import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { catalog, groups, type ControlKind } from '../src/catalog';
import { createNode, starterDocument, reactSource, parseDocument } from '../src/model';
import type { Scene } from 'winui-wasm';

const root = fileURLToPath(new URL('../', import.meta.url));
test('目录覆盖全部已核验公共 SDK 控件，名称保持原名，全部可序列化导出', async () => {
  const origins = JSON.parse(readFileSync(resolve(root, '../references/control-origins.json'), 'utf8'));
  const expected = origins.nodeKinds.filter((item: { classification: string }) => item.classification === 'WinUI control').map((item: { name: string }) => item.name).sort();
  expect(catalog.map(item => item.kind).sort()).toEqual(expected);
  for (const item of catalog) expect(item.title).toBe(item.kind);
  const doc = { ...starterDocument(), nodes: catalog.map(item => createNode(item.kind)) };
  expect(parseDocument(JSON.stringify(doc))).toEqual(doc);
  const file = resolve(root, 'tests', '.all-controls-validation.tsx');
  try {
    writeFileSync(file, reactSource(doc));
    const result = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--noEmit', '--skipLibCheck', '--strict', '--jsx', 'react-jsx', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'Bundler', file], { cwd: root, encoding: 'utf8' });
    expect(result.stdout + result.stderr).toBe(''); expect(result.status).toBe(0);
  } finally { unlinkSync(file); }
});

for (const [group, kinds] of Object.entries(groups)) test(`真实画布逐项创建 ${group}`, async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.getByRole('tree', { name: 'WinUI controls' })).toBeVisible();
  for (const kind of kinds) {
    const node = createNode(kind, 48, 48), doc = { ...starterDocument(), name: kind, nodes: [node] };
    await page.getByLabel('导入设计文件').setInputFiles({ name: 'control.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
    await expect.poll(async () => page.getByTestId('artboard').evaluate(element => {
      const scene = (element as HTMLElement & { designerScene?: Scene }).designerScene;
      return scene?.snapshot.nodes.map(node => String(node.kind)) ?? [];
    }), { message: `${kind} must create its real Rust node` }).toContain(kind);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(errors, `${kind} must render without SDK/React failures`).toEqual([]);
  }
});

test('TreeView 折叠、英文搜索、添加和拖放', async ({ page }) => {
  await page.goto('/');
  const tree = page.getByRole('tree', { name: 'WinUI controls' });
  await expect(tree).toBeVisible();
  await expect.poll(async () => {
    const panel = await page.locator('.component-library').boundingBox(), bounds = await tree.boundingBox();
    return !!panel && !!bounds && Math.abs(bounds.width - panel.width) <= 1;
  }, { message: 'The control tree fills its panel so original names are not clipped to a natural-width column' }).toBe(true);
  const basic = tree.getByRole('treeitem', { name: 'Basic input', exact: true });
  await expect(basic).toHaveAttribute('aria-expanded', 'true');
  await basic.click(); await page.keyboard.press('ArrowLeft');
  await expect(basic).toHaveAttribute('aria-expanded', 'false');
  await basic.press('ArrowRight'); await expect(basic).toHaveAttribute('aria-expanded', 'true');
  const search = page.getByRole('combobox', { name: '搜索组件', exact: true });
  await search.fill('ColorPicker');
  await tree.getByRole('treeitem', { name: 'ColorPicker', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('winui-designer.document.v1')!).nodes.at(-1)?.kind)).toBe('ColorPicker');
  await search.fill('Button');
  await tree.getByRole('treeitem', { name: 'Button', exact: true }).dragTo(page.getByTestId('design-overlay'), { targetPosition: { x: 225, y: 300 } });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('winui-designer.document.v1')!).nodes.at(-1)?.kind)).toBe('Button');
  await page.screenshot({ path: '../out/designer-control-tree.png', fullPage: true });
});

test('itemsSource 溢出时可用滚轮和滚动条', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox', { name: '搜索组件', exact: true });
  await search.fill('Segmented');
  await page.getByRole('treeitem', { name: 'Segmented', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'itemsSource', exact: true });
  const items = Array.from({ length: 30 }, (_, index) => `Item ${index + 1}`);
  const source = JSON.stringify(items, null, 2);
  await editor.fill(source);
  await editor.press('Tab');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('winui-designer.document.v1')!).nodes.at(-1)?.properties.itemsSource)).toEqual(items);
  await editor.press('Control+Home');
  await search.focus();
  await editor.hover();
  const bar = page.locator('[data-designer-ui="RichEditBox"]').getByRole('scrollbar', { name: 'vertical scroll', exact: true });
  await expect(bar).toHaveAttribute('aria-valuenow', '0');
  const offset = async () => Number(await bar.getAttribute('aria-valuenow'));
  const inspector = page.getByRole('complementary', { name: '属性面板', exact: true });
  const panelOffset = await inspector.evaluate(element => element.scrollTop);
  await page.mouse.wheel(0, 120);
  await expect.poll(offset).toBeGreaterThan(0);
  expect(await inspector.evaluate(element => element.scrollTop)).toBe(panelOffset);
  await expect(editor).toHaveValue(source);
  await page.mouse.wheel(0, -120);
  await expect.poll(offset).toBe(0);
  const bounds = (await bar.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width - 6, bounds.y + 22);
  await page.mouse.down();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await offset()).toBe(0);
  await page.mouse.move(bounds.x + bounds.width - 6, bounds.y + 66, { steps: 8 });
  await page.mouse.up();
  await expect.poll(offset).toBeGreaterThan(0);
  await expect(editor).toHaveValue(source);
});

test('弹层通过真实 SDK 宿主在预览中打开，命令绑定与专用属性可用', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.getByRole('tree', { name: 'WinUI controls' })).toBeVisible();
  const openKinds: ControlKind[] = ['ContentDialog','Popup','Flyout','MenuFlyout','ToolTip','TeachingTip','CommandBarFlyout','MenuFlyoutSubItem'];
  for (const kind of openKinds) {
    const node = createNode(kind, 48, 48), doc = { ...starterDocument(), nodes: [node] };
    await page.getByLabel('导入设计文件').setInputFiles({ name: 'overlay.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
    await page.getByRole('button', { name: '预览页面', exact: true }).click();
    const trigger = page.locator('.sdk-surface').getByRole('button', { name: kind, exact: true });
    if (kind === 'ToolTip') await trigger.hover(); else await trigger.click();
    const expected = kind === 'MenuFlyoutSubItem' ? 'MenuFlyout' : kind;
    if (kind === 'TeachingTip') await expect(page.getByTestId('artboard').getByRole('note', { name: kind, exact: true })).toBeVisible();
    else await expect.poll(() => page.getByTestId('artboard').evaluate((element, expected) => {
      const scene = (element as HTMLElement & { designerScene: Scene }).designerScene;
      return scene.snapshot.nodes.some(node => String(node.kind) === expected && (node.overlay?.isOpen || node.composed?.modalActive));
    }, expected), { message: `${kind} opens through the native SDK` }).toBe(true);
    if (kind === 'ContentDialog') await page.getByTestId('artboard').getByRole('button', { name: 'Close', exact: true }).click();
    else await page.keyboard.press('Escape');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (await page.locator('.workspace.is-preview').count()) await page.getByRole('button', { name: '返回设计', exact: true }).click();
    await expect(page.getByRole('button', { name: '预览页面', exact: true })).toBeVisible();
  }
  const command = createNode('UICommand'); command.properties.canExecute = false;
  await page.getByLabel('导入设计文件').setInputFiles({ name: 'command.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...starterDocument(), nodes: [command] })) });
  await page.getByRole('button', { name: '预览页面', exact: true }).click();
  await expect(page.locator('.sdk-surface').getByRole('button', { name: 'UICommand', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '返回设计', exact: true }).click();
  await page.getByRole('combobox', { name: '搜索组件', exact: true }).fill('Expander');
  await page.getByRole('treeitem', { name: 'Expander', exact: true }).click();
  const header = page.getByRole('textbox', { name: 'header', exact: true });
  await header.fill('Updated header'); await header.press('Tab');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('winui-designer.document.v1')!).nodes.at(-1)?.properties.header)).toBe('Updated header');
  expect(errors).toEqual([]);
});
