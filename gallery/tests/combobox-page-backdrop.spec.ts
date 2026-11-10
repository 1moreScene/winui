import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

test.use({ deviceScaleFactor: 1.25 });

for (const backend of ['Canvas2D', 'WebGL2'] as const) {
  for (const theme of ['Light', 'Dark'] as const) {
    test(`${backend} ${theme} ComboBox blurs actual DOM outside its Scene`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('/#combo-box');
      await page.evaluate(async ({backend, theme}) => {
        const a = await import('/@id/winui-wasm' as string);
        const sdk = await a.WinUI.create({globalScrollbars:false});
        const host = document.createElement('div');
        host.id = 'page-backdrop-fixture';
        host.style.cssText = 'position:fixed;left:20px;top:20px;width:500px;height:360px;z-index:99999';
        const content = document.createElement('div');
        content.id = 'real-background';
        content.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to right,#ff2020 50%,#2020ff 50%);font:32px Segoe UI;color:black';
        const text = document.createElement('span');
        text.style.cssText='position:absolute;left:100px;top:130px;white-space:nowrap';
        text.textContent = 'Real text behind popup';
        content.append(text);
        host.append(content); document.body.append(host);
        const scene = sdk.scene(host,{backend:a.RendererBackend[backend],theme:a.ThemeMode[theme],reducedMotion:true,reducedTransparency:false});
        const combo = scene.root.canvas().comboBox({width:300,canvasLeft:100,canvasTop:80,items:['Alpha','Beta','Gamma','Delta'],selectedIndex:0});
        combo.open();
        (window as any).pageBackdropFixture = {sdk,scene,combo,host};
      }, {backend,theme});
      const sceneElement = page.locator('#page-backdrop-fixture [data-winui-page-backdrop]');
      await expect(sceneElement).toHaveAttribute('data-winui-page-backdrop','ready');
      const profile = async () => {
        const clip = await page.evaluate(() => {
          const {scene,combo,host} = (window as any).pageBackdropFixture;
          const p = scene.snapshot.nodes.find((n:any) => n.id===combo.snapshot.composed.parts.Popup).rect;
          const h=host.getBoundingClientRect();
          return {x:h.x+p.x+30,y:h.y+p.y+p.height-18,width:p.width-60,height:1};
        });
        const png=PNG.sync.read(await page.screenshot({clip}));
        return Array.from({length:png.width},(_,x)=>[...png.data.slice(x*4,x*4+3)]);
      };
      let colors: number[][] = [];
      await expect.poll(async()=>{
        colors=await profile();
        const l=colors[20],r=colors[colors.length-21];
        return Math.max(...l.map((v,i)=>Math.abs(v-r[i])));
      }).toBeGreaterThan(8);
      // A sharp DOM edge must become a gradual color transition, not a copy.
      const channel=colors.map(c=>c[0]-c[2]);
      const lo=Math.min(...channel),hi=Math.max(...channel);
      expect(channel.filter(v=>v>lo+(hi-lo)*.25&&v<lo+(hi-lo)*.75).length).toBeGreaterThan(8);
      await page.screenshot({path:`../out/combobox-dom-acrylic-${backend}-${theme}.png`});
      const before=colors[colors.length-21];
      await page.locator('#real-background').evaluate(e=>{e.style.background='linear-gradient(to right,#ff2020 50%,#20ff20 50%)';});
      await expect.poll(async()=>{
        const c=(await profile()).at(-21)!;
        return Math.max(...c.map((v,i)=>Math.abs(v-before[i])));
      }).toBeGreaterThan(8);
      await page.evaluate(()=>{const f=(window as any).pageBackdropFixture;f.combo.close();});
      await expect(page.locator('#page-backdrop-fixture [data-winui-page-backdrop]')).toHaveCount(0);
      expect(errors).toEqual([]);
      await page.evaluate(()=>{const f=(window as any).pageBackdropFixture;f.scene.dispose();f.sdk.dispose();f.host.remove();});
    });
  }
}
