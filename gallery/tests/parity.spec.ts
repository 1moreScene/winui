import { test,expect } from '@playwright/test';
import { mkdirSync,writeFileSync } from 'node:fs';

test('capture matched native-probe inputs at 1000x500 DIP and DPR 1',async({page})=>{
  await page.setViewportSize({width:1200,height:750});await page.goto('/#navigation-view');
  await expect.poll(()=>page.evaluate(()=>window.gallery?.sdk.liveCount??0)).toBe(8);
  mkdirSync('../out/navigation-browser',{recursive:true});
  const metrics=[];
  const cases:{name:string;theme:string;mode:string;open:boolean;footer:boolean;hierarchy:boolean;width:number;content?:number}[]=[];
  for(const theme of ['Light','Dark'])for(const mode of ['Left','Top','LeftCompact','LeftMinimal']){
    cases.push({name:`${theme}-${mode}`,theme,mode,open:false,footer:false,hierarchy:false,width:1000});
    if(mode==='LeftCompact'||mode==='LeftMinimal')cases.push({name:`${theme}-${mode}-open`,theme,mode,open:true,footer:false,hierarchy:false,width:1000});
  }
  cases.push({name:'Light-footer-top',theme:'Light',mode:'Top',open:false,footer:true,hierarchy:false,width:1000},{name:'Light-top-overflow',theme:'Light',mode:'Top',open:false,footer:false,hierarchy:false,width:360});
  cases.push({name:'Light-hierarchy',theme:'Light',mode:'Left',open:false,footer:false,hierarchy:true,width:1000});
  for(let number=1;number<=7;number++)cases.push({name:`Light-content-${number}`,theme:'Light',mode:'Left',open:false,footer:false,hierarchy:false,width:1000,content:number});
  for(const state of cases){
    await page.evaluate(async state=>{
      const path='/@id/winui-wasm';const api=await import(path)as typeof import('winui-wasm');
      const previous=document.querySelector('#parity-fixture');previous?.remove();
      const outer=document.createElement('div');outer.id='parity-fixture';outer.style.cssText=`position:fixed;left:0;top:0;width:1000px;height:500px;z-index:99999;background:${state.theme==='Light'?'#f3f3f3':'#202020'}`;
      const host=document.createElement('div');host.style.cssText=`width:${state.width}px;height:500px`;outer.append(host);document.body.append(outer);
      const menu=state.footer?['Browse','Track an Order','Order History']:['Menu Item1','Menu Item2','Menu Item3','Menu Item4'];
      const icons=state.footer?['\uE8F1','\uE707','\uE8EC']:['\uE768','\uE74E','\uE72C','\uE896'];
      const options:import('winui-wasm').NavigationViewOptions={items:menu.map((text,index)=>({id:`page${index+1}`,text,icon:icons[index]})),selectedId:'page1',header:'Sample Page 1',content:'This is the content for Sample Page 1.',paneDisplayMode:api.PaneDisplayMode[state.mode as keyof typeof api.PaneDisplayMode],theme:api.ThemeMode[state.theme as keyof typeof api.ThemeMode],isBackButtonVisible:"Visible" as import("winui-wasm").NavigationViewBackButtonVisible,isBackEnabled:false,reducedMotion:true,expandedPaneMaterial:{tintColor:state.theme==='Light'?'#ffffff':'#1f1f1f',tintOpacity:.8,fallbackColor:state.theme==='Light'?'#f2f2f2':'#1f1f1f'}};
      if(state.footer){options.isSettingsVisible=false;options.footerItems=[{id:'account',text:'Account',icon:'\uE77B'},{id:'cart',text:'Your Cart',icon:'\uE719'},{id:'help',text:'Help',icon:'\uE897'}];}
      if(state.hierarchy){options.items=[{id:'page1',text:'Home',icon:'\uE80F'},{id:'page2',text:'Account',icon:'\uE77B',children:[{id:'mail',text:'Mail',icon:'\uE715'},{id:'calendar',text:'Calendar',icon:'\uE787'}]},{id:'documents',text:'Document options',icon:'\uE7C3',selectsOnInvoked:false,children:[{id:'new',text:'Create new',icon:'\uE8F4'},{id:'upload',text:'Upload file',icon:'\uE8E5'}]}];}
      if(state.content){options.contentNode=window.gallery.sdk.template(`gallery/SamplePage${state.content}`);options.header=`Sample Page ${state.content}`;}
      const view=window.gallery.create(host,options);if(state.open)view.update({isPaneOpen:true});if(state.hierarchy)view.setExpanded('page2',true);
      Object.assign(window,{parityView:view});
    },state);
    await page.waitForFunction(()=>{const view=(window as unknown as {parityView:import('winui-wasm').NavigationViewController}).parityView;return view.snapshot.content.width>0&&!view.snapshot.animating;});
    await page.locator('#parity-fixture').screenshot({path:`../out/navigation-browser/${state.name}.png`});
    const snapshot=await page.evaluate(()=>{const view=(window as unknown as {parityView:import('winui-wasm').NavigationViewController}).parityView;return view.snapshot;});
    metrics.push({name:state.name,...snapshot});
    await page.evaluate(()=>{(window as unknown as {parityView:import('winui-wasm').NavigationViewController}).parityView.dispose();document.querySelector('#parity-fixture')?.remove();});
  }
  writeFileSync('../out/navigation-browser/metrics.json',JSON.stringify(metrics,null,2));
});
