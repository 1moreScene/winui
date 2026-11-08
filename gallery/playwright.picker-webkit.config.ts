import {defineConfig} from '@playwright/test';import {fileURLToPath} from 'node:url';
process.env.WINUI_PICKER_REPO=fileURLToPath(new URL('../',import.meta.url));
process.env.WINUI_PICKER_EVIDENCE='picker-webkit';
export default defineConfig({outputDir:'../out/picker-webkit-artifacts',testDir:'tests',testMatch:'picker*.spec.ts',workers:1,timeout:45000,use:{browserName:'webkit',baseURL:'http://127.0.0.1:5396',viewport:{width:1440,height:1100},deviceScaleFactor:1.25,screenshot:'only-on-failure',trace:'retain-on-failure'},reporter:[['list'],['json',{outputFile:'../out/picker-webkit-results.json'}]],webServer:{command:'node node_modules/vite/bin/vite.js --config vite.picker-validation.config.ts',url:'http://127.0.0.1:5396',reuseExistingServer:true}});
