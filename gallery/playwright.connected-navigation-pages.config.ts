import {readFileSync} from 'node:fs';
import {defineConfig} from '@playwright/test';
import base from './playwright.connected-navigation-touch.config';
const {base:path}=JSON.parse(readFileSync(new URL('./dist-pages/pages-build.json',import.meta.url),'utf8')) as {base:string};
const baseURL=`http://127.0.0.1:4175${path}`;
export default defineConfig({...base,testMatch:['connected-navigation-touch.spec.ts','table-view-touch.spec.ts'],use:{...base.use,baseURL},webServer:{command:`node node_modules/vite/bin/vite.js preview --outDir dist-pages --base ${path} --host 127.0.0.1 --port 4175 --strictPort`,url:baseURL,reuseExistingServer:false},outputDir:'../out/connected-navigation-pages/artifacts',reporter:[['list'],['json',{outputFile:'../out/connected-navigation-pages/results.json'}]]});
