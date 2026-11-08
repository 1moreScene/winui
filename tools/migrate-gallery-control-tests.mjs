import {parseSync} from '../gallery/node_modules/rolldown/dist/utils-index.mjs';
import {walk} from './gallery-control-source.mjs';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
for(const name of readdirSync(new URL('../gallery/tests/',import.meta.url)).filter(name=>name.endsWith('.spec.ts')&&name!=='gallery-controls.spec.ts')) {
  const url=new URL(`../gallery/tests/${name}`,import.meta.url),source=readFileSync(url,'utf8');
  const ast=parseSync(name,source).program,edits=[];let helper=false;
  walk(ast,node=>{
    if(node.type!=='CallExpression'||node.callee.type!=='MemberExpression')return;
    const callee=node.callee;
    if(callee.property.name==='selectOption') {
      helper=true;edits.push([node.start,node.end,`selectGalleryOption(${source.slice(callee.object.start,callee.object.end)},${node.arguments.map(arg=>source.slice(arg.start,arg.end)).join(',')})`]);
    }
    if(callee.property.name==='locator'&&node.arguments[0]?.type==='Literal') {
      const arg=node.arguments[0],value=arg.value;
      if(typeof value!=='string')return;
      if(value==='#theme')edits.push([arg.start,arg.end,JSON.stringify('#theme [role="combobox"]')]);
      if(value==='#motion'||value==='#transparency')edits.push([arg.start,arg.end,JSON.stringify(`${value} [role="checkbox"]`)]);
      if(value.includes('summary')&&!value.includes('gallery-header'))edits.push([arg.start,arg.end,JSON.stringify(value.replace(/summary/g,'[aria-label="Source code"][aria-expanded]'))]);
    }
  });
  if(!edits.length)continue;
  // Nested locator edits are already contained in a rewritten selectOption call.
  const outer=edits.filter(edit=>!edits.some(other=>other!==edit&&other[0]<=edit[0]&&other[1]>=edit[1]));
  let text=source;for(const[start,end,replacement]of outer.sort((a,b)=>b[0]-a[0]))text=text.slice(0,start)+replacement+text.slice(end);
  if(helper)text="import {selectGalleryOption} from './gallery-control-helper';\n"+text;
  writeFileSync(url,text);
}
