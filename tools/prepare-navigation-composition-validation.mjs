import {cpSync,mkdirSync,existsSync,symlinkSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const snapshot=join(root,'out/navigation-composition-dev'),wasm=join(root,'out/navigation-composition-wasm');
const target=resolve(root,process.env.NAVIGATION_COMPOSITION_TARGET??'target/navigation-composition');
function run(command,args){execFileSync(command,args,{cwd:root,stdio:'inherit'});}
run('python',['-X','utf8','tools/extract-navigation-composition.py']);
run('node',['tools/generate-enums.mjs','--check']);
run('node',['tools/check-control-origins.mjs','--check']);
if(!process.argv.includes('--reuse-build'))run('cargo',['build','--locked','--release','--target','wasm32-unknown-unknown','--target-dir',target]);
mkdirSync(wasm,{recursive:true});
run('wasm-bindgen',['--target','web','--out-dir',wasm,'--out-name','winui',join(target,'wasm32-unknown-unknown/release/winui_wasm.wasm')]);
const hash=createHash('sha256').update(readFileSync(join(wasm,'winui_bg.wasm'))).digest('hex');
writeFileSync(join(wasm,'build-stamp.json'),JSON.stringify({sha256:hash,completedAt:Date.now()}));
mkdirSync(snapshot,{recursive:true});
for(const name of ['src','public','index.html','vite.config.ts','package.json','tsconfig.json'])cpSync(join(root,'gallery',name),join(snapshot,name),{recursive:true});
cpSync(wasm,join(snapshot,'src/wasm'),{recursive:true});
if(!existsSync(join(snapshot,'node_modules')))symlinkSync(join(root,'gallery/node_modules'),join(snapshot,'node_modules'),'junction');
if(!existsSync(join(root,'out/references')))symlinkSync(join(root,'references'),join(root,'out/references'),'junction');
cpSync(join(root,'tools/navigation-composition-fixture.html'),join(snapshot,'composition.html'));
if(process.argv.includes('--production')){
 const config=join(snapshot,'vite.composition.config.mjs');
 writeFileSync(config,`import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';export default defineConfig({plugins:[react()],build:{rolldownOptions:{input:{gallery:${JSON.stringify(join(snapshot,'index.html'))},composition:${JSON.stringify(join(snapshot,'composition.html'))}}}}});`);
 run('node',[join(root,'gallery/node_modules/vite/bin/vite.js'),'build',snapshot,'--config',config,'--outDir',join(root,'out/navigation-composition-preview'),'--emptyOutDir']);
}
const nativePath=join(root,'out/navigation-composition-native/results.json');
if(existsSync(nativePath)){
 const native=JSON.parse(readFileSync(nativePath,'utf8'));
 const names=new Set(['NavigationViewBackButton','NavigationViewCloseButton','TogglePaneButton','PaneHeaderContentBorder','PaneTitleTextBlock','RootSplitView','PaneContentGrid','MenuItemsHost','MenuItemsScrollViewer','FooterContentBorder','FooterMenuItemsHost','ContentGrid','ContentPresenter','HeaderContent','PaneAutoSuggestBoxPresenter','TopPaneAutoSuggestBoxPresenter','PaneCustomContentBorder','PaneCustomContentOnTopPane','PaneFooterOnTopPane','TopNavMenuItemsHost','SearchBox','CustomContent','CustomFooter']);
 native.rows=native.rows.map(row=>({...row,parts:Object.fromEntries(row.parts.filter(p=>names.has(p.name)).map(p=>[p.name,p]))}));
 native.provenance={galleryCommit:'7360ac322414e118eadfb0c7c2f4ecc31a218f59',winuiCommit:'7b12709347527238494ca28cb9fed326d513e779',probe:'tools/native-navigation-composition',rawSha256:createHash('sha256').update(readFileSync(nativePath)).digest('hex')};
 writeFileSync(join(root,'references/navigation-composition-native.json'),JSON.stringify(native,null,2)+'\n');
}
console.log(`Prepared frozen SDK/Gallery: ${hash}`);
