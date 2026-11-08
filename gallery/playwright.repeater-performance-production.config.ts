import {defineConfig} from '@playwright/test';
import base from './playwright.repeater-refresh-production.config';
export default defineConfig({...base,testMatch:['repeater-refresh-production.spec.ts','repeater-performance.spec.ts'],reporter:[['list'],['json',{outputFile:'../out/repeater-performance-production-results.json'}]]});
