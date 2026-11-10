import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['font-portability.spec.ts', 'portable-icons.spec.ts', 'icon-font-policy.spec.ts'],
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5410',
    viewport: {width: 1440, height: 1000},
    screenshot: 'only-on-failure',
  },
  projects: [
    {name: 'chrome', use: {browserName: 'chromium', channel: process.env.PW_CHANNEL ?? 'chrome'}},
    {name: 'webkit', testIgnore: 'portable-icons.spec.ts', use: {
      browserName: 'webkit',
      launchOptions: process.env.PW_WEBKIT_EXECUTABLE ? {executablePath: process.env.PW_WEBKIT_EXECUTABLE} : {},
    }},
  ],
  reporter: [['list']],
  outputDir: '../out/font-portability',
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --port 5410',
    url: 'http://127.0.0.1:5410',
    reuseExistingServer: !process.env.CI,
  },
});
