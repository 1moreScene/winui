import { defineConfig } from '@playwright/test';
import base from './playwright.home.config';

export default defineConfig({ ...base, testMatch: ['home.spec.ts', 'sample-pages.spec.ts', 'button-source.spec.ts'],
  outputDir: '../out/sample-page-tests', reporter: [['list'], ['json', { outputFile: '../out/sample-page-results.json' }]],
});
