import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

// An isolated WASM build keeps parallel workspace builds from changing a test run.
export default defineConfig({root:process.env.WINUI_MOTION_ROOT,plugins:[react()],resolve:{alias:process.env.WINUI_MOTION_WASM?[{find:/^.*\/wasm\//,replacement:resolve(process.env.WINUI_MOTION_WASM).replaceAll('\\','/')+'/'}]:[]},server:{host:'127.0.0.1',strictPort:true}});
