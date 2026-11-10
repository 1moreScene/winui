import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:['**/rich-edit.spec.ts','**/rich-edit-formats.spec.ts'],timeout:60000,outputDir:'../out/rich-edit-formats/playwright',reporter:[['list'],['json',{outputFile:'../out/rich-edit-formats-browser-results.json'}]]});
