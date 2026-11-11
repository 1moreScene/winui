import {defineConfig} from '@playwright/test';
import base from './playwright.config';
const site=process.env.WINUI_TOUCH_BASE_URL;
export default defineConfig({...base,...(site?{use:{...base.use,baseURL:site},webServer:undefined}:{}),testMatch:'connected-navigation-touch.spec.ts',timeout:60000,expect:{timeout:20000},outputDir:'../out/connected-navigation-touch/artifacts',reporter:[['list'],['json',{outputFile:'../out/connected-navigation-touch/results.json'}]]});
