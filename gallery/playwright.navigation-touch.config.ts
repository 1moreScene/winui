import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'navigation-touch.spec.ts',outputDir:'../out/navigation-touch/artifacts',reporter:[['list'],['json',{outputFile:'../out/navigation-touch/results.json'}]]});
