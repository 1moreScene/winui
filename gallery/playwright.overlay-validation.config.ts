import base from './playwright.overlays.config';
import {defineConfig} from '@playwright/test';
const url=`http://127.0.0.1:${process.env.OVERLAY_VALIDATION_PORT??5186}`;
export default defineConfig({...base,testDir:'../out/overlay-validation/gallery/tests',use:{...base.use,baseURL:url},webServer:{command:'node node_modules/vite/bin/vite.js --config vite.overlay-validation.config.ts',url,reuseExistingServer:false}});
