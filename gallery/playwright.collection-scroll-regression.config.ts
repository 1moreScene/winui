import {defineConfig} from '@playwright/test';
import base from './playwright.collections.config';
import {collectionEvidencePrefix as prefix} from './collection-validation-paths';
export default defineConfig({...base,testMatch:['**/collections.spec.ts','**/collections-advanced.spec.ts','**/collection-drag-stress.spec.ts'],outputDir:`../out/${prefix}-scroll-regression-results`,reporter:[['list'],['json',{outputFile:`../out/${prefix}-scroll-regression-results.json`}]]});
