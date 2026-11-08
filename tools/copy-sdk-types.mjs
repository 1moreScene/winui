import { copyFileSync, mkdirSync } from 'node:fs';
const target = new URL('../gallery/dist/sdk-types/wasm/', import.meta.url);
mkdirSync(target, { recursive: true });
copyFileSync(new URL('../gallery/src/wasm/winui.d.ts', import.meta.url), new URL('winui.d.ts', target));
