import{collectionEvidencePrefix as evidencePrefix}from'./collection-validation-paths';
import{defineConfig}from'@playwright/test';import base from'./playwright.config';
export default defineConfig({...base,use:{...base.use,baseURL:process.env.WINUI_COLLECTION_TEST_URL??base.use?.baseURL},webServer:process.env.WINUI_COLLECTION_TEST_URL?undefined:base.webServer,testMatch:'**/collections.spec.ts',outputDir:`../out/${evidencePrefix}-test-results`,reporter:[['list'],['json',{outputFile:`../out/${evidencePrefix}-browser-results.json`}]]});
