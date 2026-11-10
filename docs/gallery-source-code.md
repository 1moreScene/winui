# Gallery 示例源码格式化与高亮

2026-11-09。Gallery 的 38 处块级源码展示统一使用 `gallery/src/SourceCode.tsx`，包括 React 示例、页面状态、初始化代码、项目模板和官方参考源码。展开源码后自动排版和着色，沿用真实 Rust Expander、ScrollViewer 与浏览器文本选择。

依赖已从 npm 官方 registry 核实并精确锁定：Prettier **3.9.10**、`@prettier/plugin-xml` **3.4.2**、Prism **1.30.0**、`@types/prismjs` **1.26.6**。实现使用 [Prettier 浏览器 API](https://prettier.io/docs/browser)、[官方 XML 插件](https://github.com/prettier/plugin-xml)和 [Prism](https://prismjs.com/)。

- React / TypeScript 通过 Prettier 的 `babel-ts` parser 排版；相邻 JSX 元素临时包在 Fragment 中解析，展示时移除包装。
- XAML 使用 XML 插件，保留文本节点和属性中的空白，调整标签布局与缩进。
- 官方 C# 保留原排版并高亮。不完整或混合语言的参考片段无法解析时，仍展示并高亮原始文本。
- Prism 只生成 token，React 渲染文本和 span，不插入源码 HTML。浅色、深色、高对比度与系统强制颜色分别适配。
- 格式化和高亮模块在源码首次挂载时加载；Prettier parser 按语言加载。缓存最多保留 128 段，异步结果不会覆盖已经切换的源码。

原始示例及 `extractSampleSource` 保持同一数据来源，格式化仅作用于展示文本。

## 验证

196 段带标记的运行示例通过格式化检查。新增 6 项检查及 9 项既有专项回归通过，覆盖相邻 JSX、解析失败回退、按需加载、源码切换、C# 高亮、三种主题与强制颜色、文本选择、真实 Expander 内容槽、双轴滚动、页面缓存和窄屏。浅色 / 深色 / 高对比度截图位于 `out/source-code/`。

```powershell
cd gallery
npm run typecheck
npx vite build --outDir ../out/gallery-source-code-preview --emptyOutDir
npx playwright test -c playwright.source-code.config.ts
```

本批修改前端展示；验证使用现有 Rust/WASM 产物。Rust 源码变更后仍需按项目常规流程重建 WASM。
