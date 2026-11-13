# Rust/WASM WinUI SDK 实现顺序与关键要点

制定日期：2026-11-07。

目标是 Rust 实现控件与视觉 SDK、TypeScript 提供简洁且完整的调用接口，React + TypeScript + Vite 构建 Gallery 实验应用，以固定版本的官方 WinUI Gallery 作为成果和原生对照基准。项目约束以 [实现要求](../.agents/.agents.md) 为准。

## 明确排除项

- **XAML Conditions 和 Scratch Pad 不实现**，不新增对应 Gallery 页面、SDK API、占位或替代功能；范围内控件所需的模板和状态语义仍按原要求实现。
- **ContentIsland、Storage pickers（文件/文件夹打开、保存选择器）、App notifications、Badge notifications、JumpList 不实现**。同类 Windows 原生内容宿主、系统存储选择、通知、任务栏徽章及 Shell 集成功能也不在范围内，不创建对应 SDK API、占位实现、伪成功结果或浏览器替代示例；范围内控件自身的布局、输入、动画及必要浏览器适配仍需实现。
- **官方 WinUI / Windows App SDK 的 TableView 不实现**，其模板、行为和 API 均不作为本项目 TableView 的还原基准。
- **官方 Chart / Charts 图表控件不实现**，不使用第三方图表库代替，也不为补齐 Gallery 目录而增加对应 SDK 控件或可运行示例。
- **Sound、WebView2、MapControl、InkCanvas 和 InkToolbar 不实现**，包括对应 SDK 能力及 Gallery 示例，不创建占位 API 或替代实现。
- 排除项贯穿所有阶段和后续版本升级。来源索引如保留对应条目，标记“范围外（不实现）”，不标记“待实现”，不计入范围内控件完成率的分母。
- TableView 如需实现，仅遵循用户已指定的社区实现及版本；这不包含官方 TableView，也不授权自行选择其他社区基准。

## 实施原则与当前起点

采用“小规模完整实现 → 提取共享能力 → 按依赖扩展控件”的顺序。每个阶段都交付可运行示例和可复查的验证结果；原生对照贯穿整个过程。

跨分辨率与 DPI 的问题遵循[实现要求中的通用修复准则](../.agents/.agents.md)：在公共 SDK 修复布局规则，Measure 不修改实际尺寸或重置动画，Arrange 根据实际排列尺寸处理自适应。具体视口仅作为复现和回归样本，不添加逐分辨率或缩放特判；用自动生成的尺寸、分数 DPR、重复布局和实际绘制的中间帧验证通用不变量。

截至 2026-11-07，阶段 1–4 的本批出口已实现并验证：固定对照工具、共享场景树与 SDK、布局/文字/WebGL2 基础、Button 闭环。验收范围和限制见 [阶段 1–4 记录](stages-1-4.md)；机器状态见 `references/stages-1-4.json`。阶段 5 现已完成本批动画与应用内材质闭环，见 [阶段 5 记录](stage-5.md)。阶段 6.1 已开始并完成首批验证：ToggleButton、CheckBox 与 TextBlock/Image 首批官方示例，见 [阶段 6 记录](stage-6.md)。当前验证数量见 `references/validation/results.json`，NavigationView 保持集成回归。

这不表示完整通用 XAML、原生像素/精确时序等价、完整输入控件或全部 Gallery 控件已经完成。阶段 5 增补了官方 3 个 Acrylic、4 个缓动、4 个二维属性过渡及径向渐变示例；关键帧、11 种缓动和颜色过渡已接入，完整动画家族与原生逐帧差异见验收记录，阶段 6 的完整输入与滚动尚未完成。

NavigationView 和 Button 继续作为集成回归样本。后续阶段沿用共享场景、布局、资源、输入和生命周期机制，按依赖扩展；不以批量生成入口替代完整实现与对照。

## 推荐顺序

| 阶段 | 重点 | 阶段出口 |
| --- | --- | --- |
| 1 | 固定原生基准与对照工具 | 同一示例、状态和环境能够重复采样比较 |
| 2 | 通用控件树与 SDK 契约 | 多控件组合、属性更新、事件和销毁完整运行 |
| 3 | 布局、文字与渲染基础 | 嵌套布局、文字、裁剪和多 DPI 绘制稳定 |
| 4 | 完整 Button | 从公共 TS API 到原生对照的完整控件闭环 |
| 5 | 动画与材质 | 可中断动画与真实背景采样 Acrylic 同时运行 |
| 6 | 基础控件、输入和滚动 | 可组合页面及中文输入、选择、滚动协同运行 |
| 7 | 浮层、集合与导航 | 层级、焦点恢复、虚拟化与导航复杂交互通过 |
| 8 | 复杂控件及宿主集成 | 按控件逐项关闭复杂编辑、模板和媒体差异 |

### 阶段 1：固定基准与建立对照工具

1. 核对固定 Gallery 提交、实际解析的 SDK/NuGet 版本及 WinUI 源码基准，保留来源和关键文件 SHA-256。
2. 区分仓库 XAML、SDK 资源和运行时最终取值；追踪资源字典与模板引用。
3. 统一原生与浏览器的示例数据、尺寸、DPI、主题、强调色和字体条件。
4. 建立截图、关键几何和动画采样脚本，记录采样时刻与运行命令。
5. 原生探针使用同版本 SDK；现成 Gallery 可执行文件与源码提交的对应关系尚未证明时，应明确登记。

阶段出口：至少一个示例能够重复进行同条件静态对照与动画采样。参数相同、源码映射或肉眼观察不能单独构成等价验收。

### 阶段 2：通用控件树与 SDK 契约

1. 建立可组合节点、父子关系、稳定句柄、属性变更和失效传播机制。
2. 建立资源引用、主题切换、模板部件及视觉状态所需的最小契约。
3. 明确事件通知、同步取消、重入、受控属性、解绑和幂等销毁行为。
4. TS 封装内部协议、ID 和内存细节；普通调用具有合理默认值，高级功能通过可选配置开放。
5. Rust/TS 封闭取值枚举统一生成或校验，提供 JSDoc、运行时导出和类型负例验证。
6. React 包装复用基础 SDK，支持属性差异提交、组件组合和 StrictMode 重挂载。

同一 SDK 根内的可见控件应进入可统一布局、命中测试和合成的场景。Gallery 的不同示例允许使用独立根；同一示例不应因每个控件各占独立 Canvas 而失去组合和背景采样能力。具体内部表面、缓存纹理的数量由后端管理。

阶段出口：容器内组合两个不同控件，通过公共 TS SDK 完成创建、更新、事件订阅/取消和卸载；React 示例走同一套 API。

### 阶段 3：布局、文字与渲染基础

1. 实现首批需要的 Measure/Arrange、最小/最大尺寸、边距、内边距、对齐及布局失效。
2. 建立显示列表或场景执行接口，统一层级、变换、透明度、嵌套裁剪和离屏合成。
3. 及早验证字体测量与绘制一致性，覆盖中文、字重、基线、换行、截断、字体回退和不同 DPR。
4. 在后端接口下建立最小 GPU 路径，覆盖文字、基础形状和裁剪；补充窗口尺寸变化、设备丢失及恢复策略。
5. 以现有 Canvas 2D 路径作为可运行参考，记录更换后端产生的差异；不将 Canvas 测量结果未经验证地当作 GPU 字形布局依据。

中文 IME 和无障碍宿主在此阶段先做最小可行性验证，包括组合输入、候选窗锚点、焦点及可访问名称。完整输入控件在阶段 6 实现。

阶段出口：组合页面在不同 DPI 下能正确布局和绘制，文字测量与最终显示一致；GPU 基础能力及宿主边界有实测依据。

### 阶段 4：以 Button 完成第二个完整控件

1. 追踪 Button 的 C++ 行为、XAML 模板、状态资源及对应 Gallery 示例。
2. 实现标准、强调、轻量样式，以及 Normal、PointerOver、Pressed、Disabled 等适用状态与组合。
3. 验证指针捕获、拖出取消、键盘激活、禁用切换和重复操作。
4. 通过资源系统、模板和共享输入机制实现，避免新增另一套按钮专用基础设施。
5. 同步提供基础 TS 与 React 用法、枚举文档和 Gallery 示例。

焦点规则遵循用户指定例外：保留真实焦点、键盘导航和语义，不绘制浏览器默认或 Rust 模拟的黑色焦点框。原生对照应单独登记该差异，不能因此关闭焦点能力。

阶段出口：Button 经公共 API 调用，并完成浅色、深色、高对比度、关键状态和同条件原生对照；原有 NavigationView 回归不退化。

### 阶段 5：动画与材质闭环

1. 将现有时间线推广为首批控件可复用的动画能力，支持延迟、缓动、多属性轨道和完成通知。
2. 明确逻辑目标值与当前呈现值，支持连续中断、反向、取消、重入和销毁。
3. 根据固定源实现重建应用内 Acrylic 效果图，核对模糊、luminosity、tint、noise、混合顺序、采样和透明度处理。
4. 用移动、滚动和动画背景验证真实背景采样及图层关系，同时验证裁剪和多层透明内容。
5. 实现减少动画、减少透明度、高对比度及必要的材质回退；区分应用内材质与需要宿主支持的桌面背景效果。
6. 验证资源缓存和释放，记录帧耗时与 GPU 完成时间的测量边界。

阶段出口：“文字 + Button + 可移动背景上的 Acrylic 面板 + 可中断动画”在同一场景稳定运行，并保留原生逐帧对照和差异记录。

### 阶段 6：基础控件、输入与滚动

推荐依赖顺序：TextBlock、Image 和必要布局容器 → ToggleButton、CheckBox、RadioButtons、ToggleSwitch 等选择控件 → ScrollViewer 与 TextBox → 建立在这些能力上的其他基础控件。具体批次按官方模板依赖调整。

- 共享控件行为、主题和状态机制，保留各控件独立的动画与资源规则。
- 验证滚轮、触摸、滚动范围、嵌套裁剪和焦点项进入可视区域。
- TextBox 完成中文组合输入、光标与选择、复制粘贴、撤销和宿主坐标同步。
- 无障碍投影与 Rust 场景保持同一份可用性、选择、展开和焦点语义。
- 每个控件同步实现对应 Gallery 示例、最简单调用与必要高级用法。

阶段出口：通过组合页面验证多个控件共同工作，输入、滚动、主题和焦点不互相破坏。

### 阶段 7：浮层、集合与导航

推荐依赖顺序：Popup/Flyout 基础 → AutoSuggestBox、NumberBox（含 Compact 浮出） → MenuFlyout、ToolTip、ContentDialog 等浮层控件 → ItemsRepeater、ListView/GridView 与虚拟化 → TreeView 和导航控件的完整行为。

- 浮层统一处理根级合成、定位避让、层级、关闭生命周期、焦点约束与恢复。
- 集合统一处理稳定身份、选择、键盘导航、尺寸测量和可见窗口；大型数据集验证 CPU、内存和实际挂载数量。
- 将已实现的 NavigationView 接入成熟的布局、动画、内容和浮层机制，再逐项补齐 Top overflow、层级和内容转场等差异。
- 按依赖扩展 TabView、SelectorBar、CommandBar、日期时间及其他复杂组合控件。
- 官方 TableView 不实现；社区 TableView 如需实现，遵循已指定基准与范围。

阶段出口：嵌套浮层、数据更新、虚拟滚动、导航切换和快速重复操作均有行为与原生对照证据。

### 阶段 8：复杂控件与宿主集成

在基础机制稳定后，推进 RichTextBlock/RichEditBox、复杂自定义模板、媒体适配等工作。复用阶段 3 与阶段 6 验证过的文字、输入、无障碍和宿主边界。

各控件独立列出完整功能、依赖、可实现项、平台限制和验收证据。官方 TableView、Chart / Charts、Sound、WebView2、MapControl、InkCanvas、InkToolbar、无关 Windows 系统 API 及其他明确排除项不因 Gallery 中存在入口而加入实施清单。

## 全程关键要点

- **组合优先。** 同一场景共享坐标、层级、裁剪、事件和背景采样契约。
- **早验证高风险依赖。** 字体、GPU、IME、无障碍和材质采样在大量控件定型前验证。
- **API 与实现一起验收。** 公共接口简洁、功能完整；合法枚举可补全，裸字符串及错误成员编译失败。
- **资源和模板可追溯。** 修改提取器或原始定义后再生成；不手写第二套无来源常量，不静默跳过不支持语义。
- **动画由 Rust 执行。** TS 可提供宿主时钟，Rust 推进状态与呈现值，避免 React 每帧维护镜像状态。
- **每批次同步 Gallery。** 运行示例、Options、Output 和源码保持一致，不使用静态图片代替交互控件。
- **每批次同步对照。** 原生验证不留到全部控件完成后；逐项区分已实现、已运行、已对照与剩余差异。
- **性能看完整链路。** 记录生产构建下的加载、初始化、输入到显示、帧耗时分位数、内存与测量限制，不用微基准推导整体提速。

## 当前建议的下一批工作

基础控件补充批已实现 InfoBar、PersonPicture、RatingControl、SplitButton、ToggleSplitButton 的 Rust/TS/React 切片和九个示例，见 [本批范围与原生差异](compact-controls.md)。SplitButton 系列复用阶段 7 的 Flyout/MenuFlyout，现已接入真实 GridView/ItemsWrapGrid 与 VariableSizedWrapGrid 色板；RichEditBox、任意模板、Store 呈现时序仍未接受。补充原生探针已证实 RatingControl 占位值在固定源码与解析 SDK 二进制间的差异，采用实测 SDK 行为并保留证据。

阶段 7 首批已接入 Popup、ToolTip、Flyout、MenuFlyout、Slider，含默认 Slider ToolTip；[五控件范围与验收](overlays.md)。高级浮层/菜单、完整时序、TickBar 仍未完成。AutoSuggestBox 与 NumberBox 可开始复用这套设施，其完整依赖出口仍须逐项验证。

组合控件批已接入 AutoSuggestBox、NumberBox、ComboBox、ContentDialog、TeachingTip 的 Rust/TS/React 实现和 13 个对应示例，包含 100 个同版原生静态状态、368 帧实时开合采样、区域格式与表达式、虚拟化项模板、模态取消/deferral 和 Hero 内容。其实现完成度与尚未接受的原生细节分开记录，见 [批次状态与验收边界](composed-controls.md)。

导航与层级批已接入 FlipView、PipsPager、BreadcrumbBar、TreeView、TabView 的首批 Rust/TS/React 实现，含 21 个示例入口、60 个同版 SDK 静态状态及独立 Store Gallery 交互观察。高级原生惯性、完整标签过渡、多窗口撕出和跨树结构化拖放仍未完成，见 [范围和验证](navigation-controls.md)。

集合批已实现 ItemsStackPanel、ItemsWrapGrid、VariableSizedWrapGrid、ListView、GridView 的统一单元布局与虚拟化切片，含十个 Gallery 示例、普通 SDK/React 项模板、四种选择模式、键盘/触摸及滚动回收。两主题同版 SDK 原生静态矩阵、十万条容量和生命周期检查见 [集合控件范围与证据](collections.md)。分组、拖放、增量加载、异高虚拟化、完整 UIA 和 Store 呈现时序仍待推进。


6.8 已扩展 IconElement，并实现七种内置 AnimatedIcon 与 Rectangle、Line、Path、Polygon、Polyline 的首个切片，见 [来源与验证边界](animated-icons-shapes.md)。后续先补既有控件的剩余验收与共享设施；不能把 Shape 显式尺寸或动画冻结帧矩阵当作完整布局/呈现时序验收。

阶段 6.7 已加入 FontIcon、SymbolIcon、PathIcon、BitmapIcon、ImageIcon 及 InfoBadge 官方组合修正，见 [图标记录](icons.md)；阶段 6.6 已加入 Border、Canvas、HyperlinkButton、Expander、InfoBadge 及进度条端点修复，范围见 [五控件记录](five-controls.md)；6.5 已加入 RepeatButton 与 Viewbox，6.4 已补齐 ProgressBar、ProgressRing 和 ToggleSwitch 的 ProgressRing 依赖，6.3 的 ScrollViewer、TextBox、PasswordBox 切片继续保留；同时保留 6.1/6.2 的基础与选择控件示例；其余能力按以下依赖推进：

1. Viewbox 已提供独立控件、官方内容组合示例和分数 DPI 原生对照；继续补齐 TextBlock/Image 高级能力及其余必要容器。
2. 继续补选择控件的原生逐帧/中断验收与高级模板能力；ToggleSwitch 示例的 ProgressRing 依赖已在 6.4 补齐，进度控件验证边界见 [进度控件](progress.md)。
3. 6.3 实现 ScrollViewer、TextBox、PasswordBox 的可运行切片，范围及原生差异见 [文本与滚动记录](text-scroll.md)。继续补齐 DirectManipulation 惯性、RTL/复杂文字选择与原生候选窗验收。
4. AutoSuggestBox（ItemsControl）与 NumberBox（Control）采用组合文本输入，并非继承 TextBox。其建议列表及 Compact 步进按钮依赖 Popup；推迟到阶段 7，先建立根级定位、避让、焦点恢复、关闭和动画设施，再完整实现，不提前发布缺少浮层的接口。
5. Slider 首批接口已随 Popup/ToolTip 基础设施加入，默认拖动数值提示已接入；显式 source 的 TickBar 已在滚动基础控件批加入，自动 TickPlacement 模板插槽、更多 SnapsTo 和高级模板等仍待补齐，见 [滚动基础控件记录](scroll-primitives.md) 及阶段 7 差异记录。
6. 保持 Button、NavigationView、动画/材质的现有回归；阶段 5 的精确时序与材质质量差异继续登记。

集合批在 2026-11-08 补齐了分组/粘性标题、SDK 应用内拖放与重排、增量加载、位置锚定和恢复、右键示例；跨列表提交改为无呈现的 Rust 事件协商，修复回收源 DOM 后缺少 dragend 的收尾问题，并加入原生新增/位移轨道。范围、实际发行版观察和仍未完成的逐帧验收见 [集合控件记录](collections.md)。这不代表完整 ItemsControl/UIA/Composition 已完成。

## 微软架构参考

以下链接核对日期为 2026-11-07。官方文档用于理解分层与契约，具体数值及行为仍以项目固定源码和 SDK 为准。本路线的阶段划分是项目实施建议，并非微软发布的移植顺序。

1. [Visual layer overview：视觉层架构](https://learn.microsoft.com/en-us/windows/apps/develop/composition/visual-layer)。微软将 XAML 控件框架、Composition 视觉层和 DirectX 图形层分开；视觉层承载内容、效果和动画。对应本项目的控件、场景/效果和渲染后端分层。文档还说明外部内容的采样限制，应据此区分应用内场景与宿主背景。
2. [Use the Visual Layer with WinUI XAML：XAML 与视觉层协作](https://learn.microsoft.com/en-us/windows/apps/develop/composition/using-the-visual-layer-with-xaml)。用于参考布局属性与视觉属性的所有权、效果接入和动画联动，帮助明确布局结果、逻辑目标值和呈现值的关系。
3. [Composition brushes：合成画刷](https://learn.microsoft.com/en-us/windows/apps/develop/composition/composition-brushes)。用于参考颜色、图像、效果、遮罩和背景采样画刷的组合方式，为材质效果图和后端接口提供依据。

引用这些分层不意味着 WASM 可以直接运行 Windows Composition，也不保证换用其他渲染后端后自动达到原生像素或时序一致；这些仍由对照验收确认。

2026-11-08 命令与选择批：SelectorBar、DropDownButton、AppBarButton、AppBarToggleButton、CommandBar 已接入 Rust、平铺 TS/React API 和 16 个 Gallery 示例。Pivot 按用户要求移出计划；范围、同版原生窗口对照与验收边界见 [命令控件记录](command-controls.md)。

2026-11-08 共享浮层修正覆盖 Rust 材质采样、缓存、重复底层绘制、主命令展开裁剪和自动高度呈现区域。范围和性能测量限制见 [浮层性能](floating-performance.md)。AppBarSeparator 已接入 Rust、TS/React 和 Gallery，见 [命令控件记录](command-controls.md#主命令展开与呈现区域修复)。

2026-11-08 日期/时间/颜色批已接入：CalendarView、CalendarDatePicker、DatePicker、TimePicker、ColorPicker，包含 Rust 控件树、TS/React、Gallery、66 个同 SDK 状态与选择后布局修复。实测范围和未接受的一致性项目见 [批次进度](picker-controls.md)。

2026-11-08 下一批集合与刷新控件：ItemsRepeater、StackLayout、UniformGridLayout、RefreshContainer、RefreshVisualizer 的 Rust 实现、公共 TS/React 调用与 Gallery 已接入。布局对象保持原生非 UIElement 语义；范围和验证边界见 [本批记录](repeater-refresh.md)。

2026-11-08 菜单与布局批已实现 MenuBar、MenuBarItem、CommandBarFlyout、RelativePanel、WrapPanel 的 Rust/TS/React 切片及八个示例。用户选定命令模型后续再做。范围、24 个同 SDK 状态、实际交互与剩余原生差异见 [本批记录](menu-layout-controls.md)。

2026-11-08 视图与命令批：SplitView、SemanticZoom、ParallaxView、UICommand、StandardCommand 已接入 Rust Scene、类型化 TS/React API 和六个 Gallery 示例。UICommand/StandardCommand 分别实现 XamlUICommand/StandardUICommand，公共导出附有原类型映射注释。来源、原生静态对照及尚未验收范围见 [视图与命令](view-commands.md)。

2026-11-08 集合与刷新页面已按固定 Gallery 的 ItemsRepeater 7 个用例、PullToRefresh 2 个用例重做，并增加 Rust FlowLayout、Gallery ActivityFeedLayout/VariedImageSizeLayout 依赖、滚动缩放与自定义刷新内容槽位。来源差异及验证边界见 [用例对齐](repeater-gallery-alignment.md)。

2026-11-08 集合、分页、布局与富文本批已接入 ItemsView、AnnotatedScrollBar、PagerControl、LayoutPanel、RichTextBlock，逻辑与模板位于 Rust，TS/React 仅调用公共 SDK。十个运行示例、原生状态与尚未覆盖范围见 [本批记录](reading-controls.md)。

2026-11-08 内容承载与页面导航批：ContentControl、ContentPresenter、UserControl、Page 与共享 SceneFrame 已接入 Rust/TS/React 和五个 Gallery 入口。SceneFrame 复用既有 Rust Frame 核心；40 个同 SDK 内容布局状态及验证边界见 [本批记录](content-hosts.md)。

2026-11-09 滚动与模板基础控件批：ScrollBar、Thumb、TickBar、ScrollContentPresenter、ItemsPresenter 已接入 Rust Scene 与公共 TS/React API。48 个同 SDK 参考状态、36 个算法/布局矩阵状态、浏览器生产验证与剩余范围见 [本批记录](scroll-primitives.md)。
