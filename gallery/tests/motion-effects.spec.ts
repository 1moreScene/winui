import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test,expect} from '@playwright/test';
import nativeLayout from '../../references/validation/motion-native-layout.json' with {type:'json'};

const evidenceRoot=fileURLToPath(new URL('../../out/',import.meta.url));
let testedWasm='';
const wasmHash=()=>createHash('sha256').update(readFileSync(join(process.env.WINUI_MOTION_WASM??'src/wasm','winui_bg.wasm'))).digest('hex');
test.beforeAll(()=>{testedWasm=wasmHash();});
test.afterAll(()=>{const current=wasmHash();expect(current,'WASM changed during the browser run').toBe(testedWasm);writeFileSync(join(evidenceRoot,'motion-tested-wasm.json'),JSON.stringify({sha256:testedWasm,matchesCurrentBinary:current===testedWasm},null,2));});
for(const backend of ['Canvas2D','WebGL2'] as const){
  for(const [route,count] of [['theme-transitions',5],['connected-animation',4],['xaml-comp-interop',5]] as const){
    test(`${backend}: ${route} samples, public source and real interaction`,async({page})=>{
      const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('/?motionDiagnostics#'+route);await expect(page.locator('.basic-example')).toHaveCount(count);
      if(backend==='WebGL2'){
        await page.getByRole('combobox',{name:'Renderer',exact:true}).click();await page.getByRole('option',{name:'WebGL2',exact:true}).click();
      }
      await expect.poll(()=>page.evaluate(()=>Object.values(window.motionScenes??{}).filter(scene=>!scene.isDisposed).length)).toBe(count);
      if(route==='theme-transitions'){
        await page.locator('#theme-entrance').getByRole('button',{name:'Add five',exact:true}).click();
        await expect.poll(()=>page.evaluate(()=>window.motionScenes.entrance.snapshot.nodes.filter(n=>n.kind==='Rectangle').length)).toBe(10);
        await page.locator('#theme-reposition').getByRole('button',{name:'Reposition',exact:true}).click();
        await expect.poll(()=>page.evaluate(()=>window.motionScenes.reposition.snapshot.nodes.filter(n=>n.kind==='Rectangle'&&n.visible).length)).toBe(2);
        await page.locator('#theme-content').getByRole('button',{name:'Refresh data',exact:true}).click();
        await expect(page.locator('#theme-content').getByText('Updated content 0',{exact:true})).toBeAttached();
        await page.locator('#theme-add-delete').getByRole('button',{name:'Delete',exact:true}).click();
        await expect.poll(()=>page.evaluate(()=>window.motionScenes['add-delete'].snapshot.nodes.filter(n=>n.kind==='TextBlock').length)).toBe(9);
        await page.locator('#theme-popup').getByRole('button',{name:'Show Popup',exact:true}).click();
        await page.locator('#theme-popup').getByRole('button',{name:'Close Popup',exact:true}).click();
      }else if(route==='connected-animation'){
        const list=page.locator('#connected-animation-0');
        await expect(list.getByRole('listbox')).toHaveCount(1);
        await list.getByRole('option',{name:'Item 2',exact:true}).click();
        await expect(list.getByRole('button',{name:'Go Back',exact:true})).toBeVisible();
        await list.getByRole('button',{name:'Go Back',exact:true}).click();
        await expect(list.getByRole('option',{name:'Item 2',exact:true})).toBeVisible();
        const cards=page.locator('#connected-animation-1');
        for(let attempt=0;attempt<2;attempt++){
          await cards.getByRole('option',{name:'Item 3',exact:true}).click();
          await expect(cards.getByRole('button',{name:'Close',exact:true})).toBeVisible();
          await cards.getByRole('button',{name:'Close',exact:true}).click();
          await expect.poll(()=>page.evaluate(()=>window.motionScenes['connected-1'].snapshot.nodes.find(n=>n.kind==='GridView')?.props.isHitTestVisible)).toBe(true);
        }
        const config=page.locator('#connected-animation-2');
        await expect(config.getByRole('radio')).toHaveCount(4);
        const layout=await page.evaluate(()=>{const nodes=window.motionScenes['connected-2'].snapshot.nodes;return {accent:nodes.find(n=>n.props.minWidth===250)!.rect,grays:nodes.filter(n=>['#a9a9a9','#d3d3d3'].includes(String(n.props.background))).map(n=>n.rect)};});
        expect(layout.accent.width).toBeCloseTo(250,0);expect(layout.grays).toHaveLength(4);expect(layout.grays.every(r=>r.width>100)).toBe(true);
        for(const name of ['Default','Gravity','Direct','Basic']){
          const radio=config.getByRole('radio',{name,exact:true});await radio.click();await expect(radio).toBeChecked();
          await config.getByRole('button',{name:'Navigate',exact:true}).click();
          await expect.poll(()=>page.evaluate(()=>window.motionScenes['connected-2'].snapshot.nodes.some(n=>n.props.width===150&&n.props.height===200))).toBe(true);
          await config.getByRole('button',{name:'Navigate',exact:true}).click();
          await expect.poll(()=>page.evaluate(()=>window.motionScenes['connected-2'].snapshot.nodes.filter(n=>['#a9a9a9','#d3d3d3'].includes(String(n.props.background))).length)).toBe(4);
        }
        const repeater=page.locator('#connected-animation-3');
        await repeater.getByRole('button',{name:'Item 1',exact:true}).focus();
        await page.keyboard.press('ArrowRight');
        await expect(repeater.getByRole('button',{name:'Item 2',exact:true})).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(repeater.getByRole('button',{name:'Go Back',exact:true})).toBeVisible();
        await repeater.getByRole('button',{name:'Go Back',exact:true}).click();
        await expect(repeater.getByRole('button',{name:'Item 2',exact:true})).toBeFocused();
      }else{
        await expect(page.locator('#composition-spring').getByRole('radio')).toHaveCount(4);
        const button=page.locator('#composition-spring').getByRole('button',{name:'Item',exact:true});
        await button.hover();await expect.poll(()=>page.evaluate(()=>window.motionScenes.spring.snapshot.nodes.find(n=>n.kind==='Button')?.presentation.scaleX??1)).toBeGreaterThan(1.2);
        const inverse=page.locator('#composition-inverse');await inverse.scrollIntoViewIfNeeded();
        const location=await page.evaluate(()=>{const s=window.motionScenes.inverse;const n=s.snapshot.nodes.find(n=>n.kind==='Rectangle')!;return {x:n.world[4]+15,y:n.world[5]+15};});
        const canvas=await inverse.locator('canvas').first().boundingBox();await page.mouse.move(canvas!.x+location.x,canvas!.y+location.y);
        await expect.poll(()=>page.evaluate(()=>window.motionScenes.inverse.snapshot.nodes.find(n=>n.kind==='Ellipse')?.presentation.scaleX??1)).toBeLessThan(0.9);
        await expect.poll(()=>page.evaluate(()=>window.motionScenes.offset.snapshot.nodes.some(n=>n.kind==='Popup'&&n.overlay?.isOpen))).toBe(true);
        const popup=await page.evaluate(()=>{const s=window.motionScenes.offset.snapshot;return {bounds:s.floatingSurface?.bounds,world:s.nodes.find(n=>n.kind==='Popup')!.world};});
        expect(popup.bounds!.x).toBeGreaterThanOrEqual(300);expect(popup.bounds!.x).toBeCloseTo(popup.world[4],0);
      }
      await page.mouse.move(0,0);
      let sampleIndex=0;
      for(const sample of await page.locator('.basic-example').all()){
        await sample.locator('.basic-preview').scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(requestAnimationFrame));
        await sample.locator('.basic-preview').screenshot({path:join(evidenceRoot,'motion',`${route}-${backend}-${sampleIndex++}.png`)});
        await sample.getByRole('button',{name:'Source code',exact:true}).click();expect(await sample.locator('pre').textContent()).not.toContain('Sample source marker not found');
      }
      await page.screenshot({path:join(evidenceRoot,'motion',`${route}-${backend}.png`),fullPage:true});
      expect(errors).toEqual([]);
    });
  }
}

test('implicit background and local theme examples use the Rust scene',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#transitions');await expect(page.locator('.example')).toHaveCount(6);
  for(const [property,value] of [['Opacity','1'],['Rotation','180'],['Scale','2'],['Translation','100']] as const){
    await page.getByLabel(`${property} target`,{exact:true}).fill(value);await page.getByLabel(`${property} target`,{exact:true}).press('Enter');
  }
  await expect.poll(()=>page.evaluate(()=>window.propertyScenes.slice(0,4).map(scene=>{const p=scene.snapshot.nodes.find(n=>n.props.width===50)!.presentation;return[p.opacity,p.rotation,p.scaleX,p.translationX];}))).toEqual([[1,0,1,0],[1,180,1,0],[1,0,2,0],[1,0,1,100]]);
  await page.locator('#property-transition-4').getByRole('button',{name:'Change color',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.propertyScenes[4].snapshot.nodes.some(n=>n.props.background==='#ffff00'))).toBe(true);
  await page.locator('#property-transition-5').getByRole('button',{name:'Change local theme',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.propertyScenes[5].snapshot.nodes.some(n=>n.props.theme==='Dark'))).toBe(true);
  expect(errors).toEqual([]);
});

test('public SDK springs, expression binding, cancellation and disposal run without Gallery logic',async({page})=>{
  await page.goto('/#theme-transitions');
  const result=await page.evaluate(async()=>{
    const path='/@id/winui-wasm';const api=await import(path) as typeof import('winui-wasm');let time=0;
    const sdk=await api.WinUI.create({clock:()=>time});const host=document.createElement('div');host.style.cssText='width:600px;height:300px';document.body.append(host);
    const scene=sdk.scene(host),a=scene.root.grid({width:50,height:50}),b=scene.root.grid({width:50,height:50});
    b.bindExpressions({[api.AnimatedProperty.ScaleX]:api.ScalarExpression.constant(1).divide(api.ScalarExpression.reference(a,api.ExpressionProperty.ScaleX))});
    const animation=a.animate({scaleX:2},{spring:{period:100,dampingRatio:0.2}});
    time=350;scene.root.update({});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    const source=a.snapshot.presentation.scaleX,target=b.snapshot.presentation.scaleX;
    animation.cancel();const terminal=await animation.finished;b.clearExpressions();const reset=b.snapshot.props.scaleX;
    a.dispose();b.dispose();scene.dispose();sdk.dispose();host.remove();return {source,target,terminal,reset};
  });
  expect(result.source).toBeGreaterThan(2);expect(result.source*result.target).toBeCloseTo(1,5);expect(result.terminal).toBe('Cancelled');expect(result.reset).toBe(1);
});



// The expected geometry is captured from the pinned native SDK, not generated
// from the browser layout. CSS width here is the ControlExample's content width.
for(const dpr of [1,1.25]){
  test(`official interop geometry and native controls at DPR ${dpr}`,async({browser})=>{
    const context=await browser.newContext({viewport:{width:1536,height:1000},deviceScaleFactor:dpr});
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/#xaml-comp-interop');
    await expect.poll(()=>page.evaluate(()=>Object.keys(window.motionScenes??{}).length)).toBe(5);
    await expect(page.getByRole('combobox',{name:'Renderer',exact:true})).toHaveCount(0);
    const ids=['composition-spring','composition-inverse','composition-follow','composition-size','composition-offset'];
    for(const width of [640,1143]){
      await page.locator('.basic-live').evaluateAll((nodes,width)=>nodes.forEach(n=>(n as HTMLElement).style.width=width+'px'),width);
      await expect.poll(()=>page.locator('#composition-inverse canvas').first().evaluate(n=>Math.round(n.getBoundingClientRect().width))).toBe(width);
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      for(const c of nativeLayout.cases.filter(c=>c.width===width)){
        const sample=page.locator('#'+ids[c.index]);const body=await sample.locator('.basic-live').boundingBox();
        expect(Math.abs(body!.height-c.body.height),`native body height ${width}/${c.index}`).toBeLessThanOrEqual(2/dpr);
        if(c.index===0||c.index===3||c.index===4){
          const options=await sample.locator('.options').boundingBox();
          expect(Math.abs(options!.width-(c.body.width-c.preview.width))).toBeLessThanOrEqual(1/dpr);
        }
        const key=['spring','inverse','follow','orbit','offset'][c.index];
        const actual=await page.evaluate(key=>window.motionScenes[key].snapshot.nodes.map(n=>({kind:n.kind,text:n.props.text,rect:n.rect,world:n.world})),key);
        const nativeNodes=c.nodes.filter(n=>n.kind==='Button'||n.kind==='Rectangle'||n.kind==='Ellipse');
        const browserNodes=actual.filter(n=>n.kind==='Button'||n.kind==='Rectangle'||n.kind==='Ellipse');
        for(let i=0;i<nativeNodes.length;i++){
          const expected=nativeNodes[i].bounds,observed=browserNodes[i];
          expect(observed.kind).toBe(nativeNodes[i].kind);
          expect(Math.abs(observed.world[4]-expected.x)).toBeLessThanOrEqual(2);
          expect(Math.abs(observed.world[5]-expected.y)).toBeLessThanOrEqual(2);
          expect(Math.abs(observed.rect.width-expected.width)).toBeLessThanOrEqual(1/dpr);
          expect(Math.abs(observed.rect.height-expected.height)).toBeLessThanOrEqual(1/dpr);
        }
      }
    }
    const period=page.locator('#composition-spring').getByRole('slider',{name:'Period (in ms)',exact:true});
    await period.focus();await page.keyboard.press('End');await expect(period).toHaveAttribute('aria-valuenow','200');
    await page.keyboard.press('Home');await expect(period).toHaveAttribute('aria-valuenow','25');
    const damping=page.locator('#composition-spring').getByRole('radio',{name:'0.2',exact:true});await damping.click();await expect(damping).toBeChecked();
    await expect.poll(()=>page.evaluate(()=>window.motionScenes.spring.snapshot.nodes.find(n=>n.kind==='Button')!.props.motion?.hoverSpring?.dampingRatio)).toBe(0.2);
    const radius=page.locator('#composition-size').getByRole('slider',{name:'Change radius',exact:true});
    await radius.focus();await page.keyboard.press('End');
    await expect.poll(()=>page.evaluate(()=>window.motionScenes.orbit.snapshot.nodes.find(n=>n.kind==='Grid'&&n.props.width===400)?.rect.width)).toBe(400);
    const text=page.locator('#composition-offset').getByRole('slider',{name:'Change font size',exact:true});
    await text.focus();await page.keyboard.press('End');
    await expect.poll(()=>page.evaluate(()=>window.motionScenes.offset.snapshot.nodes.some(n=>n.kind==='TextBlock'&&n.props.fontSize===24&&n.props.width===300))).toBe(true);
    expect(errors).toEqual([]);await context.close();
  });
}

test('connected templates preserve native typography, card input and keyboard activation',async({page})=>{
  await page.setViewportSize({width:1536,height:1000});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#connected-animation');
  await expect.poll(()=>page.evaluate(()=>Object.keys(window.motionScenes??{}).length)).toBe(4);
  await expect(page.getByRole('combobox',{name:'Renderer',exact:true})).toHaveCount(0);
  const typography=await page.evaluate(()=>{
    const nodes=window.motionScenes['connected-0'].snapshot.nodes;
    return {title:nodes.find(n=>n.kind==='TextBlock'&&n.props.text==='Item 1')!.props,
      description:nodes.find(n=>n.kind==='TextBlock'&&n.props.fontStyle==='Italic')!.text.lines};
  });
  expect(typography.title.fontSize).toBe(20);expect(typography.title.fontWeight).toBe(600);
  expect(typography.description).toHaveLength(2);expect(typography.description[1].text).toMatch(/…$/);
  const cards=page.locator('#connected-animation-1');await cards.getByRole('option',{name:'Item 3',exact:true}).click();
  await expect(cards.getByRole('button',{name:'Close',exact:true})).toBeVisible();
  const card=await page.evaluate(()=>{const nodes=window.motionScenes['connected-1'].snapshot.nodes;return {collection:nodes.find(n=>n.kind==='GridView')!,body:nodes.find(n=>n.kind==='TextBlock'&&n.props.maxLines===3)!};});
  expect(card.collection.enabled).toBe(true);expect(card.collection.props.isHitTestVisible).toBe(false);
  expect(card.body.text.lines).toHaveLength(3);expect(card.body.text.lines[2].text).toMatch(/…$/);
  await cards.getByRole('button',{name:'Close',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.motionScenes['connected-1'].snapshot.nodes.find(n=>n.kind==='GridView')!.props.isHitTestVisible)).toBe(true);
  const repeater=page.locator('#connected-animation-3');await repeater.getByRole('button',{name:'Item 1',exact:true}).focus();
  await page.keyboard.press('ArrowDown');await expect(repeater.getByRole('button',{name:'Item 8',exact:true})).toBeFocused();
  await page.keyboard.press('Space');await expect(repeater.getByRole('button',{name:'Go Back',exact:true})).toBeVisible();
  const value=await page.evaluate(()=>window.motionScenes['connected-3'].snapshot.nodes.find(n=>n.kind==='TextBlock'&&n.props.text==='Views: ')!.props.fontWeight);
  expect(value).toBe(700);await repeater.getByRole('button',{name:'Go Back',exact:true}).click();
  await expect(repeater.getByRole('button',{name:'Item 8',exact:true})).toBeFocused();expect(errors).toEqual([]);
});


for(const backend of ['Canvas2D','WebGL2'] as const){
 test(`${backend}: premultiplied transparent connected snapshots`,async({page})=>{
  await page.goto('/#xaml-comp-interop');
  const result=await page.evaluate(async backend=>{
   const path='/@id/winui-wasm';const api=await import(path) as typeof import('winui-wasm');let time=0;
   const sdk=await api.WinUI.create({clock:()=>time});const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:200px;height:100px;z-index:100';document.body.append(host);
   const scene=sdk.scene(host,{backend:api.RendererBackend[backend]});
   const a=scene.root.grid({width:20,height:20,translationX:10,translationY:10,horizontalAlignment:api.HorizontalAlignment.Left,verticalAlignment:api.VerticalAlignment.Top,background:'#ff000080'});
   const b=scene.root.grid({width:20,height:20,translationX:80,translationY:10,horizontalAlignment:api.HorizontalAlignment.Left,verticalAlignment:api.VerticalAlignment.Top,background:'#0000ff40'});
   await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   const animation=a.prepareConnectedAnimation('transparent');animation.tryStart(b,api.ConnectedAnimationConfiguration.Basic);
   time=150;scene.root.update({});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   const pixel=await new Promise<number[]>(resolve=>{
    let armed=false;const unsubscribe=scene.onSnapshot(()=>{if(!armed)return;
     const canvas=host.querySelector('canvas')!;const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;const ctx=copy.getContext('2d')!;ctx.drawImage(canvas,0,0);
     const n=b.snapshot;const pixel=Array.from(ctx.getImageData(Math.round((n.world[4]+10)*devicePixelRatio),Math.round((n.world[5]+10)*devicePixelRatio),1,1).data);unsubscribe();resolve(pixel);
    });armed=true;scene.root.update({});
   });
   scene.dispose();sdk.dispose();host.remove();return pixel;
  },backend);
  expect(Math.abs(result[0]-170)).toBeLessThanOrEqual(3);expect(result[1]).toBe(0);expect(Math.abs(result[2]-85)).toBeLessThanOrEqual(3);expect(Math.abs(result[3]-96)).toBeLessThanOrEqual(2);
 });
}

test('native interop endpoints, expressions and unclipped hover pixels',async({page})=>{
 await page.goto('/#xaml-comp-interop');const button=page.locator('#composition-spring').getByRole('button',{name:'Item',exact:true});await button.hover();
 await expect.poll(()=>page.evaluate(()=>window.motionScenes.spring.snapshot.nodes.find(n=>n.kind==='Button')!.presentation.scaleX)).toBe(1.5);
 const crop=await page.evaluate(()=>{const s=window.motionScenes.spring.snapshot,n=s.nodes.find(n=>n.kind==='Button')!,b=s.surfaceBounds!;const canvas=document.querySelector<HTMLCanvasElement>('#composition-spring canvas')!;const x=n.world[4]+30,y=n.world[5]+n.rect.height*n.presentation.scaleY-5;return{layoutHeight:s.nodes.find(n=>n.id===s.root)!.desired[1],height:b.height,bottom:n.world[5]+n.rect.height*n.presentation.scaleY,alpha:canvas.getContext('2d')!.getImageData(Math.floor((x-b.x)*devicePixelRatio),Math.floor((y-b.y)*devicePixelRatio),1,1).data[3]};});
 expect(crop.height).toBeGreaterThanOrEqual(crop.bottom);expect(crop.layoutHeight).toBeLessThan(crop.height);expect(crop.alpha).toBeGreaterThan(64);
 const follow=page.locator('#composition-follow');await follow.getByRole('button',{name:'Item 1',exact:true}).hover();
 await expect.poll(()=>page.evaluate(()=>window.motionScenes.follow.snapshot.nodes.filter(n=>n.kind==='Button').map(n=>Math.round(n.presentation.translationY)))).toEqual([0,25,25,25]);
});
