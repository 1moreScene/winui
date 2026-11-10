# Gallery 控件示例页

沿用固定官方 Gallery `7360ac322414e118eadfb0c7c2f4ecc31a218f59`，这批调整公共页面布局和已有示例的呈现，不据此宣称底层控件已达到完整原生等价。

## 页面与导航

应用导航直接挂载现有 React `NavigationView`，对应 `sdk.navigationView` 和 Rust `src/navigation.rs`，没有另写导航控件。Gallery 只提供官方目录数据和路由映射；层级展开、点击和键盘选择、指示条、菜单滚动、Settings 和 Auto 自适应模式均由已有实现负责。标题栏按钮调用同一公共 controller 更新侧栏状态。

`NavigationView.onSnapshot` 和 React `onSnapshot` 回调投影 Rust 的 `pane`、`content` 几何；DOM 内容区沿用这些尺寸，避免再维护一份导航宽度和断点算法。侧栏覆盖时，DOM 遮罩的关闭动作也提交给同一个 controller。滚动条继续使用项目统一的 Rust ScrollViewer 宿主适配。

公共页头按 `Pages/ItemPage.xaml` 和 `Controls/PageHeader.xaml` 组织：24px 顶部留白、36px 水平边距、28px 标题，第二行 Documentation / Source 菜单及主题、复制链接、收藏。Namespace / Inheritance 从同一官方目录提取。源链接只使用本机确实存在的固定提交示例路径，其他项目回到上游 Samples 目录。

页头固定，说明文字与示例在独立内容区滚动。说明直接来自官方目录，每页只显示一份。窄屏边距采用官方的 16px。主题在示例与应用外壳之间共享；搜索时保持既有示例挂载和内部状态。

## 页面异步加载

示例页统一通过 React `lazy` / 动态 `import()` 按需加载，包括 NavigationView、Button 和材质页；同一文件中的示例继续共享模块缓存。首页、目录和设置保留在应用外壳中。

`App.tsx` 使用统一的 `Suspense` 边界，等待期间由 `GalleryPageLoading` 挂载已有 Rust SDK `ProgressRing`，替代原先可见的 `Loading controls…` 等文字。圆环为 32 DIP、不确定进度，沿用页面主题、系统减少动画策略与 Frame 活动状态；React 只负责异步模块和挂载，Rust 负责圆环绘制与动画。加载完成后卸载占位场景，已缓存的页面继续沿用 Frame 生命周期。

这里异步的是页面模块下载与导入；WASM 控件创建和布局仍在浏览器主线程执行，没有迁移到 Worker。

`gallery/tests/page-loading.spec.ts` 延迟真实模块请求，验证圆环动画、Canvas2D / ARIA、首页不提前加载页面模块、加载后的真实示例，以及加载期间返回/前进、深色/高对比度、减少动画和占位场景释放：

```powershell
cd gallery
npx playwright test -c playwright.page-loading.config.ts
# 已构建 gallery/dist 时，可设置 $env:GALLERY_PRODUCTION='1' 验证生产产物。
```

2026-11-09 验证：Rust/WASM release 编译、类型检查、来源边界检查、Vite 生产打包和 SDK 类型声明生成通过；开发环境与生产包各通过 6 项加载专项，首页/搜索/示例往返的 3 项现有回归通过。额外的全目录导航回归在 `gallery-navigation-helper.ts` 等待侧栏滚动偏移变化时超时，未将全目录导航标为通过。三种主题的加载截图保存在 `out/page-loading-tests/`。

## 示例卡片

标题栏的 Subtle 语言按钮在英文界面显示“中文”，切换后显示“English”。语言选择保存到 `winui-gallery.language`，刷新后沿用；首次访问保留英文默认值。`GalleryLanguageProvider` 和 `LocalizedText` 在 React 渲染阶段选择说明文字，不修改 SDK 绘制、示例代码、控件名或 API 标识符。切换语言不重新挂载页面控件。

中文词条保存在 `gallery/src/gallery-zh.json`，包含页面描述、示例标题及操作说明。`npm run check:translations` 检查固定官方数据中的说明和标题覆盖，已纳入 `npm run typecheck`；`npx playwright test -c playwright.language.config.ts` 验证实际语言按钮、控件名称保留、语言持久化和窄屏布局。

按照 `Controls/ControlExample.xaml` 与 `Styles/Grid.xaml` 调整共有样式：14px 示例标题、12px 预览内边距、16px Options / Output 内边距、8px 圆角、原生主题背景和分隔线、48px 源码折叠头。输出在预览与选项之间排列，窄屏转换为纵向布局。

Button 的四个示例标题使用官方资源，预览高度由 Rust 实际 Measure 结果计算，初始输出留空；额外的 ClickMode 配置位于四个官方示例之后的 Additional Button options 中。普通 SDK / React 的真实调用仍显示在各自源码面板。

Popup、ToolTip、Flyout、MenuFlyout、Slider 的各个导航入口只显示对应控件的示例；原 `#overlays` 保留为汇总调试入口。Shape 和 Line 按各自官方页面分组，Line 使用直线、折线、路径的原始顺序。其他已有页面统一公共页头、描述和卡片样式，保留各自真实 SDK 示例及选项。

未实现项目继续保留目录及占位页。遵循仓库范围约定，官方 TableView、Chart、Sound、WebView2、MapControl、InkCanvas / InkToolbar 标为“范围外（不实现）”，不计入待实现控件。

## 可复查的验证

来源文件及资产指纹见 `references/home-source.json`。最终测试、构建和截图指纹见 `references/sample-pages-validation.json`。

```powershell
cd gallery
npm run typecheck
npm run declarations
cd ..
node tools/prepare-gallery-page-validation.mjs
cd gallery
$env:GALLERY_PRODUCTION='1'
npx playwright test -c playwright.sample-pages.config.ts
$env:GALLERY_NAVIGATION_ROOT='../out/gallery-page-dev'
npx playwright test -c playwright.home-regression.config.ts
```

生产验收使用独立的 `out/gallery-page-preview` 和端口 5217；NavigationView 原有回归使用源文件快照、关闭热重载和端口 5199，避免共享工作区中的并行编辑/构建改变正在测试的文件。

2026-11-08 最终检查：14 项生产页面/源码检查和 11 项 NavigationView 原有回归全部通过；实际点击当前 57 个已实现入口，官方目录的其余 63 项保留待实现占位，6 项明确标为范围外。类型检查、生产构建和类型声明生成通过。`node tools/record-gallery-page-validation.mjs` 记录测试结果、产物与源快照指纹，并校验测试结束时的当前 WASM 和 Gallery dist。

验证覆盖全部已实现目录入口的真实指针点击、真实 Rust 导航与卸载、页头几何与滚动固定、文档/源码菜单、Button 输出和源码、三种主题、1440/900/390px 宽度、控件示例分组、占位与范围外项目、快照订阅取消。截图包括 `out/sample-page-button-Light.png`、`out/sample-page-button-Dark.png`、`out/sample-page-button-HighContrast.png`、`out/sample-page-button-scrolled.png` 和 `out/sample-page-textbox-390.png`。

本批没有完成同条件原生发行版窗口逐像素截图比较，也没有以 CSS 背景宣称实现 Windows Composition Mica / Acrylic。

导航绘制开销、指示条状态/动画修复及非 WinUI 原型清理见 [导航质量与清理](navigation-quality-and-cleanup.md)。

HTML Options 控件替代、真实 Expander 内容槽及源码滚动条的后续修正见 [Gallery 控件接入](gallery-controls.md)，当前界面来源检查以该批记录为准。
