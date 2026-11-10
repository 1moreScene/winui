import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from '../gallery/node_modules/@playwright/test/index.mjs';
import {root, repository} from './github-pages.mjs';

const repo = repository();
const site = process.argv[2] || `http://127.0.0.1:4174${repo.base}`;
const base = new URL(site), errors = [], failed = [], outsideBase = [], checked = [];
const browser = await chromium.launch({channel: process.env.PW_CHANNEL || 'chrome'});
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {if (response.status() >= 400) failed.push({url: response.url(), status: response.status()});});
page.on('request', request => {
  const url = new URL(request.url());
  if (url.origin === base.origin && !url.pathname.startsWith(base.pathname) && url.pathname !== '/favicon.ico') outsideBase.push(url.href);
});
try {
  for (const route of ['home', 'button', 'icon-element', 'split-button', 'teaching-tip', 'list-view', 'parallax-view', 'annotated-scroll-bar', 'rich-text-block', 'table-view', 'settings']) {
    await page.goto(`${site}#${route}`);
    await page.waitForFunction(() => window.gallery?.frame?.snapshot.animating === false);
    await page.locator('.winui-surface canvas').first().waitFor({state: 'visible'});
    if (route === 'home') {
      await page.locator('.home-brand img').waitFor({state: 'visible'});
      await page.waitForFunction(() => [...document.querySelectorAll('.home-brand img')].some(img => img.complete && img.naturalWidth > 0));
    }
    if (route === 'settings') assert((await page.getByRole('link', {name: 'Third-party licenses and resource sources'}).getAttribute('href')).startsWith(base.pathname));
    const broken = await page.locator('img').evaluateAll(images => images.filter(img => img.getBoundingClientRect().width > 0 && img.complete && img.naturalWidth === 0).map(img => img.src));
    assert.deepEqual(broken, [], `Broken images on ${route}`);
    checked.push(route); console.log(`Verified ${route}`);
  }
  await page.goto(`${site}#flyout`);
  await page.getByRole('button', {name: 'Empty cart', exact: true}).click();
  await page.waitForFunction(() => {
    const overlay = window.overlayScenes?.flyout?.snapshot.nodes.find(node => node.kind === 'Flyout')?.overlay;
    return overlay && overlay.opacity >= .999 && overlay.offset.every(value => Math.abs(value) < .1);
  });
  await page.getByRole('button', {name: 'Confirm empty cart', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm empty cart', exact: true}).waitFor({state: 'hidden'});
  const source = page.locator('#overlay-flyout .source');
  await source.getByRole('button', {name: 'Source code', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('#overlay-flyout pre')?.textContent.includes('closeFlyout'));
  checked.push('flyout interaction and source panel');
  assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(outsideBase, []);
  mkdirSync(resolve(root, 'out/github-pages'), {recursive: true});
  await page.screenshot({path: resolve(root, 'out/github-pages/flyout-source.png')});
  const report = {site, checked, errors, failed, outsideBase, passed: true, verifiedAt: new Date().toISOString()};
  writeFileSync(resolve(root, 'out/github-pages', base.hostname === '127.0.0.1' ? 'local-validation.json' : 'live-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Verified Gallery: ${site}`);
} finally {await browser.close();}
