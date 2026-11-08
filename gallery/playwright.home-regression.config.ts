import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({ ...base, testMatch: '**/navigation.spec.ts',
  use: { ...base.use, channel: process.env.PW_CHANNEL ?? 'chrome', baseURL: 'http://127.0.0.1:5199' },
  webServer: { command: 'npx vite --config vite.home-validation.config.ts', url: 'http://127.0.0.1:5199', reuseExistingServer: false },
  outputDir: '../out/home-navigation-regression',
  reporter: [['list'], ['json', { outputFile: '../out/home-navigation-regression-results.json' }]],
});
