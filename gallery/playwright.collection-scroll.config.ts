import {defineConfig} from '@playwright/test';
import base from './playwright.collections.config';
import {collectionEvidencePrefix as prefix} from './collection-validation-paths';
export default defineConfig({...base,testMatch:'**/collection-scroll.spec.ts',outputDir:`../out/${prefix}-scroll-results`,reporter:[['list'],['json',{outputFile:`../out/${prefix}-scroll-${process.env.PW_CHANNEL??'chrome'}-results.json`}]]});
