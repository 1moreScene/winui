import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:['expander-edge.spec.ts','combobox-acrylic.spec.ts','numberbox-input.spec.ts','tree-view-hover.spec.ts','source-code.spec.ts','calendar-week-start.spec.ts'],
  workers:1,
  use:{channel:'chrome',baseURL:'http://127.0.0.1:5460',viewport:{width:1440,height:1000},colorScheme:'light',deviceScaleFactor:1,screenshot:'only-on-failure'},
  reporter:[['list'],['json',{outputFile:'../out/mit-browser-results.json'}]],
  outputDir:'../out/mit-browser-tests',
  webServer:{command:'node node_modules/vite/bin/vite.js --port 5460 --strictPort',url:'http://127.0.0.1:5460',reuseExistingServer:!process.env.CI},
});
