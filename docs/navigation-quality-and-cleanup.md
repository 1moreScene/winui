# Gallery 导航修复与原型清理

2026-11-08。应用导航继续使用已有 Rust NavigationView，通过公共 SDK / React 适配接入。没有引入另一套导航控件。

## 性能

旧 Gallery 导航在全视口 Canvas 上执行 Acrylic 背景模糊，鼠标移动也触发该路径。正文是外部 DOM，当前 Canvas 无法采样它，因此应用导航改用原生资源 fallback。Acrylic 控件示例本身保留。

本机 Chrome、Canvas2D、1440×1000、35 次指针移动的绘制计时，修改前平均新增帧约 95 ms，修改后约 0.69 ms。原始记录在 `out/navigation-performance/before.json` 和 `after.json`。这是 SDK 的绘制耗时，不代表跨设备帧率或端到端输入延迟。

## 指示条

此前只比较目标矩形，滚动或展开其他分组导致同一选中项移动时，也重启 600 ms 选中动画。现在同时跟踪选中容器身份：同一项位置变化携带现有时间线，不启动新的选中切换。跨缩进层级使用各自容器内的缩放，同级保留拉伸动画及快速反向行为。旧、新指示条分别按所属菜单或页脚裁剪，滚出可见区时隐藏，逻辑选中项保留。

行为依据固定 WinUI 源码中的 `AnimateSelectionChanged`、`PlayIndicatorAnimations` 和 `PlayIndicatorNonSameLevelAnimations`。未完成原生发行版 Composition 动画逐帧验收，不据此宣布完全一致。

## 非 WinUI 原型清理

移除唯一独立自造控件 InputProbe 的 React 导出、Panel 工厂、NodeKind、DOM 投影、Rust 分支和旧 composition/commit 协议。组合输入诊断改用真实 TextBox 与 EditorHost；保留 EditComposition 及正式编辑协议。

`node tools/check-control-origins.mjs` 审核 68 个运行时节点类型与 69 个 React 导出，记录在 `references/control-origins.json`。其中 66 个节点对应 WinUI 类型，两个为集合内部呈现节点；Provider、SceneView 等为宿主基础设施。该来源审计不代表所有控件已完整实现。历史验证文件保留当时的原型名称。

## 验证

结果与构建指纹见 `references/navigation-quality-validation.json`，页面布局验证另见 `references/sample-pages-validation.json`。

```powershell
cargo test --locked --test navigation_indicator --test navigation --test text_scroll
node tools/generate-enums.mjs --check
node tools/check-control-origins.mjs
node tools/prepare-gallery-page-validation.mjs
cd gallery
$env:GALLERY_PRODUCTION='1'
npx playwright test -c playwright.navigation-quality.config.ts
npx playwright test -c playwright.sample-pages.config.ts
$env:GALLERY_NAVIGATION_ROOT='../out/gallery-page-dev'
npx playwright test -c playwright.home-regression.config.ts
```

专项覆盖展开/滚动后的指示条位置、跨层级快速切换、绘制开销及真实浏览器 IME 草稿/提交；原有回归继续覆盖同级快速反向、主题、键盘、层级、溢出、取消与生命周期。

同一工作区另有并行 CommandBar 开发；全量 Rust 运行捕获该模块两项新增回归失败，保留在 `out/navigation-quality-full-rust-tests.log`。它不作为本批全量通过的证据，导航和 TextBox 另行执行专项验证。
