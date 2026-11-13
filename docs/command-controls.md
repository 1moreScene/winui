# 命令与选择控件批次

2026-11-08：本批为 **SelectorBar、DropDownButton、AppBarButton、AppBarToggleButton、CommandBar**。Pivot 按用户要求移出实现计划。本批默认 Canvas2D，WebGL2 由调用方显式选择；React 组件直接接收类型化属性。

## 来源和原生对照

沿用 Gallery `7360ac322414e118eadfb0c7c2f4ecc31a218f59`、WinUI `7b12709347527238494ca28cb9fed326d513e779`、WindowsAppSDK `2.5.4-experimental` / WinUI `2.3.10-experimental`。`references/command-controls-sources.json` 验证 47 个固定源码文件的 Git blob 和 SHA-256；`references/command-controls-template.json` 提取实际 SDK 的 36 个样式、169 个画刷及模板/动画资源。Gallery 示例文件、五个 SamplePage 和 Slices2 图片均从固定 commit 读取，指纹在 `gallery/src/official-command-controls.json`。

`tools/run-command-controls-probe.ps1` 使用相同 SDK 生成 52 个浅/深色原生状态、视觉树尺寸、画刷实值、RenderTargetBitmap 与仅捕获自身客户区的 PrintWindow 合成截图。**RenderTargetBitmap 会漏掉合成画刷和 Popup，不能单独用作这些视觉的参考图。** 本批图片比较使用新增的 `*-window.png`（PW_CLIENTONLY | PW_RENDERFULLCONTENT），避免其它应用遮挡污染参考图。独立窗口 Popup 的像素不会被该 API 捕获，因此图像指标只计算客户区控件；浮层另用实际 Popup 视觉树测量验证尺寸和位置。窗口探针仍属于独立的同版 SDK 原生程序，不等于 Store Gallery 发行版逐帧验收。

## 已接入的行为

| 控件 | Rust 行为和模板 |
|---|---|
| AppBarButton | 68 DIP 默认宽度、16 DIP 图标 Viewbox、12 DIP 标签、标签换行、紧凑/折叠标签、内缩悬停底板、快捷键、Flyout 箭头与附加浮层 |
| AppBarToggleButton | 三态循环、禁用/悬停/按下资源、溢出后的勾选列及稳定状态 |
| DropDownButton | 普通 Button 边框和画刷、内置 ChevronDownSmall AnimatedIcon、真实 Flyout/MenuFlyout、键盘展开与焦点恢复 |
| SelectorBar | 可为空的初始选择、稳定 ID 数据、禁用项目、方向键/Home/End、单个 Tab 入口、RTL、167 ms 项目独立指示条动画 |
| CommandBar | 右侧主命令、次命令、分隔符、动态溢出顺序、原节点重挂接、切换状态与业务对象保留、Compact/Minimal/Hidden、Sticky、命令事件、键盘和关闭后的焦点恢复 |

CommandBar 的官方依赖是内部 Popup 与 CommandBarOverflowPresenter；这里复用 Rust 的根级浮层宿主，使用独立的 CommandBar 动画配置、画刷、贴边位置和内容布局。它没有使用手写 DOM 菜单。DropDownButton/AppBarButton 附加的内容则是已有的 Flyout/MenuFlyout。MenuFlyout 的共享图标列及右侧贴边定位也在本批补齐。

画刷过渡 83 ms、CommandBar 展开 250 ms/收起 167 ms 与曲线由实际 SDK 模板提取。SelectorBar 页面切换示例使用固定 `ThemeTransitions.cpp` 的水平 Slide 参数：旧页 150 ms/150 DIP，新页 300 ms/200 DIP；动画执行和中断仍由 Rust 负责。闭合次命令的快捷键不受其临时浮层不可见状态影响。

Gallery 已接入 16 个官方示例及实际 JSX 源码片段：图标、三态、Ctrl+S、编辑浮层、邮件菜单、五页切换、颜色集合和动态增删次命令。TS 只传显示元数据与稳定 ID，完整业务对象留在 TS；CommandBar 事件保留业务对象身份。

## 验证和边界

具体测试次数、当前验证二进制、独立服务及差异数据由 `references/command-controls-status.json`、`references/command-controls-visual.json` 记录。独立 Gallery 使用 5197 端口，服务启动时冻结 WASM、JS 胶水、构建戳与应用源码，避免另一会话的构建替换测试内容。

### 2026-11-08 修正

点击 **Add secondary commands** 导致其它按钮消失，是 Rust 局部更新错误：`commandControls` 被整体替换，未提交的 `primaryCommands` 被重置为空，`defaultLabelPosition` 也恢复默认值。现在按字段合并该内部 DTO，未修改的主/次命令保留原 `Arc`，内部 `inside_bar` 模板上下文同样保留。React 调用方式不变。浏览器覆盖四轮增删、浮层打开时替换源、主按钮身份/尺寸/点击事件，以及动态溢出后的切换状态。

DropDownButton 按模板 `BackgroundSizing=InnerBorderEdge` 内缩半透明底色，边框的中心线移入控件边界；此前居中的边框会向外绘制。新增 100%、125%、150%、200% DPR 下的像素越界检查。SelectorBar 指示条改为原生 `RadiusX=.5/RadiusY=1` 随 `ScaleX=1..4` 变化后的椭圆圆角，并检查快速重选过程的绘制栈平衡，Canvas2D 和 WebGL2 共用这份几何。

本轮 236 项 Rust 测试、13 项浏览器操作、104 个同版 SDK 静态状态对照，以及部署后 2 项操作检查通过；主机/WASM 严格 Clippy、TypeScript、Vite 和声明构建通过。新结果位于 `references/command-controls-refinement-visual.json`，记录脚本为 `tools/record-command-refinement-validation.py`。5197 与测试用 5199 的冻结 WASM 和应用快照一致，生产包也包含同一 WASM。初始对照图片和测量仍保留，初始运行时快照已被替换，其历史记录在 `references/command-controls-initial-status.json` 明确标记不再保留。

重新核实 Store Gallery 3.0.4.0 的签名和两个 WinUI DLL 哈希均未改变，见 `references/command-controls-refinement-release-audit.json`。本轮桌面操作在取得可用发行版视觉证据之前被物理 Esc 停止，之后没有继续桌面自动化。上述图像比较复用上轮同版 SDK 探针截图，**不是新增的 Store Gallery 实拍或逐帧验收**。此外，固定版 `CommandBar_Partial.cpp` 明确将 `OverflowContentTransform` 接到 Popup 的 TransitionTarget，使内容、阴影和 SystemBackdrop 一起移动；不能把整个浮层平移直接当作错误而改成只移动文字。

同版窗口静态图、几何测量及浏览器操作验证不能证明完整 WinUI/UIA 或 Windows Composition 逐帧一致。浏览器字体栅格与原生 ClearType、Acrylic 细节和完整展开过程的裁剪/阴影时序仍有差异；触摸模式、AccessKey/完整 UIA、所有长标签及自定义模板组合也尚未完成发行版覆盖。不能据此宣布本批已经像素一致，或阶段 7/8 全部完成。

### 主命令展开与呈现区域修复

AppBarSeparator 使用真实的 Rust 分隔符节点，主命令区为垂直线，溢出区为水平线，两个区域复用同一节点。独立分隔符不接收焦点或点击。Gallery 示例与 XAML 来自固定版本，来源见 `references/command-menus-sources.json` 和 `gallery/src/official-command-menus.json`。

AppBarSeparator 官方示例只有主命令，仍应在点击 More 后展开标签。原实现只切换紧凑模板，缺少主内容的裁剪动画；自动高度宿主只保留 48 DIP，标签超过此高度后被 Canvas 和后面的源码栏遮挡。

现在 Rust 为主命令维护独立可中断轨道，打开 250 ms、关闭 167 ms，使用实际模板提取的曲线。More 的三个点沿用静态 FontIcon；动画发生在命令内容的裁剪区域。关闭中保留完整模板直至结束，快速反向切换从当前呈现进度继续。无动画偏好直接到达最终状态，等色画刷不再启动无效动画。

CommandBar 的逻辑 RenderSize 仍为 48 DIP；展开内容高度从实际主命令测量得到，包括换行标签。自动高度 Scene 在切换开始时预留目标呈现高度，并扩大 Rust 的栅格表面；每帧只推进裁剪，避免反复改变宿主尺寸。命中测试和浏览器坐标映射使用相同呈现范围。显式父级裁剪、滚动区域和固定高度宿主仍遵守调用方的边界。这不等于已覆盖所有 OpenUp、自定义模板或完整 UIA 组合。

相关 Rust、两后端浏览器和同 SDK 静态矩阵结果见 `references/validation/overlay-performance-summary.json`。共享浮层性能修复见 [性能记录](floating-performance.md)。
