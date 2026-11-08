import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:['menu-layout.spec.ts','animated-icons.spec.ts'],outputDir:process.env.WINUI_MENU_ARTIFACTS??'../out/menu-refinement-browser-artifacts',workers:1,timeout:30000,
 use:{baseURL:process.env.WINUI_MENU_LAYOUT_URL??'http://127.0.0.1:5300',viewport:{width:1440,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'edge',use:{browserName:'chromium',channel:'msedge'}},{name:'webkit',use:{browserName:'webkit'}}],
 reporter:[['list'],['json',{outputFile:process.env.WINUI_MENU_REPORT??'../out/menu-refinement-browser-results.json'}]],
});
