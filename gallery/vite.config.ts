import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { watch } from 'node:fs';
import {galleryAssetBase} from './asset-base-plugin.mjs';
export default defineConfig({ plugins: [react(),galleryAssetBase(),{
  name:'rust-wasm-reload',configureServer(server){
    // Generated glue is outside Vite's normal module watch path. Windows watch
    // paths may also differ in slash form. Observe the completed-build sentinel
    // directly and invalidate transformed glue before announcing a reload.
    const watcher=watch(fileURLToPath(new URL('../packages/winui-wasm/dist/',import.meta.url)),(_event,file)=>{
      if(file?.toString()!=='package-build.json')return;
      server.moduleGraph.invalidateAll();server.ws.send({type:'full-reload'});
    });
    server.httpServer?.once('close',()=>watcher.close());
  },
}], resolve: {dedupe: ['react', 'react-dom', 'html2canvas']}, server: { host: '0.0.0.0', port: 5173, strictPort: true,
  fs: {allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../packages/winui-wasm/dist/', import.meta.url))]},
}, preview: { host: '0.0.0.0', port: 4173, strictPort: true } });
