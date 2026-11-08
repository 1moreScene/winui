import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:['**/stages.spec.ts','**/animated-icons.spec.ts','**/vectors.spec.ts','**/overlays.spec.ts','**/text-scroll.spec.ts','**/global-scrollbars.spec.ts'],outputDir:'../out/compact-regression-test-results',reporter:[['list'],['json',{outputFile:'../out/compact-regression-browser-results.json'}]]});
