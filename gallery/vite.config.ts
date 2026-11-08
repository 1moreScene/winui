import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { watch } from 'node:fs';
export default defineConfig({ plugins: [react(),{
  name:'rust-wasm-reload',configureServer(server){
    // Generated glue is outside Vite's normal module watch path. Windows watch
    // paths may also differ in slash form. Observe the completed-build sentinel
    // directly and invalidate transformed glue before announcing a reload.
    const watcher=watch(fileURLToPath(new URL('./src/wasm/',import.meta.url)),(_event,file)=>{
      if(file?.toString()!=='build-stamp.json')return;
      server.moduleGraph.invalidateAll();server.ws.send({type:'full-reload'});
    });
    server.httpServer?.once('close',()=>watcher.close());
  },
}], server: { host: '127.0.0.1', port: 5173, strictPort: true } });
