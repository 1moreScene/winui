import {expect,type Locator} from '@playwright/test';
/** SDK role=checkbox projects Rust state on its next frame. */
export async function setGalleryChecked(target:Locator,checked:boolean) {
  if(await target.evaluate(element=>element.tagName==='INPUT'))return target.setChecked(checked);
  if((await target.getAttribute('aria-checked')==='true')!==checked)await target.click();
  await expect(target).toHaveAttribute('aria-checked',String(checked));
}
/** Real keyboard/pointer input to the existing Rust ComboBox. */
export async function selectGalleryOption(target:Locator,option:string|{label?:string;value?:string}|readonly string[]) {
  if(await target.evaluate(element=>element.tagName==='SELECT'))return target.selectOption(option as string);
  const requested=typeof option==='string'?option:Array.isArray(option)?option[0]:(option as {label?:string;value?:string}).value??(option as {label?:string}).label!;
  if(await target.getAttribute('id')==='theme') {
    const page=target.page();
    if(requested==='HighContrast') {
      const hash=new URL(page.url()).hash;
      await page.evaluate(()=>location.hash='#settings');
      await selectGalleryOption(page.getByRole('combobox',{name:'App theme',exact:true}),requested);
      await page.evaluate(hash=>location.hash=hash,hash);
      await expect(page.getByRole('button',{name:'Toggle theme',exact:true})).toBeVisible();
    } else {
      for(let i=0;i<2&&await page.locator('html').getAttribute('data-theme')!==requested;i++) {
        const previous=await page.locator('html').getAttribute('data-theme');
        await target.getByRole('button').click();
        // Rust projects Click on its next frame. Wait for the theme update
        // before deciding whether another click is needed.
        await expect(page.locator('html')).not.toHaveAttribute('data-theme',previous??'');
      }
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme',requested);return;
  }
  const combo=await target.getAttribute('role')==='combobox'?target:target.getByRole('combobox');
  const label=await combo.evaluate((element,value)=>{
    const host=element.closest('[data-gallery-control="ComboBox"]') as HTMLElement & {galleryScene?:import('winui-wasm').Scene};
    const scene=host?.galleryScene,node=scene?.snapshot.nodes.find(node=>node.kind==='ComboBox');
    const props=node?.props as {collectionItems?:{id:string;text:string}[]}|undefined;
    const controller=(scene as unknown as {nodes:Map<number,{items?:{id:string;text:string}[]}>})?.nodes.get(node!.id);
    const items=controller?.items??props?.collectionItems;
    return items?.find(item=>item.id===value)?.text??value;
  },requested);
  // Pointer actionability waits for the real Frame to release its inert transition.
  if(await combo.getAttribute('aria-expanded')!=='true')await combo.click();
  await expect(combo).toHaveAttribute('aria-expanded','true');
  const popup=combo.page().locator(`[id="${await combo.getAttribute('aria-controls')}"]`);
  await popup.getByRole('option',{name:label,exact:true}).click();
  await expect(combo).toHaveValue(label);
  await expect(combo).toHaveAttribute('aria-expanded','false');
}
export async function openSource(source:Locator) {
  const surface=source.locator(':scope > [data-gallery-control="Expander"]');
  const header=surface.getByRole('button').first();
  if(await header.getAttribute('aria-expanded')!=='true')await header.click();
  await expect.poll(()=>surface.evaluate(element=>(element as HTMLElement&{galleryScene?:import('winui-wasm').Scene}).galleryScene?.snapshot.animating)).toBe(false);
  return header;
}
