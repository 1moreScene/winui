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
