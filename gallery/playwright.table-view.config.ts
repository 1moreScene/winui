import {defineConfig} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const baseURL=process.env.WINUI_TABLE_VIEW_BASE_URL??'http://127.0.0.1:5173';
const port=new URL(baseURL).port;
export default defineConfig({
 metadata:{baseURL,hmrDuringTest:false,pinnedArtifact:process.env.WINUI_TABLE_VIEW_ARTIFACT,wasmSha256:createHash('sha256').update(readFileSync(process.env.WINUI_TABLE_VIEW_ARTIFACT?resolve(process.env.WINUI_TABLE_VIEW_ARTIFACT,'winui_bg.wasm'):new URL('./src/wasm/winui_bg.wasm',import.meta.url))).digest('hex')},
 testDir:'./tests',testMatch:'table-view.spec.ts',workers:1,
 expect:{timeout:20000},timeout:60000,
 use:{channel:'chrome',baseURL,viewport:{width:1440,height:1100},trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'Canvas2D',use:{deviceScaleFactor:1.25}}],
 outputDir:'../out/table-view-browser',
 reporter:[['list'],['json',{outputFile:'../out/table-view-browser.json'}]],
 webServer:{command:`node node_modules/vite/bin/vite.js ${port==='5407'?'preview --outDir ../out/table-view-preview':''} --host 127.0.0.1 --port ${port} --strictPort`,url:baseURL,reuseExistingServer:true},
});
