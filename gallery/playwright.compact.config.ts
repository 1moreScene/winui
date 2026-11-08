import{defineConfig}from'@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'**/compact-controls.spec.ts',outputDir:'../out/compact-controls-test-results',reporter:[['list'],['json',{outputFile:'../out/compact-controls-browser-results.json'}]]});
