# 独立 npm SDK

SDK 的唯一源码位于 `packages/winui-wasm/src/`。Rust 控件和渲染仍位于根目录 `src/`，编译后的 WASM 由该包封装。Gallery 不再包含 `sdk.ts`、`scene.ts`、`react.tsx`、`enums.ts`、宿主模块、类型模块或 WASM 目录，也不通过相对路径、源码 URL、TS paths 或 Vite alias 调用另一套 SDK。

公开入口：

```ts
import {WinUI, RendererBackend, ButtonVariant} from 'winui-wasm';
import {WinUIProvider, SceneView, Button} from 'winui-wasm/react';
```

包提供 ESM JavaScript、`.d.ts`、预编译 WASM、内置图标字体、共享宿主 CSS 和完整许可证。类型声明保留原有类型结构及 `@internal` 标记，内部标记不代表稳定公共承诺。基础入口没有 React 运行时依赖；React 入口使用应用提供的可选 React 19 peer。网页背景采样适配依赖的 html2canvas 由包声明并自动安装。

消费者无需复制任何 TS SDK，不需要安装 Rust、wasm-bindgen、配置 SDK 源码别名、手工复制字体/WASM 或编写初始化桥接。`WinUI.create()` 自动安装宿主样式、加载字体并初始化 WASM；React Provider 使用同一 SDK。应用仍负责容器大小、业务数据、事件回调及拥有者卸载时的 `dispose()`。当前验收针对浏览器；服务端不执行 DOM 初始化，React 渲染入口应放在客户端。

## 图标字体策略（0.1.1）

Windows 优先引用本机 Segoe Fluent Icons，回退到 Segoe MDL2 Assets；缺字、未安装或浏览器禁用本地字体时使用随包的开源 `WinUI Portable Icons`。其他平台使用开源替代。所有注册名称均为 SDK 自有名称，不覆盖系统字体名称，不随包分发 Windows 字体。普通字体及自定义图标字体保持调用方选择。详细实现与验收见 [图标记录](icons.md)。

## 本地开发

```powershell
npm --prefix packages/winui-wasm install
cd gallery
npm install
npm run dev
```

Gallery 的依赖为 `"winui-wasm": "file:../packages/winui-wasm"`。npm 本地链接指向包，所有调用均使用公开入口；开发前先构建包的 JS 和声明。Vite 仅为本仓库链接包允许读取该包的 `dist`，并共用 Gallery 的 React/html2canvas 依赖。实际第三方消费者使用普通安装，无需这些本地链接设置。

```powershell
npm run typecheck       # 重建本地 SDK、来源检查、包边界检查、Gallery 类型检查
npm run build:local     # 使用已有 WASM 构建 SDK 和 Gallery，供本地验收
npm run test:package    # 实际 npm pack、独立安装、类型及浏览器验证
```

SDK 开发者修改 Rust 后需更新 `packages/winui-wasm/src/wasm/` 中的生成产物，再构建包。`tools/build-wasm.mjs` 默认输出已改到此处；枚举生成、图标生成、来源与资源检查也以包目录为唯一目标。消费包的应用不执行这些步骤。SDK `dist` 与 WASM 生成目录由 Git 忽略，源码的生成器和固定输入保留在仓库中。

## 生成 npm 安装包

在项目根目录执行：

```powershell
npm run pack:sdk
```

命令复用已有的、通过指纹校验的 WASM，执行 SDK 的发行 `prepack` 校验，重新生成 JavaScript 和类型声明，然后输出 `out/npm/winui-wasm-<version>.tgz`，同时生成同名 `.tgz.json` 文件记录 SHA-256、版本和大小。包包含普通 SDK、React 适配、WASM、字体和许可证。此命令仅生成本地包，不发布到 npm。

Rust 源码改动后，使用完整构建命令，先通过项目原有流程重新编译 WASM，再打包：

```powershell
npm run pack:sdk:full
```

完整构建需要项目原有的 Rust/WASM 工具链和固定参考输入。仅修改 TypeScript/React SDK 时直接使用 `pack:sdk` 即可。SDK 构建依赖首次通过 `npm install --prefix packages/winui-wasm` 安装。

自定义输出位置（相对路径按当前工作目录解析）：

```powershell
npm run pack:sdk -- --out-dir ./out/release
```

在其他项目中安装生成的文件：

```powershell
npm install "D:/vscode/winui/out/npm/winui-wasm-0.1.1.tgz"
```

文件名中的版本来自 `packages/winui-wasm/package.json`。打包脚本同时检查必要入口、WASM、声明和许可证已入包，并拒绝混入 Rust 或 TypeScript 实现源码。

## 实际独立消费验证

`tools/test-sdk-package.mjs` 生成一个 npm `.tgz`，随后在新的隔离目录建立普通 TypeScript 与 React 两个项目。它们使用普通 `npm install` 安装实际 tarball，安装目录不是源码链接；普通项目连 React 都未安装。没有消费侧 SDK 复制、SDK 源码 alias 或专用 Vite 插件。包不包含 Rust 工程和 TypeScript 实现源文件，安装生命周期不编译 Rust。

两项目均执行：

- 从已安装的 `.d.ts` 类型检查正常接口及非法裸字符串枚举负例。
- `/nested/` 子路径下的开发服务器和真实生产构建/预览。
- Canvas2D / WebGL2 实际绘制、按钮回调、中文文本输入、自动字体和样式加载。
- 命令式销毁，或 React StrictMode 下卸载、重挂载；页面无运行时异常。

结果及 tarball 路径/SHA-256 在 `references/validation/npm-package-consumers.json`，隔离项目、锁文件、构建、截图及 tarball 留在该记录所指的 `out/npm-consumers-*` 目录。本次验证使用本机 Windows Chrome 和项目锁定的 Vite；它不是所有浏览器/打包器的兼容性保证。

Gallery 另有独立包边界检查 `npm run check:package-boundary`，会拒绝把 SDK 实现重新放回 Gallery 或使用非公开 SDK 路径。

## 发布状态

当前包为 `private: true`，**没有发布到 npm**。`SDK-PREVIEW-001` 已通过固定 MIT 源码重新生成模板、画刷和运行时契约解除；历史预览包许可证不再作为运行时组件分发。

默认 SDK/Gallery 发行构建、npm `prepack` 和 `prepublishOnly` 校验真实 MIT 输入及发行附件。`--local` 只执行文件检查；可分发性应以完整发行门禁及用途审查为准。打包成功不会自动发布包。参见 [资源授权审计](resource-licensing.md)。
