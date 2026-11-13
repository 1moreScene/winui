import { test, expect, type Page } from '@playwright/test';
import type { DesignDocument } from '../src/model';

const document = (page: Page): Promise<DesignDocument> => page.evaluate(() => JSON.parse(localStorage.getItem('winui-designer.document.v1')!));
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('treeitem', { name: 'Button', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('.sdk-surface canvas').count()).toBeGreaterThan(0);
}
async function add(page: Page, kind: string) {
  const search = page.getByRole('combobox', { name: '搜索组件', exact: true });
  await search.fill(kind);
  await page.getByRole('treeitem', { name: kind, exact: true }).click();
  await search.fill('');
}
async function field(page: Page, label: string, value: string) {
  await page.getByRole('textbox', { name: label, exact: true }).fill(value);
  await page.getByRole('textbox', { name: label, exact: true }).press('Tab');
}

test('独立页面加载真实 SDK，布局保持三栏', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  const regions = await Promise.all(['组件工具栏', '页面设计画布', '属性面板'].map(name => page.getByRole(name === '页面设计画布' ? 'main' : 'complementary', { name }).boundingBox()));
  expect(regions.every(Boolean)).toBeTruthy();
  expect(regions[0]!.x + regions[0]!.width).toBeLessThanOrEqual(regions[1]!.x);
  expect(regions[1]!.x + regions[1]!.width).toBeLessThanOrEqual(regions[2]!.x);
  expect((await document(page)).nodes).toHaveLength(12);
  await expect(page.getByRole('button', { name: '撤销 Ctrl+Z', exact: true })).toBeDisabled();
  await page.screenshot({ path: '../out/designer-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('新增、编辑、撤销重做和重载保存', async ({ page }) => {
  await ready(page);
  await add(page, 'Button');
  await field(page, '文本', '保存设计');
  await expect.poll(async () => (await document(page)).nodes.at(-1)?.text).toBe('保存设计');
  await page.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click();
  await expect.poll(async () => (await document(page)).nodes.at(-1)?.text).toBe('Button');
  await page.getByRole('button', { name: '重做 Ctrl+Shift+Z', exact: true }).click();
  await expect.poll(async () => (await document(page)).nodes.at(-1)?.text).toBe('保存设计');
  await page.reload();
  await expect(page.getByRole('treeitem', { name: 'Button', exact: true })).toBeVisible();
  expect((await document(page)).nodes.at(-1)?.text).toBe('保存设计');
});

test('面板和样式使用基础 Segmented，吸附保持独立开关', async ({ page }) => {
  await ready(page);
  const panels = page.locator('.panel-tabs');
  const components = panels.getByRole('option', { name: '组件', exact: true });
  const layers = panels.getByRole('option', { name: /^图层/ });
  await expect(panels.locator('[data-designer-ui="Segmented"]')).toHaveCount(1);
  await expect(panels.locator('[data-designer-ui="ToggleButton"]')).toHaveCount(0);
  await expect(components).toHaveAttribute('aria-selected', 'true');
  await components.click();
  await expect(components).toHaveAttribute('aria-selected', 'true');
  await layers.click();
  await expect(layers).toHaveAttribute('aria-selected', 'true');
  await expect(components).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('.layers-list')).toBeVisible();
  await layers.focus(); await page.keyboard.press('ArrowLeft');
  await expect(components).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('combobox', { name: '搜索组件' })).toBeVisible();

  const snapping = page.getByRole('button', { name: '8 像素网格吸附', exact: true });
  await expect(snapping).toHaveAttribute('aria-pressed', 'true');
  await snapping.click(); await expect(snapping).toHaveAttribute('aria-pressed', 'false');
  await snapping.click(); await expect(snapping).toHaveAttribute('aria-pressed', 'true');

  await add(page, 'Button');
  const styles = page.getByRole('listbox', { name: '按钮样式', exact: true });
  await styles.getByRole('option', { name: 'Accent', exact: true }).click();
  await expect.poll(async () => (await document(page)).nodes.at(-1)?.variant).toBe('Accent');
  await expect(styles.getByRole('option', { name: 'Standard', exact: true })).toHaveAttribute('aria-selected', 'false');
  const before = (await document(page)).nodes.at(-1)!;
  await styles.getByRole('option', { name: 'Accent', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await document(page)).nodes.at(-1)?.variant).toBe('Standard');
  expect((await document(page)).nodes.at(-1)?.x).toBe(before.x);
  await page.screenshot({ path: '../out/designer-segmented.png', fullPage: true });
});

test('拖动与调整尺寸按画布坐标提交，每次手势只产生一次撤销', async ({ page }) => {
  await ready(page);
  await add(page, 'Button');
  const node = (await document(page)).nodes.at(-1)!;
  const hit = page.getByRole('group', { name: `选择 ${node.name}`, exact: true });
  const box = (await hit.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 15);
  await page.mouse.down(); await page.mouse.move(box.x + 80, box.y + 63, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await document(page)).nodes.at(-1)).toMatchObject({ x: node.x + 80, y: node.y + 64 });
  await page.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click();
  await expect.poll(async () => (await document(page)).nodes.at(-1)).toMatchObject({ x: node.x, y: node.y });
  const handle = await page.getByRole('group', { name: '调整所选控件尺寸' }).boundingBox();
  await page.mouse.move(handle!.x + 3, handle!.y + 3); await page.mouse.down();
  await page.mouse.move(handle!.x + 63, handle!.y + 42, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => (await document(page)).nodes.at(-1)).toMatchObject({ width: node.width + 80, height: 88 });
});

test('图层可锁定、隐藏、复制和删除', async ({ page }) => {
  await ready(page);
  await add(page, 'Button');
  await page.getByRole('listbox', { name: '工具面板', exact: true }).getByRole('option', { name: /^图层/ }).click();
  await page.getByRole('button', { name: '锁定 Button', exact: true }).click();
  expect((await document(page)).nodes.at(-1)?.locked).toBe(true);
  await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '隐藏 Button', exact: true }).click();
  await expect.poll(async () => (await document(page)).nodes.at(-1)?.hidden).toBe(true);
  await page.getByRole('button', { name: '复制图层 Ctrl+D', exact: true }).click();
  expect((await document(page)).nodes.at(-1)?.name).toBe('Button Copy');
  await page.getByRole('button', { name: '删除图层', exact: true }).click();
  expect((await document(page)).nodes).toHaveLength(13);
});

test('预览使用真实控件输入，返回设计不改动设计稿', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  const before = await document(page);
  await page.getByRole('button', { name: '预览页面', exact: true }).click();
  await expect(page.getByTestId('design-overlay')).toHaveCount(0);
  await expect(page.getByText('正在预览', { exact: true })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: 'Button', exact: true })).toBeDisabled();
  // Click the Rust-owned TextBox at its design coordinates and type through its browser host.
  const artboard = (await page.getByTestId('artboard').boundingBox())!;
  await page.mouse.click(artboard.x + 250 * .75, artboard.y + 274 * .75);
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('Preview input');
  await expect(page.locator('.sdk-surface .winui-editor')).toHaveValue('Preview input');
  expect(await document(page)).toEqual(before);
  await page.getByRole('button', { name: '返回设计', exact: true }).click();
  await expect(page.getByTestId('design-overlay')).toBeVisible();
  expect(errors).toEqual([]);
});

test('导出 React 与 JSON，损坏导入不会覆盖设计稿', async ({ page }) => {
  await ready(page);
  const before = await document(page);
  await page.getByRole('button', { name: '导出设计', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '导出内容' })).toBeVisible();
  const code = await page.getByRole('textbox', { name: '导出内容' }).inputValue();
  expect(code).toContain("from 'winui-wasm/react'"); expect(code).toContain('ButtonVariant.Accent');
  expect(code).toContain('canvasLeft={48}');
  await page.getByRole('combobox', { name: '导出格式' }).click();
  await page.getByRole('option', { name: '设计文件 / JSON', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '导出内容' })).toHaveValue(JSON.stringify(before, null, 2));
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: '下载文件', exact: true }).click();
  expect((await pending).suggestedFilename()).toBe('工作空间设置.json');
  await page.getByRole('button', { name: '关闭导出', exact: true }).click();
  await page.getByLabel('导入设计文件').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":2}') });
  await expect(page.getByRole('status', { name: /导入失败/ })).toBeVisible(); expect(await document(page)).toEqual(before);
  const imported = { ...before, name: '导入的页面', nodes: [] };
  await page.getByLabel('导入设计文件').setInputFiles({ name: 'page.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  expect(await document(page)).toEqual(imported);
  await page.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click(); expect(await document(page)).toEqual(before);
});

test('工具栏拖放、搜索和缩放', async ({ page }) => {
  await ready(page);
  await page.getByRole('combobox', { name: '搜索组件' }).fill('Button');
  await expect(page.getByRole('treeitem', { name: 'Button', exact: true })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: 'TextBlock', exact: true })).toHaveCount(0);
  const artboard = await page.getByTestId('artboard').boundingBox();
  await page.getByRole('treeitem', { name: 'Button', exact: true }).dragTo(page.getByTestId('design-overlay'), { targetPosition: { x: 300 * .75, y: 450 * .75 } });
  const node = (await document(page)).nodes.at(-1)!;
  expect(node.kind).toBe('Button'); expect(node.x).toBe(304); expect(node.y).toBe(448);
  await page.getByRole('combobox', { name: '画布缩放' }).click();
  await page.getByRole('option', { name: '100%', exact: true }).click();
  expect((await page.getByTestId('artboard').boundingBox())!.width).toBeCloseTo(artboard!.width / .75, 0);
  await page.getByRole('button', { name: '适应画布', exact: true }).click();
  expect((await page.getByTestId('artboard').boundingBox())!.width).toBeLessThan(800);
});

test('新建空白页面可撤销，较小窗口可继续操作', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: '新建空白页面', exact: true }).click();
  expect((await document(page)).nodes).toHaveLength(0);
  await expect(page.getByText('从一个组件开始 · 点击左侧组件，或拖放到这里')).toBeVisible();
  await page.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click();
  await expect.poll(async () => (await document(page)).nodes.length).toBe(12);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole('button', { name: '适应画布', exact: true }).click();
  await expect(page.getByRole('complementary', { name: '属性面板' })).toBeVisible();
  expect(await page.evaluate(() => window.document.documentElement.scrollWidth)).toBe(1024);
  await page.screenshot({ path: '../out/designer-compact.png', fullPage: true });
});

test('调整图层顺序同时改变 Rust Canvas 的真实绘制顺序', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: '新建空白页面', exact: true }).click();
  await add(page, 'Rectangle');
  await field(page, '填充颜色色值', '#00ff00');
  await add(page, 'Rectangle');
  await field(page, '填充颜色色值', '#ff0000');
  await expect.poll(async () => (await document(page)).nodes.at(-1)?.background).toBe('#ff0000');
  const pixel = () => page.locator('.sdk-surface canvas').first().evaluate(canvas => {
    const c = canvas as HTMLCanvasElement, context = c.getContext('2d')!;
    return [...context.getImageData(Math.round(100 * c.width / 800), Math.round(100 * c.height / 640), 1, 1).data].slice(0, 3);
  });
  await expect.poll(pixel).toEqual([255, 0, 0]);
  await page.getByRole('button', { name: '下移一层', exact: true }).click();
  await expect.poll(pixel).toEqual([0, 255, 0]);
  await page.getByRole('button', { name: '撤销 Ctrl+Z', exact: true }).click();
  await expect.poll(pixel).toEqual([255, 0, 0]);
});

test('属性颜色选择器是真实 SDK 弹层，并保持输入焦点约定', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: '画布背景选色', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Hex', exact: true })).toBeVisible();
  await page.screenshot({ path: '../out/designer-color-picker.png', fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: '页面名称', exact: true }).focus();
  expect(await page.getByRole('textbox', { name: '页面名称', exact: true }).evaluate(element => getComputedStyle(element).outlineStyle)).toBe('none');
});

for (const scale of [1, 1.25]) test(`导出对话框在窄窗口、动态缩放和 ${scale} DPR 下保持控件边界`, async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: scale, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  try {
    await ready(page);
    await page.getByRole('button', { name: '导出设计', exact: true }).click();
    const editor = page.getByRole('textbox', { name: '导出内容', exact: true });
    await expect(editor).toBeVisible();
    const source = await editor.inputValue();
    for (const width of [1440, 690, 390, 1024]) {
      await page.setViewportSize({ width, height: 850 });
      for (const control of [editor, page.getByRole('combobox', { name: '导出格式', exact: true }),
        page.getByRole('button', { name: '下载文件', exact: true }), page.getByRole('button', { name: '复制', exact: true }), page.getByRole('button', { name: '关闭导出', exact: true })]) {
        await expect.poll(async () => {
          const box = await control.boundingBox();
          return !!box && box.x >= 0 && box.x + box.width <= width + 1 / scale;
        }).toBe(true);
      }
      expect(await editor.inputValue()).toBe(source);
      if (width === 690) await page.screenshot({ path: `../out/designer-export-${scale}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: '关闭导出', exact: true }).click();
  } finally { await context.close(); }
});
