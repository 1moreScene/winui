import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:['navigation-external-content.spec.ts','navigation-host.spec.ts','react-mount.spec.ts','gallery-controls.spec.ts'],workers:1,
  use:{channel:process.env.PW_CHANNEL??'chrome',baseURL:'http://127.0.0.1:5398',viewport:{width:1440,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'dpr-1',use:{deviceScaleFactor:1}},{name:'dpr-1.25',use:{deviceScaleFactor:1.25}},{name:'dpr-2',use:{deviceScaleFactor:2}}],
  outputDir:`../out/navigation-external-content-${process.env.NAV_EXTERNAL_RUN??'tests'}`,reporter:[['list'],['json',{outputFile:`../out/navigation-external-content-${process.env.NAV_EXTERNAL_RUN??'results'}.json`}]],
  webServer:{command:process.env.NAV_EXTERNAL_PRODUCTION==='1'?'node node_modules/vite/bin/vite.js preview --outDir ../out/navigation-external-content-preview --host 127.0.0.1 --port 5398 --strictPort':'node node_modules/vite/bin/vite.js ../out/navigation-external-content-dev --host 127.0.0.1 --port 5398 --strictPort',url:'http://127.0.0.1:5398',reuseExistingServer:false},
});
