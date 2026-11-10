import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'page-loading.spec.ts', workers: 1,
  timeout: 90_000, expect: { timeout: 15_000 },
  use: { channel: process.env.PW_CHANNEL ?? 'chrome', baseURL: 'http://127.0.0.1:5229',
    viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.25, colorScheme: 'light',
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  outputDir: '../out/page-loading-tests',
  reporter: [['list'], ['json', { outputFile: '../out/page-loading-results.json' }]],
  webServer: { command: process.env.GALLERY_PRODUCTION === '1'
    ? 'npm run preview -- --port 5229' : 'npm run dev -- --port 5229',
    url: 'http://127.0.0.1:5229', reuseExistingServer: false },
});
