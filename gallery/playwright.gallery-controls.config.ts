import { defineConfig } from '@playwright/test';
import base from './playwright.home.config';
export default defineConfig({...base,testMatch:'gallery-controls.spec.ts',outputDir:'../out/gallery-controls-tests',reporter:[['list'],['json',{outputFile:'../out/gallery-controls-results.json'}]],
  webServer:{command:`npm run preview -- --outDir ../out/${process.env.GALLERY_CONTROLS_BUILD??'gallery-controls'}-preview --port 5217`,url:'http://127.0.0.1:5217',reuseExistingServer:false}});
