import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:['navigation-motion.spec.ts','navigation-pane-motion.spec.ts','navigation-performance.spec.ts','source-code.spec.ts','global-scrollbars.spec.ts'],workers:1,timeout:90000,
 expect:{timeout:15000},
 use:{channel:'chrome',baseURL:process.env.NAVIGATION_COMPOSITION_URL??'http://127.0.0.1:5413',viewport:{width:1440,height:1100},deviceScaleFactor:1.25,screenshot:'only-on-failure',trace:'retain-on-failure'},
 outputDir:'../out/navigation-composition-motion',
 reporter:[['list'],['json',{outputFile:'../out/navigation-composition-motion.json'}]],
});
