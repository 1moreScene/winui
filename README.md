# WinUI Rust/WASM SDK

ScrollBar、Thumb、TickBar、ScrollContentPresenter、ItemsPresenter 已接入 Rust SDK、类型化 TS/React API 与五个示例。调用方使用控件 API，滚动、拖拽、刻度和模板布局由 Rust 执行；来源、验证及边界见 [本批记录](docs/scroll-primitives.md)。

ItemsRepeater、StackLayout、UniformGridLayout、RefreshContainer、RefreshVisualizer 已接入 Rust、公共 TS/React 与 Gallery；官方 7+2 个用例对应及验收边界见 [Gallery 对齐记录](docs/repeater-gallery-alignment.md)，基础调用见 [本批 API](docs/repeater-refresh.md)。

后续的持续布局、未知模板尺寸估计和颜色按钮状态问题已修正，见 [性能与按钮状态记录](docs/repeater-performance.md)。

CalendarView、CalendarDatePicker、DatePicker、TimePicker、ColorPicker 已接入 Rust、TS/React 与 Gallery；固定 SDK 的 66 个状态及一致性边界见 [批次进度](docs/picker-controls.md)。

首页已接入 Rust Frame：返回/前进历史、页面生命周期与取消、Disabled / Enabled / Required 缓存、页面状态与滚动保留、可中断页面转场。NavigationView 页新增可操作示例，API、材质宿主边界及验证见 [NavigationView 与 Frame](docs/navigation-frame.md)。

NavigationView 层级展开/折叠已加入原生 200 ms 隐式 Offset、AnimatedChevron 状态与嵌套中断处理；透明面板、Acrylic 参数过渡及快速页面切换也已继续对照同 SDK 原生窗口修正，见 [动画和材质对照](docs/navigation-motion-parity.md)。

控件示例页已统一官方 PageHeader / ControlExample 布局，应用侧栏直接复用现有 Rust **NavigationView**；未实现项目保留占位。实现与复查命令见 [Gallery 示例页](docs/gallery-sample-pages.md)。

导航卡顿、指示条状态及动画修复，非 WinUI 原型清理与验证边界见 [导航质量与清理](docs/navigation-quality-and-cleanup.md)。

Gallery 的 Options、菜单、源码区现已使用已有 SDK 控件；源码位于单个真实 Expander 内容槽中，滚动条使用 Rust ScrollViewer。[接入与审计](docs/gallery-controls.md)。

行内场景默认透明，避免 SelectorBar 等控件周围出现 SDK 强填的灰底；搜索与图标按钮的调用方修正及逐页几何检查见 [宿主样式审计](docs/gallery-visual-consistency.md)。

Gallery 默认打开[首页](http://127.0.0.1:5173/#home)，按固定官方版本还原横幅、资源卡片、分类导航及 Recent / Favorites。官方 126 个目录项均保留入口，已有示例可直接访问，其余显示“待实现”并进入占位页。来源与验证见 [Gallery 首页](docs/gallery-home.md)。

导航与层级批新增 **FlipView、PipsPager、BreadcrumbBar、TreeView、TabView**，包含 React / 普通 SDK、21 个示例入口、同版原生矩阵与 Store 窗口交互观察。范围、复现命令和未接受事项见 [本批实现](docs/navigation-controls.md)。

集合控件批已接入 **ItemsStackPanel、ItemsWrapGrid、VariableSizedWrapGrid、ListView、GridView**，包含普通 SDK/React 项模板、四种选择模式、可见区回收和十个示例；[打开 ListView](http://127.0.0.1:5173/#list-view) 或 [GridView](http://127.0.0.1:5173/#grid-view)。SplitButton 两个色板已使用这些真实控件。实现范围、原生对照和剩余限制见 [集合控件](docs/collections.md)。

已完成路线阶段 **1–5 的本批出口**：固定原生对照、共享场景树和公共 SDK、布局/文字/WebGL2 基础，以及 **Button** 的样式、输入和原生对照闭环。Rust SDK 位于根目录，React + TypeScript + Vite Gallery 位于 `gallery/`。已接入官方 3 个 Acrylic、4 个缓动、4 个二维属性过渡及渐变示例，并提供关键帧与 500ms 颜色过渡；NavigationView 保持集成回归。

详细验收、范围与剩余限制见 [阶段 1–4](docs/stages-1-4.md)。阶段五验收见 [动画与材质](docs/stage-5.md)。本批已验证快照通过 103 项 Rust 与 104 项浏览器回归；不代表完整 WinUI、逐像素或逐帧等价。

阶段 6 已开始，首批提供 [ToggleButton](http://127.0.0.1:5173/#toggle-button)、[CheckBox](http://127.0.0.1:5173/#checkbox)、[TextBlock](http://127.0.0.1:5173/#textblock) 和 [Image](http://127.0.0.1:5173/#image) 页面。本批新增 [RadioButton / RadioButtons](http://127.0.0.1:5173/#radio-button) 与 [ToggleSwitch](http://127.0.0.1:5173/#toggle-switch)。覆盖与差异见 [阶段 6.5](docs/stage-6.md)，不表示整个阶段 6 已完成。

## 运行

基础控件补充批已加入 [InfoBar](http://127.0.0.1:5173/#info-bar)、[PersonPicture](http://127.0.0.1:5173/#person-picture)、[RatingControl](http://127.0.0.1:5173/#rating-control)、[SplitButton](http://127.0.0.1:5173/#split-button)、[ToggleSplitButton](http://127.0.0.1:5173/#toggle-split-button)，共九个 React 示例。范围、实测 SDK 与源码差异、重现命令及未接受事项见 [本批记录](docs/compact-controls.md)。

环境：Rust 1.95.0（仓库 rust-toolchain.toml 已固定）、Node 22.12+（本次 22.14.0）、npm。初次安装：

```powershell
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.104 --locked
cd gallery
npm ci
npm run build
npm run dev
```

打开 [NavigationView](http://127.0.0.1:5173/#navigation-view)、[Button](http://127.0.0.1:5173/#button) 、[组合与 GPU](http://127.0.0.1:5173/#foundation) 或 [Acrylic](http://127.0.0.1:5173/#acrylic)、[缓动函数](http://127.0.0.1:5173/#easing)、[属性过渡](http://127.0.0.1:5173/#transitions)、[渐变](http://127.0.0.1:5173/#gradients)。后续修改 Rust 后运行 `npm run build:wasm`；Vite 不会自动编译 Rust；构建完成的 sentinel 会使开发页面重新加载，避免旧 JS glue 与新 WASM 混用。生产预览用 `npm run preview`。

本轮补齐来源明确的主题资源、应用内 Acrylic、可组合 Gallery 内容页和中断指示条动画，修复全局焦点黑框及快速往返点击拉长。已完成 22 组同条件静态对照；精确原生动画与完整功能差异仍见验收记录。

## 基准与依赖

- Gallery：`7360ac322414e118eadfb0c7c2f4ecc31a218f59`，本机 `C:\Users\11156\source\repos\WinUI-Gallery`，未修改该仓库。
- 读取实际 `project.assets.json`：Windows App SDK `2.5.4-experimental` → WinUI `2.3.10-experimental`。
- WinUI 源码：标签 `winui3/release/2.5.4-experimental`，提交 `7b12709347527238494ca28cb9fed326d513e779`。发布标签与 umbrella 包一致；没有证明 NuGet 二进制严格来自此提交。
- 前端在 **2026-11-07** 从 npm 官方 registry 的 `/latest` 元数据核实并精确安装：TypeScript **7.0.2**、React / React DOM **19.3.1**、Vite **8.3.6**、React 插件 **6.2.1**、React 类型 **19.3.0**。Node **22.14.0** 满足 Vite 和插件的 `^20.19.0 || >=22.12.0` 要求；Node 类型固定 **22.20.5**。
- 版本、engines、peerDependencies 原始记录在 `references/frontend-versions.json`，实际解析结果由 `gallery/package-lock.json` 固定。`node/latest` 当时是预发布版本，未安装它。常规构建不查询或升级依赖。

详细说明：[实现顺序与关键要点](docs/implementation-roadmap.md)、[架构与差异](docs/architecture.md)、[公共 API](docs/api.md)、[验收记录](docs/validation.md)。生产构建也生成 `gallery/dist/sdk-types/` 完整类型声明。

## 最小调用

基础 SDK 无 React 依赖：

```ts
import { WinUI, EventKind, PaneDisplayMode, ThemeMode } from './src/index';

const ui = await WinUI.create();
const navigation = ui.navigationView(host, {
  items: [{ id: 'home', text: 'Home', icon: '\uE80F' }],
});
const unsubscribe = navigation.on(EventKind.SelectionChanged, e => console.log(e.itemId));
navigation.update({ paneDisplayMode: PaneDisplayMode.Left, theme: ThemeMode.Dark });
console.log(navigation.properties, navigation.snapshot);
unsubscribe();
navigation.dispose(); // 幂等；也可以 ui.dispose() 一次释放其全部控件
```

React 适配使用直接属性和同一个 SDK，由组件卸载自动释放。所有 Gallery 页面默认 Canvas2D，WebGL2 为显式可选项。发行版来源及未验收差异见 [来源审计](docs/release-audit.md)。

```tsx
import { WinUIProvider, NavigationView } from './src/react';
import { PaneDisplayMode } from './src/index';

<WinUIProvider>
  <NavigationView
    items={[{ id: 'home', text: 'Home' }]} paneDisplayMode={PaneDisplayMode.Left}
    onSelectionChanged={e => console.log(e.itemId)}
  />
</WinUIProvider>
```

## 检查

```powershell
cargo test --locked
node tools/generate-enums.mjs --check
node tools/verify-baseline.mjs
cd gallery
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

本机新版 Playwright 下载的 Chromium 启动返回 `spawn UNKNOWN`，本次实际交互测试使用已经安装的 Chrome：`$env:PW_CHANNEL='chrome'; npm test`。保留 Chromium 默认配置供正常安装环境使用；未修改系统安全设置。

`references/scope.json` 由固定 Gallery 生成，包含 126 个项目及示例来源；Button、NavigationView、Acrylic、缓动、径向渐变和属性过渡已分别登记覆盖与剩余状态，其他完整控件仍为未开始，不代表已实现。

**官方 WinUI / Windows App SDK 的 TableView 和 Chart / Charts 明确不实现**，不列入待实现控件或完成率分母，也不通过第三方图表替代。TableView 如需实现，仅遵循用户已指定的社区基准；无关 Windows 系统 API 继续排除。完整规则见 [实现要求](.agents/.agents.md) 和 [实施路线](docs/implementation-roadmap.md#明确排除项)。

**Sound、WebView2、MapControl、InkCanvas 和 InkToolbar 同样不实现**，包括对应 SDK 能力及 Gallery 示例，不创建占位 API 或替代实现；来源索引如保留条目，标记“范围外（不实现）”，不列入待实现清单或完成率分母。

**ContentIsland、Storage pickers、App notifications、Badge notifications、JumpList 及同类 Windows 原生宿主、存储选择、通知和 Shell 集成功能也不实现**，沿用上述范围外标记与统计规则，不提供占位 API、伪成功结果或浏览器替代示例。

**XAML Conditions 和 Scratch Pad 同样不实现**，不新增对应 Gallery 页面、SDK API、占位或替代功能，并沿用范围外标记与统计规则。

上游源码和 Gallery 资料为 Microsoft MIT 授权，见 `references/winui/LICENSE`、`references/GALLERY-LICENSE`。安装的 Windows App SDK 自身许可证另由 NuGet 包提供，未重新分发 SDK 二进制。

阶段 6.3：[TextBox](http://127.0.0.1:5173/#text-box)、[PasswordBox](http://127.0.0.1:5173/#password-box)、[ScrollViewer](http://127.0.0.1:5173/#scroll-viewer)。[验证范围与剩余差异](docs/text-scroll.md)。AutoSuggestBox、NumberBox、ComboBox、ContentDialog、TeachingTip 已接入 SDK/React 与 13 个示例，见 [组合控件实现与验收范围](docs/composed-controls.md)。

应用内全局滚动条现已默认接入 `WinUI.create()`，复用 Rust ScrollViewer，覆盖正文/侧栏/源码/动态 DOM。可用 `globalScrollbars: false` 禁用自动接入，或 `sdk.installGlobalScrollbars(container)` 管理子树。内联按钮的原生留白、平方命中区及多行底条修正、平台和材质限制见 [全局滚动条记录](docs/global-scrollbars.md)。


阶段 6.4 新增 [ProgressBar](http://127.0.0.1:5173/#progress-bar) 和 [ProgressRing](http://127.0.0.1:5173/#progress-ring)，补齐 ToggleSwitch 的 ProgressRing 依赖。[实现、原生对照与剩余范围](docs/progress.md)。应用内全局滚动条随 `WinUI.create()` / React Provider 自动接入，无需额外安装调用。


阶段 6.5 新增 [RepeatButton](http://127.0.0.1:5173/#repeat-button) 和 [Viewbox](http://127.0.0.1:5173/#viewbox)，包含 Rust 计时、缩放与布局裁剪、两个 React 示例及原生对照。实现范围和剩余差异见 [RepeatButton / Viewbox](docs/repeat-viewbox.md)。阶段 6 整体尚未完成。

阶段 6.6 新增 Border、Canvas、HyperlinkButton、Expander、InfoBadge，并修复 ProgressBar 端点和细条采样。运行入口、对照方法与剩余差异见 [五控件记录](docs/five-controls.md)。

阶段 6.7 修正 InfoBadge 官方样式并新增五种图标：[IconElement](http://127.0.0.1:5173/#icon-element)。FontIcon、SymbolIcon、PathIcon、BitmapIcon、ImageIcon 共六个 React 示例，直接使用属性；[实现与对照范围](docs/icons.md)。

阶段 6.8 扩展 IconElement，新增七种内置 [AnimatedIcon](http://127.0.0.1:5173/#animated-icon) 和 [Rectangle、Line、Path、Polygon、Polyline](http://127.0.0.1:5173/#shapes)。动画由 Rust 执行，支持状态队列与 NavigationView 集成；[API、原生对照与剩余范围](docs/animated-icons-shapes.md)。BitmapIcon 官方示例初始显示彩色，勾选单色后按 alpha 遮罩显示。

阶段 7 首批新增 [Popup / ToolTip / Flyout / MenuFlyout / Slider](http://127.0.0.1:5173/#overlays)，含共享浮层、可取消关闭、焦点恢复、平面菜单和 Slider 默认数值提示。[实现、API、原生对照和剩余范围](docs/overlays.md)。

并行集成记录：`references/validation/overlays-current-workspace.json` 保留早期浮层接线尚未完成时的检查结果。集合批现已重新构建前端和 SDK 声明，当前对照构建、Rust/浏览器结果及完整范围见 `references/collections-status.json` 与 [集合控件](docs/collections.md)；测试服务器捕获固定 WASM，后续其他会话的修改需要按各自构建继续验证。

组合控件页面：[AutoSuggestBox](http://127.0.0.1:5173/#auto-suggest-box)、[NumberBox](http://127.0.0.1:5173/#number-box)、[ComboBox](http://127.0.0.1:5173/#combo-box)、[ContentDialog](http://127.0.0.1:5173/#content-dialog)、[TeachingTip](http://127.0.0.1:5173/#teaching-tip)。[功能与原生验收边界](docs/composed-controls.md)。

命令与选择批：SelectorBar、DropDownButton、AppBarButton、AppBarToggleButton、CommandBar；Pivot 不在实现计划内。接口、16 个官方示例和验证范围见 [命令控件记录](docs/command-controls.md)。

菜单与布局批：MenuBar、MenuBarItem、CommandBarFlyout、RelativePanel、WrapPanel 已接入同一 Rust Scene、基础 TS SDK 和 React 平铺 API，包含八个可运行示例。命令模型现由 UICommand/StandardCommand 提供。接口与验收边界见 [本批记录](docs/menu-layout-controls.md)。

视图与命令批：SplitView、SemanticZoom、ParallaxView、UICommand、StandardCommand 已接入 Rust SDK；UICommand/StandardCommand 的公共注释明确对应 XamlUICommand/StandardUICommand。用法、六个 Gallery 示例、来源与验证边界见 [视图与命令](docs/view-commands.md)。

- [集合、分页、布局与富文本五控件：Rust 实现、公共 API 与验收边界](docs/reading-controls.md)

- [内容承载与页面导航：ContentControl / ContentPresenter / UserControl / Page / SceneFrame](docs/content-hosts.md)

菜单子控件批：MenuFlyoutItem、ToggleMenuFlyoutItem、RadioMenuFlyoutItem、MenuFlyoutSubItem、MenuFlyoutSeparator 已提供独立 Rust 节点、普通 SDK / React 接口和五个示例。[实现与验收边界](docs/menu-item-controls.md)，开发入口 `/#menu-items`。

Motion 动画的 Rust SDK API、Gallery 示例、来源和当前边界：[docs/motion.md](docs/motion.md)。
