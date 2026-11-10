import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'**/rich-edit.spec.ts',reporter:[['list'],['json',{outputFile:'../out/rich-edit-browser-results.json'}]]});
