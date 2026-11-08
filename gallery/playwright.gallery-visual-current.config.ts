import {defineConfig} from '@playwright/test';
import base from './playwright.gallery-visual.config';
export default defineConfig({...base,grepInvert:/All implemented pages/,use:{...base.use,baseURL:'http://127.0.0.1:5248'},
  webServer:{command:'npm run preview -- --outDir ../out/gallery-visual-current-preview --port 5248',url:'http://127.0.0.1:5248',reuseExistingServer:false},
  outputDir:'../out/gallery-visual-current-tests',reporter:[['list'],['json',{outputFile:'../out/gallery-visual-current-results.json'}]]});
