import { parseSync } from '../packages/winui-wasm/node_modules/rolldown/dist/utils-index.mjs';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import {pathToFileURL} from 'node:url';
export function walk(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit, node);
    else if (value && typeof value === 'object') walk(value, visit, node);
  }
}
export function sources({includeAdapters=false}={}) {
  return readdirSync(new URL('../gallery/src/', import.meta.url),{recursive:true}).filter(name => /\.[jt]sx$/.test(name) && (includeAdapters||!['react.tsx','main.tsx'].includes(name))).map(name => {
    const url = new URL(`../gallery/src/${name}`, import.meta.url), text = readFileSync(url, 'utf8');
    const result = parseSync(name, text);
    if (result.errors.length) throw new Error(JSON.stringify(result.errors));
    return { name, url, text, ast: result.program };
  });
}
export function audit() {
  const controls = [];
  for (const source of sources({includeAdapters:true})) walk(source.ast, node => {
    if (node.type !== 'JSXOpeningElement' || !['input','select','textarea','button','details','summary','option','dialog','progress','meter','menu'].includes(node.name.name)) return;
    controls.push({ file: source.name, line: source.text.slice(0,node.start).split('\n').length, tag: node.name.name,
      attributes: source.text.slice(node.start,node.end),
    });
  });
  return controls;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if (direct&&process.argv.includes('--audit')) {
  const controls = audit();
  writeFileSync(new URL('../out/gallery-dom-controls-before.json',import.meta.url),JSON.stringify(controls,null,2));
  console.log(JSON.stringify(Object.groupBy(controls, c=>c.tag),(_,value)=>Array.isArray(value)?value.length:value));
}
if (direct&&process.argv.includes('--check')) {
  const controls=audit();
  if(controls.length)throw new Error(`Gallery must mount existing SDK controls: ${JSON.stringify(controls)}`);
  console.log('Gallery JSX contains no native input/select/button/details/summary/option substitutes.');
}
