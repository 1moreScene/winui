# 项目开发记录与实现概览

本文从根目录 README 迁出，保留项目阶段记录和原有说明。面向用户的 SDK 用法请看根目录 README；具体 API、开发、发布和验收以本目录各专题文档为准。

## 原 README 内容

SDK 已抽为独立 npm 包 `../packages/winui-wasm`，Gallery 只通过 `winui-wasm` 和 `winui-wasm/react` 调用；消费者安装包即可使用预编译 WASM、JS、类型、字体和样式，无需复制 TS SDK 或安装 Rust。包尚未发布到 npm，使用方式与独立安装验收见 [npm 包说明](npm-package.md)。

**资源来源状态（2026-11-10）：工程预览模板阻断已解除。** 模板和画刷已从固定 MIT WinUI 源码重新生成；发行检查核验源文件、生成证据、媒体、依赖和完整许可证，详见 [资源授权审计](resource-licensing.md)。本次不执行公开发布。

[RichEditBox](https://1morescene.github.io/winui/#rich-edit-box) 已接入 Rust、普通 TS SDK 和 React：RTF 导入/导出、PNG/JPEG 嵌入、MathML 排版、选区、IME、段落列表及撤销/重做由 Rust 执行，SplitButton / ToggleSplitButton 也已使用真实富文本编辑器。[API、验证与边界](rich-edit-box.md)。

社区 **WinUI.TableView** 已按用户指定仓库接入 Rust、普通 TS/React API 与 Gallery 十组示例（`#table-view`），包含 10,000 行数据、九类列、排序筛选、编辑、模板、冻结列、导出，以及基于正式 1.5.1 的按列/多级分组和粘性组头。来源、MIT 许可证、API 与明确差异见 [TableView 接入记录](table-view.md)。官方 TableView 仍不在范围内。

Expander 已按固定官方页面补齐两个示例，Grid 已接入目录与四个交互选项；独立行列间距和 Header 内容槽由 Rust SDK 执行。来源差异及验证见 [布局示例对齐](layout-gallery-alignment.md)。

ScrollBar、Thumb、TickBar、ScrollContentPresenter、ItemsPresenter 已接入 Rust SDK、类型化 TS/React API 与五个示例。调用方使用控件 API，滚动、拖拽、刻度和模板布局由 Rust 执行；来源、验证及边界见 [本批记录](scroll-primitives.md)。

ItemsRepeater、StackLayout、UniformGridLayout、RefreshContainer、RefreshVisualizer 已接入 Rust、公共 TS/React 与 Gallery；官方 7+2 个用例对应及验收边界见 [Gallery 对齐记录](repeater-gallery-alignment.md)，基础调用见 [本批 API](repeater-refresh.md)。

后续的持续布局、未知模板尺寸估计和颜色按钮状态问题已修正，见 [性能与按钮状态记录](repeater-performance.md)。

CalendarView、CalendarDatePicker、DatePicker、TimePicker、ColorPicker 已接入 Rust、TS/React 与 Gallery；固定 SDK 的 66 个状态及一致性边界见 [批次进度](picker-controls.md)。

CalendarIdentifier 已启用全部 10 种原有历法，并增加 ChineseCalendar：支持农历和闰月、常见节日、二十四节气，范围为 1901–2100 年，不包含调休安排。三个日期控件共用 Rust 历法逻辑，日期输入及事件仍使用公历 `YYYY-MM-DD`，见 [历法 API 与数据来源](picker-controls.md#calendaridentifier-与-chinese-日历2026-11-10)。

首页已接入 Rust Frame：返回/前进历史、页面生命周期与取消、Disabled / Enabled / Required 缓存、页面状态与滚动保留、可中断页面转场。NavigationView 页新增可操作示例，API、材质宿主边界及验证见 [NavigationView 与 Frame](navigation-frame.md)。

NavigationView 层级展开/折叠已加入原生 200 ms 隐式 Offset、AnimatedChevron 状态与嵌套中断处理；透明面板、Acrylic 参数过渡及快速页面切换也已继续对照同 SDK 原生窗口修正，见 [动画和材质对照](navigation-motion-parity.md)。

控件示例页已统一官方 PageHeader / ControlExample 布局，应用侧栏直接复用现有 Rust **NavigationView**；未实现项目保留占位。实现与复查命令见 [Gallery 示例页](gallery-sample-pages.md)。

导航卡顿、指示条状态及动画修复，非 WinUI 原型清理与验证边界见 [导航质量与清理](navigation-quality-and-cleanup.md)。

Gallery 的 Options、菜单、源码区现已使用已有 SDK 控件；源码位于单个真实 Expander 内容槽中，滚动条使用 Rust ScrollViewer。[接入与审计](gallery-controls.md)。

行内场景默认透明，避免 SelectorBar 等控件周围出现 SDK 强填的灰底；搜索与图标按钮的调用方修正及逐页几何检查见 [宿主样式审计](gallery-visual-consistency.md)。

Gallery 默认打开[首页](https://1morescene.github.io/winui/#home)，按固定官方版本还原横幅、资源卡片、分类导航及 Recent / Favorites。官方 126 个目录项均保留入口，已有示例可直接访问，其余显示“待实现”并进入占位页。来源与验证见 [Gallery 首页](gallery-home.md)。

导航与层级批新增 **FlipView、PipsPager、BreadcrumbBar、TreeView、TabView**，包含 React / 普通 SDK、21 个示例入口、同版原生矩阵与 Store 窗口交互观察。范围、复现命令和未接受事项见 [本批实现](navigation-controls.md)。

集合控件批已接入 **ItemsStackPanel、ItemsWrapGrid、VariableSizedWrapGrid、ListView、GridView**，包含普通 SDK/React 项模板、四种选择模式、可见区回收和十个示例；[打开 ListView](https://1morescene.github.io/winui/#list-view) 或 [GridView](https://1morescene.github.io/winui/#grid-view)。SplitButton 两个色板已使用这些真实控件。实现范围、原生对照和剩余限制见 [集合控件](collections.md)。

已完成路线阶段 **1–5 的本批出口**：固定原生对照、共享场景树和公共 SDK、布局/文字/WebGL2 基础，以及 **Button** 的样式、输入和原生对照闭环。Rust SDK 位于根目录，React + TypeScript + Vite Gallery 位于 `../gallery/`。已接入官方 3 个 Acrylic、4 个缓动、4 个二维属性过渡及渐变示例，并提供关键帧与 500ms 颜色过渡；NavigationView 保持集成回归。

详细验收、范围与剩余限制见 [阶段 1–4](stages-1-4.md)。阶段五验收见 [动画与材质](stage-5.md)。本批已验证快照通过 103 项 Rust 与 104 项浏览器回归；不代表完整 WinUI、逐像素或逐帧等价。

阶段 6 已开始，首批提供 [ToggleButton](https://1morescene.github.io/winui/#toggle-button)、[CheckBox](https://1morescene.github.io/winui/#checkbox)、[TextBlock](https://1morescene.github.io/winui/#textblock) 和 [Image](https://1morescene.github.io/winui/#image) 页面。本批新增 [RadioButton / RadioButtons](https://1morescene.github.io/winui/#radio-button) 与 [ToggleSwitch](https://1morescene.github.io/winui/#toggle-switch)。覆盖与差异见 [阶段 6.5](stage-6.md)，不表示整个阶段 6 已完成。

## 运行

另有独立 React 页面设计器 `designer/`：左侧组件与图层、中间真实 SDK 画布、右侧属性面板；设计器自身的控件也全部使用 Rust/WASM WinUI。支持拖放、移动和缩放、撤销/重做、本地草稿、交互预览与 JSON/React 导出。启动方式和首版范围见 [设计器说明](../designer/README.md)。已有 SDK 构建产物时，先 `npm --prefix designer ci`，再在根目录执行 `npm run dev:designer`，打开 <http://localhost:5174/>。

基础控件补充批已加入 [InfoBar](https://1morescene.github.io/winui/#info-bar)、[PersonPicture](https://1morescene.github.io/winui/#person-picture)、[RatingControl](https://1morescene.github.io/winui/#rating-control)、[SplitButton](https://1morescene.github.io/winui/#split-button)、[ToggleSplitButton](https://1morescene.github.io/winui/#toggle-split-button)，共九个 React 示例。范围、实测 SDK 与源码差异、重现命令及未接受事项见 [本批记录](compact-controls.md)。

环境：Rust 1.95.0（仓库 rust-toolchain.toml 已固定）、Node 22.12+（本次 22.14.0）、npm。初次安装：

```powershell
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.104 --locked
npm ci --prefix packages/winui-wasm
cd gallery
npm ci
npm run build:local
npm run dev
```

开发服务默认监听 `0.0.0.0:5173`，同一局域网设备使用 `http://<本机局域网 IPv4>:5173` 访问；生产预览 `npm run preview` 同样监听所有网卡，端口为 4173。防火墙需允许对应端口的本地子网入站连接。无需开放路由器公网端口。

SDK 初始化自动加载随包提供的图标字体，不需要访问字体 CDN。所有平台统一使用包内的 `../packages/winui-wasm/src/assets/winui-icons.woff`，不依赖本机 Segoe 安装版本。该回退字体按 WinUI 码位映射了 WinJS Symbols（Apache-2.0）和 Fluent System Icons（MIT）的图形。已按本机 Segoe 的数字尺寸校准字宽和墨迹边界，并为实心箭头、状态圆点、诊断波形、网格、代码花括号等纠正了明显形状差异；部分轮廓仍与原生 Segoe 不同。`../tools/compare-icon-font.py` 生成本地原生/回退对照图，`../tools/test_icon_font.py` 检查实心和方向等轮廓不变量。普通文本字体仍遵循平台字体回退规则。位图和路径图标沿用原资源。

若监听所有网卡、项目允许规则已生效后，其他设备仍连接失败，需要同时检查防火墙规则的程序、端口、地址和 LocalUser 账户筛选，不能只凭规则名称或 Program=Any 判断它影响所有用户。本机的 `codex_sandbox_offline_block_inbound` 仅针对 `CodexSandboxOffline` 账户，不匹配普通用户从独立终端启动的 Vite。跨设备连通性仍需实际验证，本机访问自身局域网 IP 成功不能代替其他设备测试。

字体来源、固定提交、映射和许可证保存在 `../third_party/icon-fonts`；`../tools/check-icon-fonts.mjs` 在每次构建时检查项目和模板里的图标码位以及资源指纹，遗漏会使构建失败。修改映射后可安装 `fonttools` 并运行 `python tools/build-icon-font.py` 重建随包字体；常规构建不需要 fonttools。生产构建包含字体和许可证。

Python 资源提取通过 `../tools/generate.py` 执行：相同内容不触碰文件，更新时先写同目录临时文件再原子替换，遇到 Windows 临时文件占用做有限重试；永久失败保留旧文件并报错。

`build:wasm` 会先运行 `../tools/extract-*.py` 重新生成 `../gallery/src/official-*.json`，因此还需要本机具备两份固定来源：NuGet 包 `Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental`（位于 `~/.nuget/packages/`）和提交 `7360ac322414e118eadfb0c7c2f4ecc31a218f59` 的 `WinUI-Gallery` 克隆；克隆路径由 `../references/baseline.json` 的 `gallery.path` 指定。提取脚本按清单哈希校验本地文件，工作区需保持 LF 换行（`git config core.autocrlf false`）。

打开 [NavigationView](https://1morescene.github.io/winui/#navigation-view)、[Button](https://1morescene.github.io/winui/#button) 、[组合与 GPU](https://1morescene.github.io/winui/#foundation) 或 [Acrylic](https://1morescene.github.io/winui/#acrylic)、[缓动函数](https://1morescene.github.io/winui/#easing)、[属性过渡](https://1morescene.github.io/winui/#transitions)、[渐变](https://1morescene.github.io/winui/#gradients)。后续修改 Rust 后运行 `npm run build:wasm`；Vite 不会自动编译 Rust；构建完成的 sentinel 会使开发页面重新加载，避免旧 JS glue 与新 WASM 混用。生产预览用 `npm run preview`。

本轮补齐来源明确的主题资源、应用内 Acrylic、可组合 Gallery 内容页和中断指示条动画，修复全局焦点黑框及快速往返点击拉长。已完成 22 组同条件静态对照；精确原生动画与完整功能差异仍见验收记录。

## 打包 npm SDK

在项目根目录执行 `npm run pack:sdk`，生成 `../out/npm/winui-wasm-<version>.tgz` 及 SHA-256 报告。其他项目可通过 `npm install <tgz 文件路径>` 安装普通 SDK 与 React 入口。

Rust 源码改动后使用 `npm run pack:sdk:full` 先重新构建 WASM；仅修改 TypeScript/React 时使用 `pack:sdk`。自定义输出目录可用 `npm run pack:sdk -- --out-dir ./out/release`。命令只生成本地安装包，详细流程见 [npm 包说明](npm-package.md#生成-npm-安装包)。

## GitHub Pages

推送到 `main` 后，GitHub Actions 会自动校验资源、编译 Rust/WASM、运行手机触屏滚动回归并构建和部署 Gallery。无需手动执行部署命令。本地预览可运行 `npm run build:pages`，输出为 `../gallery/dist-pages`；详见 [GitHub Pages 部署](github-pages.md)。

## 基准与依赖

- Gallery：`7360ac322414e118eadfb0c7c2f4ecc31a218f59`，本机 `C:\Users\11156\source\repos\WinUI-Gallery`，未修改该仓库。
- 读取实际 `project.assets.json`：Windows App SDK `2.5.4-experimental` → WinUI `2.3.10-experimental`。
- WinUI 源码：标签 `winui3/release/2.5.4-experimental`，提交 `7b12709347527238494ca28cb9fed326d513e779`。发布标签与 umbrella 包一致；没有证明 NuGet 二进制严格来自此提交。
- 前端在 **2026-11-07** 从 npm 官方 registry 的 `/latest` 元数据核实并精确安装：TypeScript **7.0.2**、React / React DOM **19.3.1**、Vite **8.3.6**、React 插件 **6.2.1**、React 类型 **19.3.0**。Node **22.14.0** 满足 Vite 和插件的 `^20.19.0 || >=22.12.0` 要求；Node 类型固定 **22.20.5**。
- 版本、engines、peerDependencies 原始记录在 `../references/frontend-versions.json`，实际解析结果由 `../gallery/package-lock.json` 固定。`node/latest` 当时是预发布版本，未安装它。常规构建不查询或升级依赖。

详细说明：[实现顺序与关键要点](implementation-roadmap.md)、[架构与差异](architecture.md)、[公共 API](api.md)、[验收记录](validation.md)。生产构建也生成 `../gallery/dist/sdk-types/` 完整类型声明。

## 最小调用

基础 SDK 无 React 依赖：

```ts
import { WinUI, EventKind, PaneDisplayMode, ThemeMode } from 'winui-wasm';

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

React 适配使用直接属性和同一个 SDK，由组件卸载自动释放。所有 Gallery 页面默认 Canvas2D，WebGL2 为显式可选项。发行版来源及未验收差异见 [来源审计](release-audit.md)。

```tsx
import { WinUIProvider, NavigationView } from 'winui-wasm/react';
import { PaneDisplayMode } from 'winui-wasm';

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

`../references/scope.json` 由固定 Gallery 生成，包含 126 个项目及示例来源；Button、NavigationView、Acrylic、缓动、径向渐变和属性过渡已分别登记覆盖与剩余状态，其他完整控件仍为未开始，不代表已实现。

**官方 WinUI / Windows App SDK 的 TableView 和 Chart / Charts 明确不实现**，不列入待实现控件或完成率分母，也不通过第三方图表替代。TableView 如需实现，仅遵循用户已指定的社区基准；无关 Windows 系统 API 继续排除。完整规则见 [实现要求](../.agents/.agents.md) 和 [实施路线](implementation-roadmap.md#明确排除项)。

**Sound、WebView2、MapControl、InkCanvas 和 InkToolbar 同样不实现**，包括对应 SDK 能力及 Gallery 示例，不创建占位 API 或替代实现；来源索引如保留条目，标记“范围外（不实现）”，不列入待实现清单或完成率分母。

**ContentIsland、Storage pickers、App notifications、Badge notifications、JumpList 及同类 Windows 原生宿主、存储选择、通知和 Shell 集成功能也不实现**，沿用上述范围外标记与统计规则，不提供占位 API、伪成功结果或浏览器替代示例。

**XAML Conditions 和 Scratch Pad 同样不实现**，不新增对应 Gallery 页面、SDK API、占位或替代功能，并沿用范围外标记与统计规则。

上游源码和 Gallery 资料为 Microsoft MIT 授权，见 `../references/winui/LICENSE`、`../references/GALLERY-LICENSE`。安装的 Windows App SDK 自身许可证另由 NuGet 包提供，未重新分发 SDK 二进制。

阶段 6.3：[TextBox](https://1morescene.github.io/winui/#text-box)、[PasswordBox](https://1morescene.github.io/winui/#password-box)、[ScrollViewer](https://1morescene.github.io/winui/#scroll-viewer)。[验证范围与剩余差异](text-scroll.md)。AutoSuggestBox、NumberBox、ComboBox、ContentDialog、TeachingTip 已接入 SDK/React 与 13 个示例，见 [组合控件实现与验收范围](composed-controls.md)。

应用内全局滚动条现已默认接入 `WinUI.create()`，复用 Rust ScrollViewer，覆盖正文/侧栏/源码/动态 DOM。可用 `globalScrollbars: false` 禁用自动接入，或 `sdk.installGlobalScrollbars(container)` 管理子树。内联按钮的原生留白、平方命中区及多行底条修正、平台和材质限制见 [全局滚动条记录](global-scrollbars.md)。


阶段 6.4 新增 [ProgressBar](https://1morescene.github.io/winui/#progress-bar) 和 [ProgressRing](https://1morescene.github.io/winui/#progress-ring)，补齐 ToggleSwitch 的 ProgressRing 依赖。[实现、原生对照与剩余范围](progress.md)。应用内全局滚动条随 `WinUI.create()` / React Provider 自动接入，无需额外安装调用。


阶段 6.5 新增 [RepeatButton](https://1morescene.github.io/winui/#repeat-button) 和 [Viewbox](https://1morescene.github.io/winui/#viewbox)，包含 Rust 计时、缩放与布局裁剪、两个 React 示例及原生对照。实现范围和剩余差异见 [RepeatButton / Viewbox](repeat-viewbox.md)。阶段 6 整体尚未完成。

阶段 6.6 新增 Border、Canvas、HyperlinkButton、Expander、InfoBadge，并修复 ProgressBar 端点和细条采样。运行入口、对照方法与剩余差异见 [五控件记录](five-controls.md)。

阶段 6.7 修正 InfoBadge 官方样式并新增五种图标：[IconElement](https://1morescene.github.io/winui/#icon-element)。FontIcon、SymbolIcon、PathIcon、BitmapIcon、ImageIcon 共六个 React 示例，直接使用属性；[实现与对照范围](icons.md)。

阶段 6.8 扩展 IconElement，新增七种内置 [AnimatedIcon](https://1morescene.github.io/winui/#animated-icon) 和 [Rectangle、Line、Path、Polygon、Polyline](https://1morescene.github.io/winui/#shapes)。动画由 Rust 执行，支持状态队列与 NavigationView 集成；[API、原生对照与剩余范围](animated-icons-shapes.md)。BitmapIcon 官方示例初始显示彩色，勾选单色后按 alpha 遮罩显示。

阶段 7 首批新增 [Popup / ToolTip / Flyout / MenuFlyout / Slider](https://1morescene.github.io/winui/#overlays)，含共享浮层、可取消关闭、焦点恢复、平面菜单和 Slider 默认数值提示。[实现、API、原生对照和剩余范围](overlays.md)。

并行集成记录：`../references/validation/overlays-current-workspace.json` 保留早期浮层接线尚未完成时的检查结果。集合批现已重新构建前端和 SDK 声明，当前对照构建、Rust/浏览器结果及完整范围见 `../references/collections-status.json` 与 [集合控件](collections.md)；测试服务器捕获固定 WASM，后续其他会话的修改需要按各自构建继续验证。

组合控件页面：[AutoSuggestBox](https://1morescene.github.io/winui/#auto-suggest-box)、[NumberBox](https://1morescene.github.io/winui/#number-box)、[ComboBox](https://1morescene.github.io/winui/#combo-box)、[ContentDialog](https://1morescene.github.io/winui/#content-dialog)、[TeachingTip](https://1morescene.github.io/winui/#teaching-tip)。[功能与原生验收边界](composed-controls.md)。

命令与选择批：SelectorBar、DropDownButton、AppBarButton、AppBarToggleButton、CommandBar；Pivot 不在实现计划内。接口、16 个官方示例和验证范围见 [命令控件记录](command-controls.md)。

菜单与布局批：MenuBar、MenuBarItem、CommandBarFlyout、RelativePanel、WrapPanel 已接入同一 Rust Scene、基础 TS SDK 和 React 平铺 API，包含八个可运行示例。命令模型现由 UICommand/StandardCommand 提供。接口与验收边界见 [本批记录](menu-layout-controls.md)。

视图与命令批：SplitView、SemanticZoom、ParallaxView、UICommand、StandardCommand 已接入 Rust SDK；UICommand/StandardCommand 的公共注释明确对应 XamlUICommand/StandardUICommand。用法、六个 Gallery 示例、来源与验证边界见 [视图与命令](view-commands.md)。

- [集合、分页、布局与富文本五控件：Rust 实现、公共 API 与验收边界](reading-controls.md)

- [内容承载与页面导航：ContentControl / ContentPresenter / UserControl / Page / SceneFrame](content-hosts.md)

菜单子控件批：MenuFlyoutItem、ToggleMenuFlyoutItem、RadioMenuFlyoutItem、MenuFlyoutSubItem、MenuFlyoutSeparator 已提供独立 Rust 节点、普通 SDK / React 接口和五个示例。[实现与验收边界](menu-item-controls.md)，开发入口 `/#menu-items`。

Motion 动画的 Rust SDK API、Gallery 示例、来源和当前边界：[docs/motion.md](motion.md)。

