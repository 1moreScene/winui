import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:'motion-effects.spec.ts',workers:1,
  use:{channel:process.env.PW_CHANNEL??'chrome',baseURL:'http://127.0.0.1:5209',viewport:{width:1440,height:1100},screenshot:'only-on-failure',trace:'retain-on-failure'},
  reporter:[['list'],['json',{outputFile:'../out/motion-browser-results.json'}]],
  webServer:{command:'npm run dev -- --port 5209 --strictPort',url:'http://127.0.0.1:5209',reuseExistingServer:false},
});
