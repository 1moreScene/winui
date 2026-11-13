import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WinUI } from 'winui-wasm';
import { WinUIProvider } from 'winui-wasm/react';
import { App } from './App';
import './style.css';

async function start() {
  const runtime = await WinUI.create();
  createRoot(document.getElementById('root')!).render(<StrictMode><WinUIProvider runtime={runtime}><App /></WinUIProvider></StrictMode>);
  window.addEventListener('pagehide', event => { if (!event.persisted) runtime.dispose(); });
}
start().catch(error => {
  const root = document.getElementById('root')!;
  root.className = 'startup-error';
  const title = document.createElement('h1'); title.textContent = '设计器加载失败';
  const description = document.createElement('p'); description.textContent = '请确认本地 SDK 已构建，在 designer 目录运行 npm run sdk:local 后重试。';
  const details = document.createElement('pre'); details.textContent = String(error);
  root.replaceChildren(title, description, details);
});
