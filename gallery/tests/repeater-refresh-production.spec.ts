import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {selectGalleryOption} from './gallery-control-helper';
for(const [route,title]of [['items-repeater','ItemsRepeater'],['stack-layout','StackLayout'],['uniform-grid-layout','UniformGridLayout'],['refresh-container','RefreshContainer'],['refresh-visualizer','RefreshVisualizer']]){
 test(`production ${title} loads, paints and releases its examples`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#'+route);await expect(page.getByRole('heading',{name:['RefreshContainer','RefreshVisualizer'].includes(title)?'PullToRefresh':'ItemsRepeater',exact:true,level:1})).toBeVisible();await expect.poll(()=>page.evaluate(()=>Object.values(window.repeaterScenes??{}).some(s=>s.snapshot.nodes.length>2))).toBe(true);
  if(title==='RefreshContainer')await expect.poll(()=>page.evaluate(()=>window.repeaterScenes.refresh.snapshot.nodes.filter(n=>n.kind==='ListView').length)).toBe(1);
  if(title==='ItemsRepeater')await page.locator('#repeater-animated').getByRole('button',{name:'Blue',exact:true}).click();
  if(title==='RefreshContainer'||title==='RefreshVisualizer'){await page.evaluate(custom=>window.refreshControls[custom?'custom':'basic'].requestRefresh(),title==='RefreshVisualizer');await expect(page.getByRole('option',{name:title==='RefreshVisualizer'?'New Friend 0':'NewControl 0',exact:true})).toBeVisible();}
  if(title==='UniformGridLayout'){const radio=page.locator('#repeater-basic').getByRole('radio',{name:'UniformGridLayout',exact:true});await radio.click();await expect(radio).toBeChecked();await expect.poll(()=>page.evaluate(()=>window.repeaterGalleryViews.basic.snapshot.repeater!.layout)).toBe('UniformGridLayout');}
  mkdirSync('../out/repeater-refresh-presentation',{recursive:true});await page.screenshot({path:`../out/repeater-refresh-presentation/${info.project.name}-${route}.png`,fullPage:true});expect(errors).toEqual([]);
  if(title==='ItemsRepeater'||title==='RefreshContainer')for(const sample of await page.locator('[data-official-sample]').all()){const id=await sample.getAttribute('id');await sample.screenshot({path:`../out/repeater-refresh-presentation/${info.project.name}-${id}.png`});}expect(errors).toEqual([]);
 });
}
