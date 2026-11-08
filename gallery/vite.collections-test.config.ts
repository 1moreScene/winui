import{defineConfig,type Plugin}from'vite';import base from'./vite.config';
import{readFileSync,mkdirSync,writeFileSync,readdirSync}from'node:fs';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import{resolve,relative,dirname}from'node:path';
// A separate chat may rebuild the SDK while these tests run. Serve one captured
// binary, glue module and build stamp for the whole run, with evidence on disk.
const portArgument=process.env.WINUI_COLLECTION_SNAPSHOT_ID??process.argv.find(v=>v.startsWith('--port='))?.split('=')[1]??process.argv[process.argv.indexOf('--port')+1];
const checkpointPort=/^\d+$/.test(portArgument??'')?Number(portArgument):5184;
const checkpointPrefix=`collections-${checkpointPort}`;
const runtimeInput=process.env.WINUI_COLLECTION_RUNTIME_DIR??fileURLToPath(new URL('./src/wasm/',import.meta.url));
const files=['winui_bg.wasm','winui.js','build-stamp.json'] as const;
const captured=Object.fromEntries(files.map(name=>[name,readFileSync(resolve(runtimeInput,name))]));
const stamp=JSON.parse(captured['build-stamp.json'].toString());
if(createHash('sha256').update(captured['winui_bg.wasm']).digest('hex')!==stamp.sha256)throw Error('WASM build is being replaced; restart after build completion');
const evidence=new URL(`../out/${checkpointPrefix}-test-runtime/`,import.meta.url);mkdirSync(evidence,{recursive:true});
for(const name of files)writeFileSync(new URL(name,evidence),captured[name]);
// Freeze the TS/React source as well: a concurrent chat may edit shared bridges
// after a test starts. Keep a reproducible application snapshot beside its WASM.
const sourceRoot=fileURLToPath(new URL('./src/',import.meta.url));
const appEvidence=fileURLToPath(new URL(`../out/${checkpointPrefix}-app-runtime/`,import.meta.url));
const sourceInput=process.env.WINUI_COLLECTION_APP_DIR??sourceRoot;
const appSources=new Map<string,Buffer>();
for(const entry of readdirSync(sourceInput,{recursive:true,withFileTypes:true})){
 if(!entry.isFile())continue;const absolute=resolve(entry.parentPath,entry.name);const path=relative(sourceInput,absolute);if(path==='manifest.json'||path.startsWith('wasm')||! /\.(tsx?|jsx?|json|css)$/.test(path))continue;
 const data=readFileSync(absolute);appSources.set(resolve(sourceRoot,path).replaceAll('\\','/'),data);const copy=resolve(appEvidence,path);mkdirSync(dirname(copy),{recursive:true});writeFileSync(copy,data);
}
writeFileSync(resolve(appEvidence,'manifest.json'),JSON.stringify({wasmSha256:stamp.sha256,files:[...appSources].map(([path,data])=>({path:relative(sourceRoot,path).replaceAll('\\','/'),sha256:createHash('sha256').update(data).digest('hex')}))},null,2));
let productionBuild=false;
let frozenWasmAsset:string|undefined;
const frozen:Plugin={name:'collections-captured-runtime',enforce:'pre',
 configResolved(config){productionBuild=config.command==='build';},
 load(id){
  const emitWasm=()=>frozenWasmAsset??=this.emitFile({type:'asset',name:'winui_bg.wasm',source:captured['winui_bg.wasm']});
  const [path,query]=id.replaceAll('\\','/').split('?');
  if(productionBuild&&path.endsWith('/src/wasm/winui_bg.wasm')&&new URLSearchParams(query??'').has('url'))return `export default import.meta.ROLLUP_FILE_URL_${emitWasm()}`;
  const name=files.find(name=>name!=='winui_bg.wasm'&&path.endsWith('/src/wasm/'+name));
  if(name){const source=captured[name].toString();return productionBuild&&name==='winui.js'?source.replace(/new URL\((['"])winui_bg\.wasm\1,\s*import\.meta\.url\)/g,`import.meta.ROLLUP_FILE_URL_${emitWasm()}`):source;}
  const data=appSources.get(path);if(data)return new URLSearchParams(query).has('raw')?`export default ${JSON.stringify(data.toString())}`:data.toString();
 },
 configureServer(server){server.middlewares.use((req,res,next)=>{const url=new URL(req.url??'/', 'http://localhost');if(url.pathname==='/src/wasm/winui_bg.wasm'&&!url.searchParams.has('import')&&!url.searchParams.has('url')){res.setHeader('Content-Type','application/wasm');res.end(captured['winui_bg.wasm']);}else next();});}
};
export default defineConfig({...base,cacheDir:'../out/collections-vite-cache',plugins:[...base.plugins?.filter(p=>!(p&&typeof p==='object'&&'name'in p&&p.name==='rust-wasm-reload'))??[],frozen],server:{...base.server,host:'127.0.0.1',port:checkpointPort,strictPort:true,hmr:false,watch:{ignored:['**/src/wasm/**']}}});
