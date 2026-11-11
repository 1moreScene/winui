import {defineConfig} from '@playwright/test';
import base from './playwright.config';
const site=process.env.WINUI_TABLE_VIEW_TOUCH_BASE_URL;
export default defineConfig({...base,...(site?{use:{...base.use,baseURL:site},webServer:undefined}:{}),testMatch:'table-view-touch.spec.ts',outputDir:'../out/table-view-touch/artifacts',reporter:[['list'],['json',{outputFile:'../out/table-view-touch/results.json'}]]});
