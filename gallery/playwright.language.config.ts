import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:'language.spec.ts',workers:1,timeout:60000,
  use:{channel:'chrome',baseURL:'http://127.0.0.1:5231',viewport:{width:1440,height:1000},screenshot:'only-on-failure'},
  outputDir:'../out/language-tests',
  webServer:{command:'npm run dev -- --port 5231',url:'http://127.0.0.1:5231',reuseExistingServer:false},
});
