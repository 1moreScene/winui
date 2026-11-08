import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:process.env.FRAME_REGRESSION==='1'?['frame.spec.ts','home.spec.ts','navigation-quality.spec.ts']:['frame.spec.ts'],workers:1,
  use:{channel:process.env.PW_CHANNEL??'chrome',baseURL:'http://127.0.0.1:5238',viewport:{width:1440,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
  outputDir:'../out/frame-tests',reporter:[['list'],['json',{outputFile:'../out/frame-results.json'}]],
  webServer:{command:process.env.GALLERY_FRAME_DEV==='1'?'npm run dev -- --port 5238 --strictPort':`npm run preview -- --outDir ${process.env.GALLERY_FRAME_ROOT??'dist'} --port 5238 --strictPort`,url:'http://127.0.0.1:5238',reuseExistingServer:false},
});
