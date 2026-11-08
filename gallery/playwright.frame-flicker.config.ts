import {defineConfig} from '@playwright/test';
const browser=process.env.PW_BROWSER??'chromium';
const port=Number(process.env.FRAME_FLICKER_PORT??5246);
export default defineConfig({testDir:'./tests',testMatch:'frame-flicker.spec.ts',workers:1,
 use:{browserName:browser as 'chromium'|'webkit'|'firefox',channel:browser==='chromium'?(process.env.PW_CHANNEL??'chrome'):undefined,
  baseURL:`http://127.0.0.1:${port}`,viewport:{width:1440,height:1000},deviceScaleFactor:1.25,trace:'retain-on-failure',screenshot:'only-on-failure'},
 outputDir:`../out/frame-flicker-${process.env.RUN_TAG??'current'}-${process.env.PW_CHANNEL??browser}`,
 reporter:[['list'],['json',{outputFile:`../out/frame-flicker-${process.env.RUN_TAG??'current'}-${process.env.PW_CHANNEL??browser}-results.json`}]],
 webServer:{command:`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --outDir ${process.env.FRAME_FLICKER_ROOT??'../out/frame-flicker-preview'} --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false}});
