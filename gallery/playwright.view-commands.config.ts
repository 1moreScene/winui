import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'view-commands.spec.ts',workers:1,
 use:{channel:'chrome',baseURL:'http://127.0.0.1:54837',viewport:{width:1440,height:1000},screenshot:'only-on-failure',trace:'retain-on-failure'},
 outputDir:process.env.VIEW_COMMAND_PRODUCTION==='1'?'../out/view-command-production-tests':'../out/view-command-browser',reporter:[['list'],['json',{outputFile:process.env.VIEW_COMMAND_PRODUCTION==='1'?'../out/view-command-production-results.json':'../out/view-command-browser-results.json'}]],
 webServer:{command:process.env.VIEW_COMMAND_PRODUCTION==='1'?'npm run preview -- --outDir ../out/view-command-production --port 54837':'npm run dev -- --port 54837',url:'http://127.0.0.1:54837',reuseExistingServer:false},
});

