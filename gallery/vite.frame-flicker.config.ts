import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

// Validate a frozen Rust build without replacing another session's generated SDK.
const wasm=resolve(process.env.FRAME_FLICKER_WASM??'../out/frame-flicker-sdk');
export default defineConfig({plugins:[react()],resolve:{alias:[
 {find:'./wasm/winui',replacement:resolve(wasm,'winui.js')},
 {find:'./wasm/winui_bg.wasm?url',replacement:resolve(wasm,'winui_bg.wasm')+'?url'},
 {find:'./wasm/build-stamp.json',replacement:resolve(wasm,'build-stamp.json')},
]},build:{outDir:'../out/frame-flicker-preview',emptyOutDir:true,rollupOptions:{input:{
 gallery:resolve('index.html'),frame:resolve('tests/fixtures/frame-flicker.html'),navigation:resolve('tests/fixtures/navigation-host.html'),
}}}});
