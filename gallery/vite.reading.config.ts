import {defineConfig,mergeConfig} from 'vite';
import base from './vite.config';
export default mergeConfig(base,defineConfig({build:{outDir:'../out/reading-production',manifest:true,rollupOptions:{input:{gallery:'index.html',sdkFixture:'tests/reading-sdk-fixture.ts'}}}}));
