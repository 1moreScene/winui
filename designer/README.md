# WinUI Designer

独立的 React + TypeScript + Vite 页面设计器，与 `gallery/` 分开启动、构建和安装依赖，仅使用 `winui-wasm` 与 `winui-wasm/react` 公共入口。

设计器自身的控件也由 Rust/WASM WinUI 实现：按钮、工具箱、页签、搜索、文字、图标、属性输入、下拉框、复选框、颜色选择、工具提示、消息提示、滚动条和导出对话框。React/CSS 仅负责面板宿主布局和业务文档；编辑层通过 SDK `Thumb` 接收拖动事件。没有用 DOM/CSS 复刻 WinUI 控件。

工具面板和按钮样式选项使用基础样式的 `Segmented` 做互斥选择。吸附使用 `ToggleButton`，通用 `UiButton` 挂载普通 `Button`。设计器外壳遵循 SDK 默认控件模板、文字和主题资源，图标使用 WinUI `SymbolIcon` / `FontIcon` 与包内已核验的字体。

## 启动

已有 `packages/winui-wasm/dist` 构建产物时：

```powershell
cd designer
npm ci
npm run dev
```

打开 <http://localhost:5174/>。也可以在仓库根目录执行 `npm run dev:designer`。Gallery 使用 5173，设计器使用 5174，可以同时运行。

首次从源码运行，需要先按根 README 构建 Rust/WASM 与 npm SDK。修改 SDK 的 TypeScript/React 后，在设计器目录执行 `npm run sdk:local` 更新包；修改 Rust 后还需先重建 WASM。设计器不会在每次启动时自动编译 Rust。

```powershell
npm run typecheck
npm run build
npm run preview
npm test
```

生产输出为 `designer/dist`，预览端口 4174。Windows 浏览器测试默认使用已安装的 Microsoft Edge，其他平台默认 Chromium；可通过 `PW_CHANNEL` 指定浏览器。使用 Chromium 前需执行 `npx playwright install chromium`。

构建后可通过 `$env:DESIGNER_PREVIEW='1'; npm test` 在 Windows 上对生产产物运行同一套浏览器验证。

## 操作

- 左侧：在真实 WinUI TreeView 中折叠/展开分类，按 SDK 原名搜索、点击或拖入控件；切换到图层列表选择、隐藏或锁定图层。
- 中间：自由画布；移动组件、拖动右下角调整尺寸、8 px 吸附、缩放、适应画布。
- 右侧：编辑页面尺寸和主题，或选中控件的几何、文字、颜色、状态和专用属性；复杂的 items、columns、points 等数据使用 JSON 编辑，字段保留 SDK 名称；文字属性离开输入框时提交。
- 顶部：撤销/重做、导入 JSON、交互预览、导出 React TSX 或设计 JSON。
- 快捷键：Ctrl/Cmd+Z 撤销、Ctrl/Cmd+Shift+Z 或 Ctrl+Y 重做、Ctrl/Cmd+D 复制、方向键微调、Shift+方向键加速、Delete 删除、Esc 取消选择。输入框保留自己的编辑快捷键。

设计稿自动保存在浏览器的 `winui-designer.document.v1` localStorage 中；清理浏览器数据会移除草稿。下载 JSON 可备份并重新导入；非法、超限或重复 ID 的文档会拒绝导入，并保留当前设计。新建和导入都可撤销。

预览时直接操作真实 SDK 控件，运行时交互不写回设计稿；返回设计时重新挂载场景以恢复设计值。导出的 TSX 声明使用相同 SDK 属性和图层顺序，需要挂载在已初始化的 `WinUIProvider` 内，示例：

```tsx
import { createRoot } from 'react-dom/client';
import { WinUI } from 'winui-wasm';
import { WinUIProvider } from 'winui-wasm/react';
import { DesignedPage } from './DesignedPage';

const runtime = await WinUI.create();
createRoot(document.getElementById('root')!).render(
  <WinUIProvider runtime={runtime}><DesignedPage /></WinUIProvider>,
);
```

## 控件范围

目录覆盖 `references/control-origins.json` 中当前已导出的全部 **113 种** SDK 控件，按 12 个分类组织，名称直接使用 Button、TextBox、TreeView 等原名。包含布局、输入、集合、日期、导航、文字、图标、形状、反馈、滚动和命令。TableView 沿用项目既有社区实现；未实现的 Windows 系统能力不创建假控件。

所有目录项均进入同一套真实 SDK 创建、属性、JSON 和 React 导出管线；TSX 导出与画布共享声明树。ContentDialog、Popup、Flyout、ToolTip、菜单项和命令配有必要的原生触发按钮或宿主，在预览模式交互；TickBar 配有 Slider，RichTextBlockOverflow 配有文本来源，NavigationViewItem 配有 NavigationView。控件内部状态、布局、弹层和动画仍由 Rust 管理。

画布使用平铺的绝对布局。布局控件带有可运行的示例内容，当前暂不提供自由嵌套编排、多选、业务数据绑定、事件逻辑编辑或多页面工程。单页最多 500 个控件，页面尺寸为 320–3000 DIP，导入文件最多 2 MB。旧版九种控件设计稿可继续导入，自定义图层名称保留。

`tests/library.spec.ts` 对照公共 SDK 清单检查遗漏、逐项验证 Rust 节点的真实创建，并编译包含全部控件的导出 TSX。图标样例来源于 SDK 随包字体的 U+E73E 原始轮廓，来源和许可证见 `third_party/icon-fonts/coverage.json`、`source.json`。

唯一由应用直接创建的 HTML input 是隐藏的文件选择宿主；下载与剪贴板使用浏览器能力。可见输入与模态窗口均为 SDK 控件，SDK 内部用于 IME、剪贴板、无障碍的 DOM 投影仍由 SDK 管理。

2026-11-11 从 npm 官方注册表核实并精确安装：React/React DOM 19.3.1、TypeScript 7.0.2、Vite 8.3.7、React 插件 6.3.0、React 类型 19.3.0、Node 类型 26.6.6、Playwright 1.65.0；实际使用 Node 24.16.0。依赖锁文件为 `package-lock.json`，没有升级 Gallery 的依赖。
