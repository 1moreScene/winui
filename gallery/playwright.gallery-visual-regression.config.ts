import {defineConfig} from '@playwright/test';
import base from './playwright.gallery-controls-regression.config';
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:5247'},webServer:{command:'npx vite --config vite.home-validation.config.ts --port 5247',url:'http://127.0.0.1:5247',reuseExistingServer:false},outputDir:'../out/gallery-visual-regression',reporter:[['list'],['json',{outputFile:'../out/gallery-visual-regression-results.json'}]]});
