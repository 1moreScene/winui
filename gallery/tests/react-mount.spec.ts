import {test,expect} from '@playwright/test';
import {RendererBackend} from '../src/enums';
for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2])for(const strict of [false,true])test(`${backend} React mounts the complete tree before its first frame; StrictMode=${strict}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/react-mount.html');await page.waitForFunction(()=>typeof window.mountReactScene==='function');
 for(let i=0;i<10;i++){
  const result=await page.evaluate(({backend,strict})=>window.mountReactScene(backend,strict),{backend,strict});
  expect(result.kinds).toEqual(['Grid','Canvas','StackPanel','Button','TextBlock']);
  expect(result.helpers).toBe(1);
  await page.evaluate(()=>window.unmountReactScene());
  await expect(page.locator('.winui-surface')).toHaveCount(0);
  await expect(page.locator('[data-winui-font-metrics]')).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});

for(const backend of [RendererBackend.Canvas2D,RendererBackend.WebGL2])for(const strict of [false,true])test(`${backend} floating target references are bound before the opening frame; StrictMode=${strict}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/tests/react-mount.html');await page.waitForFunction(()=>typeof window.mountReactFloating==='function');
 for(const kind of ['Flyout','MenuFlyout','ToolTip'] as const){
  const {owner,surface}=await page.evaluate(({backend,strict,kind})=>window.mountReactFloating(backend,strict,kind),{backend,strict,kind});
  expect(surface.props.placementTarget).toBe(owner.id);
  expect(surface.overlay!.isOpen).toBe(true);
  expect(Math.abs(surface.rect.x+surface.rect.width/2-owner.world[4]-owner.rect.width/2)).toBeLessThanOrEqual(.8);
  expect(surface.rect.y+surface.rect.height).toBeLessThanOrEqual(owner.world[5]);
  await page.evaluate(()=>window.unmountReactScene());
 }
 expect(errors).toEqual([]);
});
