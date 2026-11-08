import {defineConfig} from '@playwright/test';
const browser=process.env.PW_BROWSER??'chromium',port=Number(process.env.NAV_HOST_PORT??5303);
const report=process.env.NAV_HOST_REPORT??process.env.PW_CHANNEL??browser;
export default defineConfig({testDir:'./tests',testMatch:process.env.NAV_HOST_REGRESSION==='1'?['navigation-host.spec.ts','frame-flicker.spec.ts','frame.spec.ts','navigation-motion.spec.ts','navigation-quality.spec.ts','global-scrollbars.spec.ts']:['navigation-host.spec.ts'],workers:1,
 use:{browserName:browser as 'chromium'|'webkit',channel:browser==='chromium'?(process.env.PW_CHANNEL??'chrome'):undefined,baseURL:`http://127.0.0.1:${port}`,viewport:{width:1450,height:1000},deviceScaleFactor:1.25,trace:'retain-on-failure',screenshot:'only-on-failure'},
 outputDir:`../out/navigation-host-${report}`,reporter:[['list'],['json',{outputFile:`../out/navigation-host-${report}-results.json`}]],
 webServer:{command:`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --outDir ${process.env.NAV_HOST_ROOT??'../out/navigation-host-preview'} --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false}});
