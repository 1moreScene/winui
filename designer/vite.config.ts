import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'html2canvas'] },
  server: {
    port: 5174, strictPort: true,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../packages/winui-wasm/dist/', import.meta.url))] },
  },
  preview: { port: 4174, strictPort: true },
});
