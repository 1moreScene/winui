import {defineConfig} from '@playwright/test';
import base from './playwright.config';
// Keep concurrent phase-7 test artifacts separate from this batch.
export default defineConfig({...base,testIgnore:'**/overlays.spec.ts',outputDir:'../out/stage6-test-results',reporter:[['list'],['json',{outputFile:process.env.WINUI_STAGE6_REPORT??'../out/stage6-browser-results.json'}]]});
