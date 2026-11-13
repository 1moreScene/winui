import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('third_party/icon-fonts/coverage.json',root)));
const sha=data=>createHash('sha256').update(data).digest('hex');
if(sha(readFileSync(new URL('packages/winui-wasm/src/assets/winui-icons.woff',root)))!==manifest.sha256)throw Error('Icon font fingerprint changed; rebuild with tools/build-icon-font.py');
for(const [name,hash] of Object.entries(manifest.sources))if(sha(readFileSync(new URL(`third_party/icon-fonts/${name}`,root)))!==hash)throw Error(`Icon font source changed: ${name}`);
const coverage=new Set(manifest.codepoints),missing=[];
const walk=path=>{path=path instanceof URL?fileURLToPath(path):path;return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='wasm'?[]:walk(resolve(path,e.name))):[resolve(path,e.name)]);};
const paths=[...walk(new URL('src',root)),...walk(new URL('gallery/src',root)),...walk(new URL('designer/src',root)),...walk(new URL('packages/winui-wasm/src',root)),...readdirSync(new URL('references',root)).filter(p=>p.endsWith('template.json')).map(p=>new URL(`references/${p}`,root))];
for(const path of paths){
 if(!['.rs','.ts','.tsx','.css','.json'].includes(extname(path instanceof URL?path.pathname:path)))continue;
 const text=readFileSync(path,'utf8');
 if(/(?:text|glyph|icon)="\\u[EF][0-9a-f]{3}/i.test(text))throw Error(`Literal JSX icon escape: ${path}`);
 const codes=[...text.matchAll(/\\u\{?([ef][\da-f]{3})(?![\da-f])/gi)].map(m=>parseInt(m[1],16));
 for(const match of text.matchAll(/&#x([ef][\da-f]{3});/gi))codes.push(parseInt(match[1],16));
 if(extname(path instanceof URL?path.pathname:path)==='.css')for(const match of text.matchAll(/\\([ef][\da-f]{3})(?![\da-f])/gi))codes.push(parseInt(match[1],16));
 for(const character of text)if(character.codePointAt(0)>=0xe000&&character.codePointAt(0)<=0xf8ff)codes.push(character.codePointAt(0));
 for(const code of codes){if(code<0xe000||code>0xf8ff||code===0xe000||code===0xf8ff)continue;const hex=code.toString(16).toUpperCase();if(!coverage.has(hex))missing.push(`${hex}: ${path}`);}
}
if(missing.length)throw Error(`Unmapped portable icon glyphs:\n${[...new Set(missing)].join('\n')}`);
console.log(`Portable icon coverage passed: ${coverage.size} glyphs; source and font fingerprints verified.`);
