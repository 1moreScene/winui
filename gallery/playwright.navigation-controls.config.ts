import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'**/navigation-controls.spec.ts',webServer:undefined,use:{...base.use,baseURL:process.env.WINUI_NAVIGATION_TEST_URL??'http://127.0.0.1:5196',deviceScaleFactor:1.25},outputDir:'../out/navigation-controls-browser',reporter:[['list'],['json',{outputFile:'../out/navigation-controls-browser-results.json'}]]});
