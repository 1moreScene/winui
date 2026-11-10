import {test, expect} from '@playwright/test';
import {PNG} from 'pngjs';

for (const platform of ['Windows','macOS','Linux']) {
  test(`${platform} selects native or portable outlines without replacing system names`, async ({page}) => {
    await page.addInitScript(platform => {
      Object.defineProperty(navigator,'userAgentData',{configurable:true,value:{platform}});
      Object.defineProperty(navigator,'platform',{configurable:true,value:platform==='Windows'?'Win32':platform==='macOS'?'MacIntel':'Linux x86_64'});
    },platform);
    await page.goto('/#icon-element');
    await page.getByRole('button',{name:'Font icon button',exact:true}).waitFor();
    const result=await page.evaluate(() => {
      const families=[...document.fonts].filter(face=>face.status==='loaded').map(face=>face.family.replaceAll('"',''));
      const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
      const ctx=canvas.getContext('2d')!;
      const raster=(family:string,glyph:string)=>{
        ctx.clearRect(0,0,64,64);ctx.font=`32px "${family}"`;ctx.fillText(glyph,8,40);
        return [...ctx.getImageData(0,0,64,64).data];
      };
      const nativePairs=[['WinUI Native Fluent Icons','Segoe Fluent Icons'],['WinUI Native MDL2 Icons','Segoe MDL2 Assets']].filter(([alias])=>families.includes(alias));
      return {families,mismatches:nativePairs.flatMap(([alias,native])=>['\uE80F','\uE713','\uE8A9','\uE70D','\uE721'].filter(glyph=>{
        const expected=raster(native,glyph);return raster(alias,glyph).some((value,index)=>value!==expected[index]);
      }).map(glyph=>`${alias}/${glyph.codePointAt(0)}`))};
    });
    expect(result.families).toContain('WinUI Portable Icons');
    expect(result.families).not.toContain('Segoe Fluent Icons');
    expect(result.families).not.toContain('Segoe MDL2 Assets');
    if(platform==='Windows'){
      expect(result.families.filter(f=>f.startsWith('WinUI Native ')).length).toBeGreaterThan(0);
      expect(result.mismatches).toEqual([]);
    }else{
      expect(result.families.filter(f=>f.startsWith('WinUI Native '))).toEqual([]);
    }
    for(const backend of ['Canvas2D','WebGL2'] as const){
      const expected=await page.evaluate(async ({platform,backend})=>{
        const a=await import('/@id/winui-wasm' as string) as typeof import('winui-wasm');
        const host=document.createElement('div');host.id='font-policy-fixture';host.style.cssText='position:fixed;left:0;top:0;width:64px;height:64px;z-index:2147483640';document.body.append(host);
        const sdk=await a.WinUI.create({globalScrollbars:false});
        const scene=sdk.scene(host,{backend:a.RendererBackend[backend],reducedMotion:true,theme:a.ThemeMode.Light,root:{background:'#ffffff'}});
        const icon=scene.root.canvas().fontIcon({glyph:'\uE80F',fontSize:32,width:64,height:64,foreground:'#000000'});
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const node=icon.snapshot;
        const native=[...document.fonts].some(face=>face.family.replaceAll('"','')==='WinUI Native Fluent Icons')?'Segoe Fluent Icons':'Segoe MDL2 Assets';
        const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
        const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,64,64);ctx.fillStyle='black';
        ctx.font=`400 32px "${platform==='Windows'?native:'WinUI Portable Icons'}"`;
        ctx.fillText('\uE80F',Math.round((64-node.text.width)/2),Math.round((64-node.text.height)/2)+node.text.lines[0].baseline);
        Object.assign(window,{fontPolicyFixture:{sdk,host}});
        return {pixels:[...ctx.getImageData(0,0,64,64).data],metrics:{width:node.text.width,height:node.text.height}};
      },{platform,backend});
      const actual=PNG.sync.read(await page.locator('#font-policy-fixture').screenshot());
      expect([actual.width,actual.height]).toEqual([64,64]);
      const error=actual.data.reduce((sum,value,index)=>sum+Math.abs(value-expected.pixels[index]),0)/actual.data.length;
      expect(error,`${platform}/${backend} actual SDK glyph differs from selected font`).toBeLessThan(0.5);
      await page.evaluate(()=>{const fixture=(window as unknown as {fontPolicyFixture:{sdk:{dispose():void};host:HTMLElement}}).fontPolicyFixture;fixture.sdk.dispose();fixture.host.remove();});
    }
  });
}
