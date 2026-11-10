import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openSource, selectGalleryOption } from './gallery-control-helper';
const official: typeof import('../src/official-layout-gallery.json') = JSON.parse(readFileSync(new URL('../src/official-layout-gallery.json', import.meta.url), 'utf8'));

for (const backend of ['Canvas2D', 'WebGL2']) {
  test(`${backend} Expander uses both pinned runtime samples and native Up anchoring`, async ({ page }) => {
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/#expander');
    await expect(page.locator('section.example > h2')).toHaveText(official.controls.Expander.samples.map(sample=>sample.title));
    await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
    const first=page.getByRole('button',{name:'This text is in the header',exact:true});
    await first.click();await expect(first).toHaveAttribute('aria-expanded','true');
    await selectGalleryOption(page.getByRole('combobox',{name:'ExpandDirection',exact:true}),'Up');
    await expect.poll(()=>page.evaluate(()=>window.fiveScenes['expander-text'].snapshot.nodes.find(n=>n.kind==='Expander')!.props.verticalAlignment)).toBe('Bottom');
    await expect.poll(()=>page.evaluate(()=>{const s=window.fiveScenes['expander-text'].snapshot;const e=s.nodes.find(n=>n.kind==='Expander')!;return Math.abs(e.rect.y+e.rect.height-s.nodes.find(n=>n.id===s.root)!.rect.height)<0.1;})).toBe(true);
    const second=page.getByRole('button',{name:'This text is centered',exact:true});
    await expect(second).toHaveAttribute('aria-expanded','false');await second.click();
    await expect(second).toHaveAttribute('aria-expanded','true');
    await expect.poll(()=>page.evaluate(()=>{const s=window.fiveScenes['expander-alignment'].snapshot;const h=s.nodes.find(n=>n.props.text==='This text is centered')!,b=s.nodes.find(n=>n.props.text==='And this text is left aligned')!,slot=s.nodes.find(n=>n.props.isExpanderHeader)!;return {headerVisible:h.visible,bodyVisible:b.visible,x:b.rect.x,center:Math.abs(h.rect.x+h.rect.width/2-slot.rect.width/2)<=1};})).toEqual({headerVisible:true,bodyVisible:true,x:5,center:true});
    await page.locator('main').screenshot({path:`../out/layout-gallery/expander-${backend}.png`});
    await second.click();await expect.poll(()=>page.evaluate(()=>window.fiveScenes['expander-alignment'].snapshot.nodes.find(n=>n.props.text==='And this text is left aligned')!.visible)).toBe(false);
    await expect.poll(()=>page.evaluate(()=>window.fiveScenes['expander-alignment'].snapshot.nodes.find(n=>n.props.text==='This text is centered')!.visible)).toBe(true);
    await openSource(page.locator('#expander-alignment .source'));
    await page.locator('#expander-alignment .source').getByRole('button',{name:'Official XAML',exact:true}).click();
    await expect(page.locator('#expander-alignment pre')).toContainText('This text is centered');
    await expect(page.locator('#expander-alignment pre')).not.toContainText('ToggleButton');
    expect(errors).toEqual([]);
  });

  test(`${backend} Grid gallery moves the red rectangle and updates independent row/column spacing`, async ({ page }) => {
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/#grid');await expect(page.getByRole('heading',{name:'Grid',exact:true})).toBeVisible();
    await expect(page.locator('section.example > h2')).toHaveText(official.controls.Grid.samples[0].title);
    await selectGalleryOption(page.getByRole('combobox',{name:'Renderer',exact:true}),backend);
    await expect.poll(()=>page.evaluate(()=>window.gridScene?.snapshot.nodes.filter(n=>n.kind==='Rectangle').length)).toBe(4);
    const read=()=>page.evaluate(()=>{const s=window.gridScene!.snapshot,grid=s.nodes.find(n=>n.props.width===240)!,red=s.nodes.find(n=>n.props.accessibleName==='Red block')!;return {width:grid.rect.width,height:grid.rect.height,rowSpacing:grid.props.rowSpacing,columnSpacing:grid.props.columnSpacing,row:red.props.row,column:red.props.column,x:red.rect.x,y:red.rect.y,backend:(s as unknown as {backend:{kind:string}}).backend.kind};});
    await expect.poll(read).toEqual({width:240,height:160,rowSpacing:8,columnSpacing:8,row:0,column:0,x:0,y:0,backend});
    await page.getByRole('slider',{name:'Grid.Column',exact:true}).focus();await page.keyboard.press('End');
    await page.getByRole('slider',{name:'Grid.Row',exact:true}).focus();await page.keyboard.press('End');
    await page.getByRole('slider',{name:'ColumnSpacing',exact:true}).focus();await page.keyboard.press('End');
    await page.getByRole('slider',{name:'RowSpacing',exact:true}).focus();await page.keyboard.press('Home');
    await expect.poll(read).toEqual({width:240,height:160,rowSpacing:0,columnSpacing:16,row:2,column:2,x:132,y:100,backend});
    await openSource(page.locator('#grid-basic .source'));await page.locator('#grid-basic .source').getByRole('button',{name:'Official XAML',exact:true}).click();
    await expect(page.locator('#grid-basic pre')).toContainText('Height="160"');
    await expect(page.locator('#grid-basic pre')).toContainText('ColumnSpacing="16"');
    await expect(page.locator('#grid-basic pre')).toContainText('Grid.Row="2"');
    await page.screenshot({path:`../out/layout-gallery/grid-${backend}.png`,fullPage:true});
    expect(errors).toEqual([]);
  });
}

test('Grid catalog entry routes to its live page',async({page})=>{
  await page.goto('/#all');
  const card=page.locator('a[href="#grid"]').first();
  await expect(card).toBeVisible();await card.click();
  await expect(page.locator('#grid-basic')).toBeVisible();
});
