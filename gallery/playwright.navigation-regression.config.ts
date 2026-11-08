import {defineConfig} from '@playwright/test';
import base from './playwright.navigation-controls.config';
export default defineConfig({...base,use:{...base.use,deviceScaleFactor:1},testMatch:['**/overlays.spec.ts','**/collections.spec.ts','**/collections-advanced.spec.ts','**/collection-drag-stress.spec.ts','**/collection-scroll.spec.ts'],outputDir:'../out/navigation-controls-regression',reporter:[['list'],['json',{outputFile:'../out/navigation-controls-regression-results.json'}]]});
