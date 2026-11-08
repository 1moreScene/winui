import {defineConfig} from '@playwright/test';
import base from './playwright.navigation-controls.config';
export default defineConfig({...base,testMatch:'**/navigation-controls-visual.spec.ts',outputDir:'../out/navigation-controls-visual-results',reporter:[['list'],['json',{outputFile:'../out/navigation-controls-visual-results.json'}]]});
