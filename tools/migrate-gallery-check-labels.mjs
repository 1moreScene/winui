import {sources,walk} from './gallery-control-source.mjs';
import {writeFileSync} from 'node:fs';
for(const source of sources()) {
  const edits=[];
  walk(source.ast,node=>{
    if(node.type!=='JSXElement'||node.openingElement.name.name!=='label')return;
    const widgets=node.children.filter(child=>child.type==='JSXElement');
    if(widgets.length!==1||!['GalleryCheckBox','GalleryRadioButton'].includes(widgets[0].openingElement.name.name))return;
    const control=widgets[0],label=node.children.filter(child=>child!==control).map(child=>source.text.slice(child.start,child.end)).join('');
    const attributes=node.openingElement.attributes.map(attr=>source.text.slice(attr.start,attr.end)).join(' ');
    const opening=source.text.slice(control.openingElement.start,control.openingElement.end);
    edits.push({start:node.start,end:node.end,text:opening.replace(/\s*\/>$/,` ${attributes} label={<>${label}</>}/>`)});
  });
  if(!edits.length)continue;
  let text=source.text;for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
  writeFileSync(source.url,text);console.log(`${source.name}: ${edits.length} labels moved into real controls`);
}
