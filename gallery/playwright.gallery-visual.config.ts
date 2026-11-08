import {defineConfig} from '@playwright/test';
import base from './playwright.gallery-controls.config';
export default defineConfig({...base,testMatch:'gallery-visual.spec.ts',outputDir:'../out/gallery-visual-tests',reporter:[['list'],['json',{outputFile:'../out/gallery-visual-results.json'}]]});
