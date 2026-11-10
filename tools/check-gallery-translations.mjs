import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../gallery/src/',import.meta.url);
const normalize=text=>text.replace(/\s+/g,' ').trim();
const dictionary=JSON.parse(readFileSync(new URL('gallery-zh.json',root),'utf8'));
const translated=new Set(Object.keys(dictionary).map(normalize));
const missing=new Set();let checked=0;
for(const file of readdirSync(root).filter(file=>/^official-.*\.json$/.test(file))){
  function visit(value){
    if(Array.isArray(value)){value.forEach(visit);return;}
    if(!value||typeof value!=='object')return;
    for(const [key,text] of Object.entries(value)){
      if(typeof text==='string'&&(file==='official-home.json'?key==='description':['description','details','title','header'].includes(key))){
        if(!/[a-z]/i.test(text)||!text.includes(' ')||/ - API$/.test(text)||/^(Lorem|Nullam|Quisque|Aenean|Ut consequat|Proin|Duis)/.test(text))continue;
        checked++;if(!translated.has(normalize(text)))missing.add(`${file}: ${text}`);
      }else visit(text);
    }
  }
  visit(JSON.parse(readFileSync(new URL(file,root),'utf8')));
}
if(missing.size){console.error([...missing].join('\n'));process.exitCode=1;}
else console.log(`Chinese translations cover ${checked} page descriptions and sample headings; control names and code stay in English.`);
