import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export default defineConfig({root:'../out/composed-validation/gallery',plugins:[react()],server:{host:'127.0.0.1',port:5296,strictPort:true,hmr:false}});
