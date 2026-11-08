import {defineConfig} from '@playwright/test';
import base from './playwright.collections.config';
import {collectionEvidencePrefix as prefix} from './collection-validation-paths';
export default defineConfig({...base,testMatch:['**/text-scroll.spec.ts','**/global-scrollbars.spec.ts'],outputDir:`../out/${prefix}-scroll-host-results`,reporter:[['list'],['json',{outputFile:`../out/${prefix}-scroll-host-results.json`}]]});
