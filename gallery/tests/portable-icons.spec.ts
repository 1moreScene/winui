import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const coverage=JSON.parse(readFileSync('../third_party/icon-fonts/coverage.json','utf8')).codepoints as string[];

test('all bundled icon glyphs render with local fonts disabled and external network blocked',async({page})=>{
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  await cdp.send('CSS.setLocalFontsEnabled',{enabled:false});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const requested:string[]=[];
  page.on('request',request=>{if(request.url().includes('winui-icons'))requested.push(request.url());});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#icon-element');
  await page.getByRole('button',{name:'Font icon button',exact:true}).waitFor();
  await page.evaluate(async()=>{const {loadIconFonts}=await import('/@id/winui-wasm' as string);await loadIconFonts();});
  await expect.poll(()=>page.evaluate(()=>[...document.fonts].filter(font=>font.status==='loaded'&&font.family.replaceAll('"','')==='WinUI Portable Icons').length)).toBeGreaterThan(0);
  const missing=await page.evaluate(codes=>{
    const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;
    const ctx=canvas.getContext('2d')!;ctx.font='32px "WinUI Portable Icons"';
    return codes.filter(code=>{
      ctx.clearRect(0,0,80,80);ctx.fillText(String.fromCodePoint(parseInt(code,16)),8,50);
      const data=ctx.getImageData(0,0,80,80).data;
      return !data.some((value,index)=>index%4===3&&value>0);
    });
  },coverage.filter(code=>parseInt(code,16)>=0xe000&&parseInt(code,16)<=0xf8ff));
  expect(missing).toEqual([]);
  expect(requested.length).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Font icon button',exact:true}).waitFor();
  await page.screenshot({path:'../out/portable-icons-no-local-fonts.png'});
  expect(errors).toEqual([]);
});
