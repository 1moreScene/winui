import {sources} from './gallery-control-source.mjs';
import {writeFileSync} from 'node:fs';
for(const source of sources()) {
  const edits=[];
  function visit(node,inExpander=false) {
    if(!node||typeof node!=='object')return;
    if(node.type==='JSXElement'&&node.openingElement.name.name==='GalleryExpander') {
      if(inExpander) {
        edits.push([node.openingElement.name.start,node.openingElement.name.end,'section'],[node.closingElement.name.start,node.closingElement.name.end,'section']);
        const header=node.children.find(child=>child.type==='JSXElement'&&child.openingElement.name.name==='GalleryExpanderHeader');
        if(header)edits.push([header.openingElement.name.start,header.openingElement.name.end,'h3'],[header.closingElement.name.start,header.closingElement.name.end,'h3']);
      }
      inExpander=true;
    }
    for(const value of Object.values(node))if(Array.isArray(value)){for(const child of value)visit(child,inExpander);}else if(value&&typeof value==='object')visit(value,inExpander);
  }
  visit(source.ast);
  if(!edits.length)continue;
  let text=source.text;for(const[start,end,replacement]of edits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,start)+replacement+text.slice(end);
  writeFileSync(source.url,text);console.log(`${source.name}: flattened nested source expanders`);
}
