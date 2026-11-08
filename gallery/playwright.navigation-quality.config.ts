import { defineConfig } from '@playwright/test';
import base from './playwright.home.config';
export default defineConfig({ ...base, testMatch:['navigation-quality.spec.ts','stages.spec.ts'],
  grep:/navigation quality|real browser composition/, outputDir:'../out/navigation-quality-tests',
  reporter:[['list'],['json',{outputFile:'../out/navigation-quality-results.json'}]],
});
