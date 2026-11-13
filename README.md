# WinUI Rust/WASM SDK

[CommunityToolkit Segmented](http://127.0.0.1:5173/#segmented) 已接入 Rust、TypeScript 和 React。[API、来源和 MIT 许可证](docs/segmented.md)。

## Gallery

在线体验：[WinUI Gallery](https://1morescene.github.io/winui/)

## SDK 用法

生成可安装的本地 npm 包：

~~~powershell
npm run pack:sdk
~~~

然后在应用中安装生成的 `out/npm/winui-wasm-<version>.tgz`：

~~~powershell
npm install "D:/path/to/winui-wasm-<version>.tgz"
~~~

基础 TypeScript SDK：

~~~ts
import { WinUI, EventKind } from 'winui-wasm';

const ui = await WinUI.create();
const scene = ui.scene(document.querySelector('#app')!);
const button = scene.root.button({ text: 'Hello' });
const off = button.on(EventKind.Click, () => console.log('Clicked'));
off();
scene.dispose();
ui.dispose();
~~~

React：

~~~tsx
import { WinUIProvider, Button } from 'winui-wasm/react';

export function App() {
  return (
    <WinUIProvider>
      <Button text="Hello" onClick={() => console.log('Clicked')} />
    </WinUIProvider>
  );
}
~~~

包尚未发布到 npm，需使用本地 tarball；安装细节见 [npm SDK 用法](docs/npm-package.md)。
