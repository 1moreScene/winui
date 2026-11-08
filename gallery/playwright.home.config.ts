import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'home.spec.ts', workers: 1,
  use: { channel: process.env.PW_CHANNEL ?? 'chrome', baseURL: 'http://127.0.0.1:5217',
    viewport: { width: 1440, height: 1000 }, colorScheme: 'light', deviceScaleFactor: 1,
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  outputDir: '../out/home-tests',
  reporter: [['list'], ['json', { outputFile: '../out/home-test-results.json' }]],
  webServer: { command: process.env.GALLERY_PRODUCTION === '1' ? 'npm run preview -- --outDir ../out/gallery-page-preview --port 5217' : 'npm run dev -- --port 5217', url: 'http://127.0.0.1:5217', reuseExistingServer: false },
});
