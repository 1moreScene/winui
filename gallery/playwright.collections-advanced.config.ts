import{collectionEvidencePrefix as evidencePrefix}from'./collection-validation-paths';
import{defineConfig}from'@playwright/test';import base from'./playwright.collections.config';
export default defineConfig({...base,testMatch:'**/collections-advanced.spec.ts',outputDir:`../out/${evidencePrefix}-advanced-test-results`,reporter:[['list'],['json',{outputFile:`../out/${evidencePrefix}-advanced-browser-results.json`}]]});
