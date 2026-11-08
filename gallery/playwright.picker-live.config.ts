import {defineConfig} from '@playwright/test';import {fileURLToPath} from 'node:url';
process.env.WINUI_PICKER_REPO=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({outputDir:'../out/picker-live-artifacts',testDir:'tests',testMatch:'picker-reported-regressions.spec.ts',workers:1,timeout:45000,use:{channel:'chrome',baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1100},deviceScaleFactor:1.25,screenshot:'only-on-failure',trace:'retain-on-failure'},reporter:[['list'],['json',{outputFile:'../out/picker-live-results.json'}]]});
