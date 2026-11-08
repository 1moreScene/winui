import {defineConfig} from '@playwright/test';
import base from './playwright.composed.config';
export default defineConfig({...base,testMatch:'composed-motion.spec.ts',outputDir:'../out/composed-motion-artifacts',reporter:[['list'],['json',{outputFile:'../out/composed-motion-results.json'}]],use:{...base.use,baseURL:'http://127.0.0.1:5299'},webServer:{command:'node node_modules/vite/bin/vite.js --config vite.composed-validation.config.ts --port 5299',url:'http://127.0.0.1:5299',reuseExistingServer:false}});
