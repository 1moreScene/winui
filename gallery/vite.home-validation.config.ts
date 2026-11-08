import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Stable interaction runs while other sessions may rebuild WASM in this workspace.
export default defineConfig({ root: process.env.GALLERY_NAVIGATION_ROOT ?? '.', plugins: [react()], server: {
  host: '127.0.0.1', port: 5199, strictPort: true, hmr: false,
} });
