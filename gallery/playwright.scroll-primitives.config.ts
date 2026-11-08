import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'**/scroll-primitives.spec.ts',webServer:undefined,use:{...base.use,channel:process.env.PW_CHANNEL??'chrome',baseURL:process.env.WINUI_PRIMITIVES_URL??'http://127.0.0.1:5220',deviceScaleFactor:1.25},outputDir:'../out/scroll-primitives-browser',reporter:[['list'],['json',{outputFile:process.env.WINUI_PRIMITIVES_URL?.includes(':5221')?'../out/scroll-primitives-production-results.json':'../out/scroll-primitives-browser-results.json'}]]});
