import { defineConfig } from '@playwright/test';
import base from './playwright.home.config';

export default defineConfig({
  ...base,
  expect: { timeout: 10_000 },
  testMatch: ['source-code.spec.ts', 'button-source.spec.ts', 'gallery-controls.spec.ts', 'view-commands.spec.ts'],
  grep: /formatting supports|compressed running|source tokens|official C#|Button source panels|Source content|Code horizontal|narrow source layout|public React API, live examples/,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5229' },
  outputDir: '../out/source-code-tests',
  reporter: [['list'], ['json', { outputFile: '../out/source-code-results.json' }]],
  webServer: {
    command: 'npm run preview -- --outDir ../out/gallery-source-code-preview --port 5229 --strictPort',
    url: 'http://127.0.0.1:5229', reuseExistingServer: false,
  },
});
