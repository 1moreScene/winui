import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:process.env.NAV_MOTION_REGRESSION==='1'?['navigation-motion.spec.ts','frame.spec.ts','navigation-quality.spec.ts']:['navigation-motion.spec.ts'],workers:1,
 use:{channel:process.env.PW_CHANNEL??'chrome',baseURL:'http://127.0.0.1:5242',viewport:{width:1440,height:1000},deviceScaleFactor:1.25,trace:'retain-on-failure',screenshot:'only-on-failure'},
 outputDir:'../out/navigation-motion-browser',reporter:[['list'],['json',{outputFile:`../out/navigation-motion-${process.env.PW_CHANNEL??'chrome'}-results.json`}]],
 webServer:{command:`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --outDir ${process.env.NAV_MOTION_ROOT??'dist'} --port 5242 --strictPort`,url:'http://127.0.0.1:5242',reuseExistingServer:false}});
