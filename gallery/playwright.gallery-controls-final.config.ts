import {defineConfig} from '@playwright/test';
import base from './playwright.gallery-controls.config';
export default defineConfig({...base,grepInvert:/Every implemented Gallery page/,outputDir:'../out/gallery-controls-final-tests',reporter:[['list'],['json',{outputFile:'../out/gallery-controls-final-results.json'}]]});
