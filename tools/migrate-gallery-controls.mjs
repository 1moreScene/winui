// One-time source migration. Edits only JSX tag names and value callback APIs;
// leaves example SDK calls and their source markers intact.
import { sources, walk } from './gallery-control-source.mjs';
import { writeFileSync } from 'node:fs';
for (const source of sources()) {
  if (source.name === 'GalleryControls.tsx' || source.name === 'GalleryPageHeader.tsx') continue;
  const edits=[], imports=new Set();
  const replace=(start,end,text)=>edits.push({start,end,text});
  walk(source.ast,(node,parent)=>{
    if(node.type!=='JSXElement')return;
    const opening=node.openingElement,tag=opening.name.name;
    const attributes=opening.attributes;
    const attr=name=>attributes.find(a=>a.type==='JSXAttribute'&&a.name.name===name);
    const type=attr('type')?.value?.value??'text';
    let component=({select:'GalleryComboBox',option:'GalleryOption',button:'GalleryButton',details:'GalleryExpander',summary:'GalleryExpanderHeader'})[tag];
    if(tag==='input')component=({checkbox:'GalleryCheckBox',radio:'GalleryRadioButton',range:'GallerySlider',number:'GalleryNumberBox',text:'GalleryTextBox'})[type];
    if(!component)return;
    if(tag==='button'&&attr('className')?.value?.value==='home-pane-backdrop') {
      replace(opening.name.start,opening.name.end,'div');
      const click=attr('onClick');if(click)replace(click.name.start,click.name.end,'onPointerDown');
      return;
    }
    imports.add(component);
    replace(opening.name.start,opening.name.end,component);
    if(node.closingElement)replace(node.closingElement.name.start,node.closingElement.name.end,component);
    if(tag==='input'&&attr('type'))replace(attr('type').start,attr('type').end,'');
    const change=attr('onChange');
    if(change) {
      replace(change.name.start,change.name.end,'onValueChanged');
      const expression=change.value.expression;
      const code=source.text.slice(expression.start,expression.end).replace(/\b(\w+)\.(?:target|currentTarget)\.(?:checked|valueAsNumber|value)\b/g,'$1');
      replace(expression.start,expression.end,code);
    }
  });
  if(!edits.length)continue;
  let text=source.text;
  for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
  text=`import { ${[...imports].sort().join(', ')} } from './GalleryControls';\n`+text;
  writeFileSync(source.url,text);
  console.log(`${source.name}: ${imports.size} existing SDK control host types`);
}
