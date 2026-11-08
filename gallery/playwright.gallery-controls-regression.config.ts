import {defineConfig} from '@playwright/test';
import base from './playwright.home-regression.config';
export default defineConfig({...base,testMatch:['navigation.spec.ts','global-scrollbars.spec.ts'],outputDir:'../out/gallery-controls-regression',reporter:[['list'],['json',{outputFile:'../out/gallery-controls-regression-results.json'}]]});
