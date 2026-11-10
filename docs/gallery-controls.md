# Gallery 交互控件与源码容器

2026-11-08。此前只按 SDK 导出和 NodeKind 清理自造控件，遗漏了 Gallery 外壳及 Options 中的 HTML 控件。现在同时审计应用 JSX 与浏览器中实际挂载的控件。

## 控件接入

原应用中 66 处 input、45 处 select、64 处 button 和 34 处 details 均已迁移。Checkbox、下拉选择、数字输入、文本输入、滑块、单选、操作按钮和折叠头分别使用现有 CheckBox、ComboBox、NumberBox、TextBox、Slider、RadioButton、Button / ToggleButton、Expander。文档和源码菜单使用现有 DropDownButton / MenuFlyout，API 信息使用 Flyout；首页 Recent / Favorites 使用官方同类的 SelectorBar。

`gallery/src/GalleryControls.tsx` 是应用挂载适配：提供小尺寸 SceneView、主题和业务值回调，把声明式选项转换为已有 ComboBox 的数据。它不绘制控件，也不实现另一份选中、展开、键盘或弹层状态机。无障碍 DOM 和透明编辑宿主仍由 SDK 创建；它们是 Rust 控件的平台投影，不是可见的 HTML 替代控件。

静态检查 `node tools/gallery-control-source.mjs --check` 禁止应用 JSX 再出现 input / select / textarea / button / details / summary / option 控件替代。`check-control-origins.mjs` 同时执行这项检查，避免只审查 SDK 导出就宣称 Gallery 清理完成。Gallery 的文字、代码、布局和导航链接仍使用 DOM。

## 源码属于一个真实 Expander

源码区不再由折叠头与外部兄弟节点拼接。`Expander.setContentHost(element)` 创建一个真实的 Rust Border 子布局槽，把 DOM 正文挂入该子节点的投影。浏览器只报告正文自然高度；Expander 的内容排列、展开状态、动画和裁剪均由原有 Rust 实现管理。React 通过 portal 把源码切换按钮、说明和 pre/code 放进这个内容宿主。

Button、Collections 和 Effects 原有嵌套折叠层已展开为同一内容区内的说明段落。每个示例源码只有一个 Expander。正文首次展开时挂载，折叠后保留；控件卸载时释放尺寸观察、DOM 绑定和 SDK 子节点。

## 源码滚动条

pre/code 保留浏览器文本选择和原生内容滚动，滚动条由现有 Rust ScrollViewer 托管。全局发现逻辑现在允许显式 `data-winui-content-host` 内的应用 DOM，同时继续跳过嵌套 SDK 控件自己的投影。矩形 inset 裁剪与 Rust 展开动画的投影变化会同步更新滚动条位置和可见区域。只有接入成功的区域才隐藏浏览器滚动条。

另外修复了在 32 DIP 行内宿主中使用 ComboBox 时，弹层被小 Canvas 高度限制的问题。组合选择弹层按窗口 viewport 测量；只读输入主体的鼠标点击由 Rust 处理。Scene 的可选 `autoWidth` 根据 Rust 测量结果安排行内宿主宽度。

## 验证

完整结果与产物指纹在 `references/gallery-controls-validation.json`，逐页来源检查在 `out/gallery-controls/page-audit.json`。测试使用独立的 `out/gallery-controls-preview` / `out/gallery-controls-dev`，防止其他构建覆盖正在运行的资源。

```powershell
node tools/gallery-control-source.mjs --check
node tools/check-control-origins.mjs
$env:GALLERY_VALIDATION_NAME='gallery-controls'
node tools/prepare-gallery-page-validation.mjs
cd gallery
npm run typecheck
npm run declarations
npx playwright test -c playwright.gallery-controls.config.ts
npx playwright test -c playwright.gallery-controls-pages.config.ts
$env:GALLERY_NAVIGATION_ROOT='../out/gallery-controls-dev'
npx playwright test -c playwright.gallery-controls-regression.config.ts
```

覆盖真实 Checkbox / ComboBox 鼠标和键盘、全部已实现页面的控件来源、源码在 Rust Expander 中的父子关系与布局、三种主题的横纵滚动、首页 SelectorBar、窄屏及缓存页面生命周期。源码双轴测试临时使用长文本以保证出现两条滚动轴，不改变生产示例。

本批基线通过 36 项浏览器检查、69 项 Rust 专项，逐页检查 57 个已实现入口。此后针对并行 Frame 更新及当前 WASM 构建，另执行 4 项核心界面复核，使用独立 `gallery-controls-final` 产物；其指纹与当前工作区的比较单独记录。

该记录验证实现来源和浏览器行为，不代表同条件原生发行版窗口的逐像素或 Composition 逐帧验收。

后续搜索框、卡片按钮、图标命中区与 SDK 场景默认底色修复见 [Gallery 宿主样式与透明背景](gallery-visual-consistency.md)。

## 2026-11-09：导航遮罩归属 Rust SDK

首页与 NavigationView + Frame 示例不再创建 DOM 遮罩，也不再通过页面 CSS 裁掉 Rust 的 `$dismiss`。调用方仅给现有 `NavigationView` 设置 `hasExternalContent`：Rust 保留页面内容透明，输出 `hostClip`、`lightDismiss` 和原有交互部件。SDK 浏览器适配仅投影矩形与输入；页面布局继续读取 Rust 的 `content`。移除了 React 的遮罩显示条件、`#0003`、遮罩 pointer handler 及页面级 Esc 关闭处理。

`lightDismissOverlayMode` 使用已有具名枚举。固定 `SplitView_themeresources.xaml` 的 `LightDismissLayer` 默认透明；桌面 `Auto` / `Off` 保留透明的关闭区域，`On` 使用匹配 SDK 的 `SplitViewLightDismissOverlayBackground`，不再沿用前端黑色常量。遮罩跟随 Rust 的 350/120 ms pane 时间线、减少动画、反向和关闭取消。原有 `$dismiss` 命中与 `PaneClosing` 握手继续负责关闭。动画结束后释放遮罩区域；内容恢复直接接收点击。高对比度面板使用已有背景回退。外部 DOM 不能被 Canvas 采样时，Rust 强制使用材质 fallback。

来源检查现在覆盖全部 NodeKind、React 适配函数及递归前端文件：校验官方来源、Rust 运行时代码引用和 React 到同一 SDK 的调用链，拒绝 HTML/ARIA 替代控件、DOM 激活命中区域以及 React 中的绘制、动画、输入捕获。基础 SDK 的依赖图保持无 React。`WrapPanel` 明确记录为固定 Gallery 的 CommunityToolkit 控件，命令和 primitives 也使用真实命名空间。`--check` 不改写来源记录，常规执行刷新 `references/control-origins.json`。检查已接入 `typecheck` 与 WASM 构建，新增控制类型或 React 导出必须重新审查。

```powershell
node tools/check-control-origins.mjs
node --test tools/control-implementation-audit.test.mjs
cargo test --locked --test navigation_external_content --test navigation --test navigation_motion --test navigation_scrollbars --test frame --test frame_presentation --test scene
node tools/prepare-navigation-external-content-validation.mjs
cd gallery
npm run typecheck
npm run declarations
npx playwright test -c playwright.navigation-external-content.config.ts
```

独立构建和浏览器结果位于 `out/navigation-external-content-*`。此检查约束实现分层，不以源码中出现 Rust 名称、导出齐全或静态检查通过证明原生完整度；运行时回归和代码审查仍需继续执行。

全页审计同时发现 Connected Animation 调用的 `SystemAccentColor` 已在匹配 SDK 的 motion 资源合同中提取，却未注册进共享 Rust 资源表；现仅补入缺失项，不覆盖已有主题键。既有源码滚动检查改为在每次主题切换后解析当前活动页的 Expander，并等待异步源码展示完成；浮层挂载边界则按实际物理像素比较，覆盖 DPR 1.25 的半像素锚点。

最终记录：[导航外部内容与遮罩验证](../references/validation/navigation-external-content.json)。Rust 全量 427 项通过；来源检查覆盖 110 个运行时节点、113 个 React 函数导出和 69 个前端文件，3 项反例检查通过。开发环境导航/挂载矩阵经受影响项复跑后为 51 项通过；最终生产包另有 14 项通过，包含三种主题、DPR 1 / 1.25 / 2、关闭取消、Esc、样式及卸载恢复、源码双轴滚动和 85 个已实现入口的独立来源审计。类型检查、声明生成与生产构建通过。各轮报告、修正过的旧断言、产物范围与源文件指纹均在记录中单列。

最终工作区和独立生产包使用同一 WASM：`034f087997f09eacdc06f8c893168c10dc6e91327a468e1db275f08ac07236fc`。透明 Auto / Off 层仅保留 Rust 命中范围，不创建无用的离屏绘制层。
