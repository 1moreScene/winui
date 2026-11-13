import { defineConfig } from '@playwright/test';

const production = process.env.DESIGNER_PREVIEW === '1';
const url = `http://127.0.0.1:${production ? 4174 : 5174}`;

export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  use: {
    channel: process.env.PW_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : 'chromium'), baseURL: url,
    viewport: { width: 1440, height: 1000 }, colorScheme: 'light',
    screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  reporter: 'list',
  webServer: { command: production ? 'npm run preview' : 'npm run dev', url, reuseExistingServer: !process.env.CI },
});
