import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WinUI } from 'winui-wasm';
import { WinUIProvider } from 'winui-wasm/react';
import { App } from './App';
import './style.css';

const started = performance.now();
const sdk = await WinUI.create();
Object.assign(window, { gallery: { sdk, views: [], readyMs: performance.now() - started,
  create: sdk.navigationView.bind(sdk) } });
createRoot(document.getElementById('app')!).render(<StrictMode><WinUIProvider runtime={sdk}><App sdk={sdk} /></WinUIProvider></StrictMode>);
window.addEventListener('pagehide', () => sdk.dispose(), { once: true });
