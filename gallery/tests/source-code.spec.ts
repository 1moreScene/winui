import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { presentSource } from '../src/source-presentation';
import { openSource } from './gallery-control-helper';

function plain(tokens: import('prismjs').TokenStream): string {
  return typeof tokens === 'string' ? tokens : Array.isArray(tokens)
    ? tokens.map(plain).join('') : plain(tokens.content);
}

test('formatting supports sibling JSX, preserves literal text and safely falls back for excerpts', async () => {
  const jsx = '<Button text="<script>中文 & text</script>"/><TextBlock text="Next"/>';
  const result = await presentSource(jsx, 'tsx');
  expect(result.status).toBe('formatted');
  expect(plain(result.tokens)).toBe('<Button text="<script>中文 & text</script>" />\n<TextBlock text="Next" />');
  const xml = await presentSource('<Grid><Button Content="Hello"/><Button Content="Next"/></Grid>', 'xaml');
  expect(xml.status).toBe('formatted');
  expect(plain(xml.tokens)).toContain('\n  <Button');
  const incomplete = '<Grid>\n  <Button Content="incomplete"';
  const fallback = await presentSource(incomplete, 'xaml');
  expect(fallback.status).toBe('original');
  expect(plain(fallback.tokens)).toBe(incomplete);
});

test('compressed running samples are formatted, highlighted and selectable inside the existing Expander', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/#repeat-button');
  const source = page.locator('#repeat-simple .source');
  await expect(source).toBeVisible();
  expect(requests.some(url => /\/(?:standalone|babel|estree)-/.test(url))).toBe(false);
  await openSource(source);
  const code = source.locator('pre');
  await expect(code).toHaveAttribute('data-source-status', 'formatted');
  expect((await code.textContent())!.split('\n').length).toBeGreaterThan(4);
  await expect(code.locator('.token.class-name').first()).toBeVisible();
  await expect(code.locator('.token.attr-name').first()).toBeVisible();
  await code.evaluate(element => { element.style.maxHeight = '64px'; });
  await expect(code).toHaveAttribute('data-winui-scroll-host', '');
  await expect(code).toHaveCSS('user-select', 'text');
  expect(await code.evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    return selection.toString();
  })).toBe(await code.textContent());
  expect(await code.evaluate(element => !!element.closest('[data-winui-content-host]'))).toBe(true);
  await source.getByRole('button', { name: 'Official XAML', exact: true }).click();
  await expect(code).toHaveAttribute('data-source-language', 'xaml');
  await expect(code).toHaveAttribute('data-source-status', 'formatted');
  await expect(code.locator('.token.tag').first()).toBeVisible();
  await source.getByRole('button', { name: 'TypeScript / React', exact: true }).click();
  await expect(code).toHaveAttribute('data-source-language', 'tsx');
  await expect(code).toHaveAttribute('data-source-status', 'formatted');
  await expect(code).toContainText('onClick');
  await source.getByRole('button', { name: 'Source code', exact: true }).click();
  await expect(code).toBeHidden();
  expect(errors).toEqual([]);
});

for (const theme of ['Light', 'Dark', 'HighContrast']) {
  test(`source tokens follow the ${theme} Gallery theme`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('winui-gallery.theme', value), theme);
    await page.goto('/#button');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const source = page.locator('#button-standard .source');
    await openSource(source);
    const code = source.locator('pre').first();
    await expect(code).toHaveAttribute('data-source-status', 'formatted');
    const colors = await code.evaluate(element => {
      const color = (selector: string) => getComputedStyle(element.querySelector(selector)!).color;
      return [color('.token.class-name'), color('.token.attr-name'), color('.token.attr-value')];
    });
    expect(new Set(colors).size).toBe(3);
    mkdirSync('../out/source-code', { recursive: true });
    await source.screenshot({ path: `../out/source-code/${theme}.png` });
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(code.locator('.token.class-name').first()).toHaveCSS('color', await code.evaluate(e => getComputedStyle(e).color));
  });
}

test('official C# excerpts are highlighted with their original formatting', async ({ page }) => {
  await page.goto('/#xaml-comp-interop');
  const source = page.locator('#composition-spring .source');
  await openSource(source);
  await source.getByRole('button', { name: 'Official source', exact: true }).click();
  const code = source.locator('pre');
  await expect(code).toHaveAttribute('data-source-language', 'csharp');
  await expect(code).toHaveAttribute('data-source-status', 'original');
  await expect(code.locator('.token.keyword').first()).toBeVisible();
  await expect(code).toContainText('Compositor');
});
