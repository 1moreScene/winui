import {defineConfig} from '@playwright/test';
import base from './playwright.gallery-controls.config';
export default defineConfig({...base,testMatch:['home.spec.ts','sample-pages.spec.ts','button-source.spec.ts'],outputDir:'../out/gallery-controls-pages',reporter:[['list'],['json',{outputFile:'../out/gallery-controls-pages-results.json'}]]});
