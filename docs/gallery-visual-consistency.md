# Gallery 宿主样式与透明背景

2026-11-08。接续 [Gallery 控件接入审计](gallery-controls.md)，检查用户标记的搜索框、卡片收藏按钮，以及首页 SelectorBar 等行内控件的灰色矩形。

## 根因与修复归属

| 现象 | 归属 | 修复 |
| --- | --- | --- |
| SelectorBar 四周及其他透明控件宿主出现灰色矩形 | Rust SDK | `Scene::base_display_list` 曾在根 Grid 未设置 Background 时填满主题背景。删除这层隐式填充；未设置背景与 Background=null 均透明，显式背景照常绘制。Canvas2D 和 WebGL2 共用这条路径。 |
| 搜索框右侧有分离的搜索图标，宽度偏大 | Gallery 调用方 | 按固定官方 `MainWindow.xaml` 接入已有 AutoSuggestBox，使用其 QueryIcon、弹层、键盘和提交事件，最大宽度 580 DIP；删除 TextBox 外另拼的图标及旧 input 样式。支持多词检索和 Ctrl+F。 |
| 分类卡片右上角出现宽大的收藏按钮 | Gallery 调用方 | 官方 `ControlItemTemplate` 没有该按钮，因此删除；收藏操作继续使用示例页 PageHeader 的 SDK ToggleButton。 |
| 返回、主题、复制、收藏等图标按钮尺寸与命中区不一致 | Gallery 调用方 | 显式传入原生控件的宽高、MinWidth、Padding；移除文字按钮通用 80 DIP 最小宽度的干扰，内容用 Rust StackPanel 居中。主题操作改为官方 PageHeader 的图标 Button，三主题选择留在 Settings。 |
| 部分页面 Renderer 入口看不见或无法操作 | Gallery 调用方 | 逐页审计发现旧 details 的绝对定位样式与后来的 Expander 宿主叠加，原生 Expander 宽 96 DIP 而 Canvas 宽 0。移除多余折叠容器，直接呈现已有 SDK ComboBox，并清理残留样式。 |

修复没有把所有控件背景清空。Button、ComboBox、TextBox 等模板本身的填充仍由原有 WinUI 资源决定；改变的是场景在控件之外擅自增加的底色。窗口、页面需要背景时由调用方显式设置。浮层在无法采样外部 DOM 时的材质 fallback 也保持原有契约。

## 固定来源与复查

官方 Gallery 仓库：`../WinUI-Gallery`，提交 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`。

- `WinUIGallery/MainWindow.xaml`：AutoSuggestBox 的 MaxWidth=580、QueryIcon=Find。
- `WinUIGallery/Styles/ItemTemplates.xaml`：ControlItemTemplate 卡片结构，没有收藏按钮。
- `WinUIGallery/Controls/PageHeader.xaml`：主题、复制、收藏及 API 信息按钮。
- `references/winui/SelectorBar_themeresources.xaml`：SelectorBarBackground 使用 Transparent。

验证记录见 `references/gallery-visual-validation.json`。浏览器检查使用冻结的 `out/gallery-visual-final-preview` / `out/gallery-visual-final-dev`；记录同时给出当前工作区与被测产物的指纹比较，避免把并行构建后的其他二进制混为同一份验收。

本批通过 29 项浏览器检查、237 项完整 Rust 测试，逐页检查 57 个已实现入口。导航快速反向点击测试在并发运行浏览器套件时触及 30 秒总预算，保留原断言单独重跑通过，原始失败与重跑结果均记录。另在后续 WASM 上复查 6 项关键界面检查；记录时其二进制与当前工作区一致。TypeScript、SDK 声明、Vite 构建和控件来源审计通过。

```powershell
cargo test --locked
node tools/gallery-control-source.mjs --check
node tools/check-control-origins.mjs
$env:GALLERY_VALIDATION_NAME='gallery-visual-final'
node tools/prepare-gallery-page-validation.mjs
cd gallery
npm run typecheck
npm run declarations
$env:GALLERY_CONTROLS_BUILD='gallery-visual-final'
npx playwright test -c playwright.gallery-visual.config.ts
$env:GALLERY_NAVIGATION_ROOT='../out/gallery-visual-final-dev'
npx playwright test -c playwright.gallery-visual-regression.config.ts
# 若工作区的 WASM 已被其他构建更新，另外冻结并复查当前产物：
cd ..
$env:GALLERY_VALIDATION_NAME='gallery-visual-current'
node tools/prepare-gallery-page-validation.mjs
cd gallery
npx playwright test -c playwright.gallery-visual-current.config.ts
```

新增检查覆盖三主题下两种后端的实际像素、显式背景保留、首页 SelectorBar 的 Canvas alpha、搜索建议键盘导航、卡片结构、三档窗口宽度的图标几何、125% DPR，以及全部已实现页面中可见 Rust 控件根节点与宿主 Canvas 的边界。原有源码 Expander、滚动条及导航测试继续回归。

这些检查验证本批来源、布局和透明合成问题，尚不代表所有控件与原生发行版逐像素或 Composition 动画逐帧一致。例如 PageHeader 的文档/源码菜单内容和 API 图标前景资源仍需进一步原生对照；不把这些未验收项列为完成。
