import {defineConfig} from '@playwright/test';
import base from './playwright.picker-gallery.config';
export default defineConfig({...base,webServer:undefined,testMatch:['picker-gallery.spec.ts','picker-reported-regressions.spec.ts'],outputDir:'../out/picker-gallery-live-artifacts',use:{...base.use,baseURL:'http://127.0.0.1:5173'},reporter:[['list'],['json',{outputFile:'../out/picker-gallery-live-results.json'}]]});
