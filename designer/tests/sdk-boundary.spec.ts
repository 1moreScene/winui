import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
test('设计器只使用公共 SDK；可见控件全部来自 WinUI', async ({ page }) => {
  const chrome = readFileSync(resolve(root, 'src', 'Controls.tsx'), 'utf8');
  expect(chrome).not.toMatch(/\b(?:fontSize|fontWeight|foreground|padding|cornerRadius|minWidth|minHeight)=/);
  const icons = readFileSync(resolve(root, 'src', 'Icon.tsx'), 'utf8');
  expect(icons).toContain('SymbolIcon'); expect(icons).toContain('FontIcon');
  expect(icons).not.toMatch(/\b(?:Path|PathIcon|ImageStretch)\b|\bstroke(?:Thickness)?=/);
  for (const file of readdirSync(resolve(root, 'src')).filter(name => name.endsWith('.tsx'))) {
    const text = readFileSync(resolve(root, 'src', file), 'utf8');
    expect(text, `${file} must not create HTML controls`).not.toMatch(/<(?:button|select|option|textarea|dialog|svg)\b/);
    const inputs = [...text.matchAll(/<input\b[^>]*>/g)].map(match => match[0]);
    for (const input of inputs) { expect(input).toContain('type="file"'); expect(input).toMatch(/\bhidden\b/); }
    for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      expect(match[1]).not.toMatch(/gallery|packages\/winui-wasm|winui-wasm\/dist/);
      if (match[1].startsWith('winui-wasm')) expect(['winui-wasm', 'winui-wasm/react']).toContain(match[1]);
    }
  }
  await page.goto('/');
  await expect(page.getByRole('button', { name: '导出设计', exact: true })).toBeVisible();
  expect(await page.locator('select,dialog,svg').count()).toBe(0);
  const native = await page.locator('.designer-app button,input,textarea').evaluateAll(elements => elements.filter(element => {
    if (element instanceof HTMLInputElement && element.type === 'file' && element.hidden) return false;
    return !element.matches('[data-control-id],[data-navigation-part],.winui-editor,.winui-editor-helper');
  }).map(element => element.outerHTML.slice(0, 200)));
  expect(native).toEqual([]);
  await expect.poll(() => page.locator('[data-designer-ui] canvas').count()).toBeGreaterThan(40);
  await page.getByRole('combobox', { name: '控件主题', exact: true }).click();
  await expect(page.getByRole('option', { name: '深色', exact: true })).toBeVisible();
  await page.getByRole('option', { name: '深色', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('winui-designer.document.v1')!).theme)).toBe('Dark');
});

test('导出的九类组件均可通过独立 TypeScript 检查', async ({ page }) => {
  await page.goto('/');
  for (const name of ['TextBlock', 'Button', 'TextBox', 'CheckBox', 'ToggleSwitch', 'Slider', 'ProgressBar', 'Border', 'Rectangle']) {
    await page.getByRole('combobox', { name: '搜索组件', exact: true }).fill(name);
    await page.getByRole('treeitem', { name, exact: true }).click();
  }
  await page.getByRole('button', { name: '导出设计', exact: true }).click();
  const source = await page.getByRole('textbox', { name: '导出内容', exact: true }).inputValue();
  const file = resolve(root, 'tests', '.export-validation.tsx');
  try {
    writeFileSync(file, source);
    const result = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--noEmit', '--skipLibCheck', '--strict', '--jsx', 'react-jsx', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'Bundler', file], { cwd: root, encoding: 'utf8' });
    expect(result.stdout + result.stderr).toBe(''); expect(result.status).toBe(0);
  } finally { unlinkSync(file); }
});
