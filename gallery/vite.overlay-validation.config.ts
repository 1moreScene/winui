import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'../out/overlay-validation/gallery',plugins:[react()],server:{host:'127.0.0.1',port:Number(process.env.OVERLAY_VALIDATION_PORT??5186),strictPort:true,hmr:false}});

