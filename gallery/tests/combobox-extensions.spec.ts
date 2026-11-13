import { test, expect } from '@playwright/test';
import { selectGalleryOption } from './gallery-control-helper';

for (const backend of ['Canvas2D', 'WebGL2']) {
  test(`${backend} popup presses leave the standard ComboBox arrow unpressed`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#combo-box');
    await selectGalleryOption(page.getByRole('combobox', { name: 'Renderer', exact: true }), backend);
    await expect.poll(() => page.evaluate(() => window.composedScenes?.ComboBox?.snapshot.backend.kind)).toBe(backend);

    const sample = page.locator('#composed-combo');
    const combo = sample.getByRole('combobox');
    await combo.press('F4');
    const list = sample.getByRole('listbox');
    const blue = list.getByRole('option', { name: 'Blue', exact: true });
    const arrowPress = () => page.evaluate(() => {
      const { nodes, captured } = window.composedScenes.ComboBox.snapshot;
      const glyph = nodes.find(node => node.kind === 'ComboBox')!.composed!.parts.DropDownGlyph;
      const state = nodes.find(node => node.id === glyph)?.animatedIcon?.state;
      return { captured, state };
    });

    await list.hover({ position: { x: 2, y: 2 } });
    await page.mouse.down();
    await expect.poll(arrowPress).toEqual({ captured: expect.any(Number), state: 'PointerOver' });
    await page.mouse.up();
    await expect(combo).toHaveAttribute('aria-expanded', 'true');

    await blue.hover();
    await page.mouse.down();
    await expect.poll(arrowPress).toEqual({ captured: expect.any(Number), state: 'PointerOver' });
    await page.mouse.up();
    await expect(combo).toHaveValue('Blue');
  });

  test(`${backend} clearable, multi-select and tree ComboBoxes`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#combo-box');
    await selectGalleryOption(page.getByRole('combobox', { name: 'Renderer', exact: true }), backend);
    await expect.poll(() => page.evaluate(() => window.composedScenes?.ComboBox?.snapshot.backend.kind)).toBe(backend);

    const clearable = page.locator('#combo-clearable');
    const accent = clearable.getByRole('combobox');
    await expect(accent).toHaveValue('Blue');
    const clearButton = clearable.getByRole('button', { name: 'Clear selection' });
    await clearButton.scrollIntoViewIfNeeded();
    await clearButton.click({ trial: true });
    const clearBounds = await clearButton.boundingBox();
    expect(clearBounds?.width).toBeCloseTo(32, 0);
    expect(clearBounds?.height).toBeCloseTo(32, 0);
    await clearButton.click();
    await expect(accent).toHaveValue('');
    await expect(accent).toHaveAttribute('aria-expanded', 'false');
    await expect(accent).toBeFocused();

    const multiple = page.getByRole('combobox', { name: 'Choose multiple colors' });
    await multiple.click();
    const list = page.locator('#combo-multiple [role="listbox"]');
    await expect(list).toHaveAttribute('aria-multiselectable', 'true');
    const blueCheckBox = list.getByRole('checkbox', { name: 'Blue', exact: true });
    await expect(blueCheckBox).toHaveAttribute('aria-checked', 'false');
    await blueCheckBox.click();
    await expect(blueCheckBox).toHaveAttribute('aria-checked', 'true');
    await list.getByRole('option', { name: 'Red' }).click();
    await expect(multiple).toHaveValue('Blue (+1)');
    await expect(multiple).toHaveAttribute('aria-expanded', 'true');
    await list.press('Home');
    await list.press('Space');
    await expect(multiple).toHaveValue('Red');
    await list.press('Escape');
    await expect(multiple).toBeFocused();
    await multiple.press('Delete');
    await expect(multiple).toHaveValue('');

    const folder = page.getByRole('combobox', { name: 'Folder', exact: true });
    await folder.press('ArrowDown');
    const tree = page.locator('#combo-tree [role="tree"]:visible');
    await expect(folder).toHaveAttribute('aria-haspopup', 'tree');
    const documents = tree.getByRole('treeitem', { name: 'Documents' });
    await documents.click({ position: { x: 24, y: 16 } });
    await expect(documents).toHaveAttribute('aria-expanded', 'false');
    await expect(tree.getByRole('treeitem', { name: 'Reports' })).toBeHidden();
    await documents.click({ position: { x: 24, y: 16 } });
    await expect(tree.getByRole('treeitem', { name: 'Reports' })).toBeVisible();
    await tree.getByRole('treeitem', { name: 'Reports' }).click();
    await expect(folder).toHaveValue('Reports');
    await expect(folder).toHaveAttribute('aria-expanded', 'false');

    const folders = page.getByRole('combobox', { name: 'Folders', exact: true });
    await folders.press('ArrowDown');
    await expect(tree).toHaveAttribute('aria-multiselectable', 'true');
    await tree.getByRole('checkbox', { name: 'Reports', exact: true }).click();
    await expect(tree.getByRole('treeitem', { name: 'Documents' })).toHaveAttribute('aria-checked', 'mixed');
    await tree.getByRole('checkbox', { name: 'Notes', exact: true }).click();
    await expect(tree.getByRole('treeitem', { name: 'Documents' })).toHaveAttribute('aria-checked', 'true');
    await tree.press('End');
    await tree.press('ArrowRight');
    await expect(tree.getByRole('treeitem', { name: 'Screenshots' })).toBeVisible();
    await expect(folders).toHaveAttribute('aria-expanded', 'true');
    await tree.press('Escape');
    await expect(folders).toBeFocused();
    await page.locator('#combo-tree').getByRole('button', { name: 'Clear selection' }).last().click();
    await expect(folders).toHaveValue('');
    expect(errors).toEqual([]);
  });
}

test.describe('touch input', () => {
  test.use({ hasTouch: true });

  test('tree expander taps change expansion without selecting the row', async ({ page }) => {
    await page.goto('/#combo-box');
    const folder = page.getByRole('combobox', { name: 'Folder', exact: true });
    await folder.tap();
    const tree = page.locator('#combo-tree [role="tree"]:visible');
    const documents = tree.getByRole('treeitem', { name: 'Documents' });
    await documents.tap({ position: { x: 24, y: 16 } });
    await expect(documents).toHaveAttribute('aria-expanded', 'false');
    await expect(folder).toHaveValue('');
    await documents.tap({ position: { x: 24, y: 16 } });
    await tree.getByRole('treeitem', { name: 'Reports' }).tap();
    await expect(folder).toHaveValue('Reports');
    await expect(folder).toHaveAttribute('aria-expanded', 'false');
  });
});

test('multi-select dropdown retains selection while virtualizing 10,000 rows', async ({ page }) => {
  await page.goto('/#combo-box');
  const combo = page.getByRole('combobox', { name: 'Items', exact: true });
  await combo.click();
  const list = page.locator('#combo-virtualized [role="listbox"]');
  await expect(list.getByRole('option', { name: 'Item 10000', exact: true })).toHaveAttribute('aria-selected', 'true');
  const realization = () => page.evaluate(() => {
    const list = window.composedScenes.ComboBoxVirtualized.snapshot.nodes.find(node => node.kind === 'ListView')!;
    return { total: list.collection!.totalCount, realized: list.collection!.realized.length, offset: list.scroll!.verticalOffset };
  });
  const renderedLabel = (key: string) => page.evaluate(key => {
    const row = window.composedScenes.ComboBoxVirtualized.snapshot.nodes.find(node => node.props.collectionKey === key);
    return row?.text.lines.map(line => line.text).join('');
  }, key);
  const initial = await realization();
  expect(initial.total).toBe(10_000);
  expect(initial.realized).toBeLessThan(30);
  expect(initial.offset).toBeGreaterThan(0);
  await expect.poll(() => renderedLabel('10000')).toBe('Item 10000');
  await list.hover();
  await page.mouse.wheel(0, -1_000_000);
  await expect.poll(async () => (await realization()).offset).toBe(0);
  await expect.poll(() => renderedLabel('1')).toBe('Item 1');
  await list.getByRole('option', { name: 'Item 1', exact: true }).click();
  await expect(combo).toHaveValue('Item 1 (+1)');
  expect((await realization()).realized).toBeLessThan(30);
});
