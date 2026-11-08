import{defineConfig}from'@playwright/test';import base from'./playwright.composed.config';
process.env.WINUI_COMPOSED_EVIDENCE='composed-webkit';
export default defineConfig({...base,outputDir:'../out/composed-webkit-artifacts',use:{...base.use,browserName:'webkit',channel:undefined,baseURL:'http://127.0.0.1:5397'},reporter:[['list'],['json',{outputFile:'../out/composed-webkit-results.json'}]],webServer:{command:'node node_modules/vite/bin/vite.js --config vite.composed-validation.config.ts --port 5397',url:'http://127.0.0.1:5397',reuseExistingServer:false}});
