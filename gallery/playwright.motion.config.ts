import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  testDir:'./tests',testMatch:'motion-effects.spec.ts',workers:1,timeout:90000,
  expect:{timeout:15000},
  use:{channel:process.env.PW_CHANNEL??'chrome',baseURL:'http://127.0.0.1:5209',viewport:{width:1440,height:1100},screenshot:'only-on-failure',trace:'retain-on-failure'},
  reporter:[['list'],['json',{outputFile:fileURLToPath(new URL('../out/motion-browser-results.json',import.meta.url))}]],
  webServer:{command:process.env.WINUI_MOTION_WASM?'npx vite --config vite.motion.config.ts --port 5209 --strictPort':'npm run dev -- --port 5209 --strictPort',url:'http://127.0.0.1:5209',reuseExistingServer:false},
});
