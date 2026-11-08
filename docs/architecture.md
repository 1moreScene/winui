> 阶段 1–4 最新架构与验收见 [阶段记录](stages-1-4.md)。本页保留 NavigationView 来源及其剩余差异。

# NavigationView 首批架构与来源

## 所有权与目录

根目录 Cargo 包 `winui-wasm` 同时输出原生可测的 rlib 和浏览器 cdylib。`model.rs` 定义属性、菜单树与输入；`navigation.rs` 持有选择、焦点、展开、按下、关闭请求、布局和时间线；`layout.rs` 提供无副作用 Measure 与提交 Arrange 的契约。稳定业务节点 ID 在替换菜单数据时保留，不是内存指针。

`render.rs` 生成 Rust display list，并通过可替换 Canvas 2D 后端直接绘制。TS 只提供 canvas、尺寸、DPR、输入和 RAF 时钟，不计算控件布局或逐属性推进动画。选用 Canvas 2D 是为了先建立字体、几何、交互、生命周期的可运行验证，减少 WebGPU 字形 atlas、设备恢复与 pipeline 调试对首批的影响。阶段 3 新增 Rust WebGL2 backend，执行同一显示列表；WebGPU 尚未实现。

`gallery/src/index.ts` 是不依赖 React 的公共 SDK 入口。一次 `WinUI.create()` 为多个控件加载 WASM；每个控件获得单调分配且不复用的 Rust handle。`gallery/src/react.tsx` 只负责宿主挂载、属性差异提交、事件回调与卸载，使用同一公共 SDK；开发模式 StrictMode 双重 effect 也会释放旧控件。

浏览器用 DOM button 投影 Rust 排列后的交互部件，负责浏览器焦点和基本可访问名称。其几何、可用性、选择、展开值均来自 Rust。Canvas 绘制可见界面，DOM 不绘制第二套控件。完整 UIA/ARIA 层级、自动化 peer、屏幕阅读器与虚拟化验收尚未完成。

## 官方来源

来源快照与 SHA-256 位于 `references/baseline.json`；已把已审计的 22 个 WinUI 源文件存入 `references/winui/`，常规构建不访问网络或其他仓库。

| 行为 | 原实现 | 本项目 |
| --- | --- | --- |
| Auto 宽度阈值、强制布局 | `NavigationView.cpp::UpdateAdaptiveLayout`，generated properties | Rust mode/adapt，641 / 1008 DIP |
| 48 DIP compact、36 DIP item、3×16 DIP indicator | `NavigationView_themeresources.xaml` | `build.rs` 在每次需要时解析 XML 并生成带来源 IR |
| 命名部件和视觉状态 | `NavigationView.xaml`、item presenter 模板 | Rust Part 与选中/悬停/按下/禁用/焦点样式子集 |
| 层级与 SelectsOnInvoked | `NavigationViewItem.cpp`、Gallery hierarchy snippet | Rust 子树展开与不可选择父项 |
| 关闭取消、选择与调用事件 | `NavigationView.idl`、`NavigationView.cpp` | Rust 关闭握手与 TS 同步回调 |
| Pane 开关动画 | `SplitView_themeresources.xaml`、`NavigationView.xaml` | 350ms 开、120ms 关，bezier(0.1,0.9,0.2,1)，连续采样后反向 |
| 指示器 | `NavigationView.cpp`，600ms keyframes | 600ms 两阶段伸缩与透明度；中断采样两条边界，避免连续重定向累积长度；Composition 逐轨精确等价尚未验收 |

`references/navigation-template.json` 是可审计的提取结果，真正编译时使用 build.rs 生成的 OUT_DIR IR。必需资源缺失、不是 Double 或含不支持的标量表达式时构建失败。`references/template-report.json` 枚举原模板出现的节点与延迟表达式；没有完整通用 XAML 执行器，不能把清单中的全部节点视为已支持。

TS/Rust 的 ThemeMode、PaneDisplayMode、ItemKind、DisplayMode、EventKind 来自 `references/api-enums.json`。`tools/generate-enums.mjs` 生成两端代码，`--check` 检测漂移。所有公共封闭属性接受枚举，开放的文本/业务 ID/颜色字符串不被虚构成枚举。

## 本轮新增

`resources.rs` 解析固定 XAML 中所需的 ThemeResource 别名，叶子颜色和 AcrylicBrush 参数由匹配 NuGet 的原生探针导出。必需资源缺失或无法解析时构建失败。HighContrast 为固定回退，不代表用户自定义系统高对比度主题。

`material.rs` 移植 AcrylicBrush 的有效 tint 与 luminosity 计算；Rust Canvas 后端执行 30px blur、luminosity/color 混合、固定源码的 256×256 noise（0.02）与 167ms 策略切换。expanded pane 使用 Gallery 覆盖配方。保持 SplitView 绘制顺序，避免后绘制内容错误进入 inline pane 的 backdrop。Canvas 与 Composition 的模糊核、边缘和 blend 色彩空间仍可能不同。

`tools/extract_content.rs` 构建时把固定 Gallery 的 SamplePage1–7 和 SampleSettingsPage 转为类型化内容树。Rust `content.rs` 负责 Grid 的 Pixel/Auto/Star、跨度、StackPanel、ScrollViewer、TextBlock、Ellipse、边距、对齐和所用样式。未知节点、样式或属性会构建失败；只支持这批页面所需语义，并非通用 XAML 解释器。

本轮修正 back/toggle 行、菜单起始位置、顶部项宽度、footer 间距、内容区左上圆角/边框、标题大小/边距、主题状态色和滚动裁剪。键盘可将屏幕外菜单项滚入可见范围。测试和差分范围见 validation.md。

全局不绘制 CSS 或 Rust Canvas 焦点黑框，是用户明确指定的原生外观例外；保留真实焦点、Tab、方向键与选中状态。快速往返点击导致指示条拉长的问题及修复见 bugs.md。

## 当前差异与限制

- Canvas 字体栅格化与原生 DirectWrite 不完全相同；依赖本机 Segoe UI/Fluent Icons。AnimatedIcon 路径和独立时间线尚未移植，目前使用静态字体图标，尤其 back/settings 有可见差异。
- Acrylic 配方已经执行，但未达到 Composition 逐像素等价；只做应用内 backdrop，不包含系统窗口 Acrylic。
- 原生动画截屏单次约 150ms，已记录实际区间，不能将请求时刻当作帧时间；精确逐帧验收仍未关闭。
- Top 完整 overflow 选中项提升/恢复、嵌套 flyout 完整键盘策略、compact 层级 flyout、虚拟化和 gamepad 尚未完成。
- 已支持这批静态内容节点；Frame 内容切换动画、任意 XAML 模板、InfoBadge、API in action 的 AutoSuggestBox/PaneCustomContent/PaneFooter 尚未实现。Gallery 外层页面及 Options 仍有组织与样式差异。
- DOM 提供基础焦点与可访问名称，完整 UIA/ARIA 层级、屏幕阅读器、自定义系统颜色尚未验收。浏览器 IME/剪贴板/媒体应通过显式宿主接口扩展。

## 后续成本估算

以一位熟悉代码的工程师估算：完整 overflow/compact flyout 焦点与恢复约 2–4 天；AnimatedIcon、Frame 转场及精确动画采样约 3–5 天；AutoSuggestBox 与 pane 插槽约 3–5 天；Gallery 外层与辅助功能验收约 2–4 天。上述估算来自早期 NavigationView 批次；GPU 基础和本批应用内 Acrylic 已在阶段 5 交付，其余 Composition 材质/API、核质量与完整原生组合矩阵需重新逐项评估。这些是剩余成本，不是已验证能力。


## 阶段 5 补充

共享 Scene 现已支持 Rust 多属性呈现轨道、完成通知、连续中断/反向/取消，布局属性与视觉目标分离，命中测试和 DOM 投影使用当前呈现矩阵。公共 API 与生命周期见 api.md。

Acrylic 从固定源码提取效果常量，Canvas 与 GPU 都采样有序的场景下层内容，并携带透明隔离组的祖先 backdrop。GPU 使用独立 root framebuffer、降采样双向 Gaussian、luminosity/color 混合和原始噪声；不会把整张 Canvas 栅格化结果上传冒充 GPU 材质。资源按尺寸复用，场景销毁和 context restore 有回归。

阶段 5 新增 UI Rendering 属性与逐帧屏幕捕获，已有 84 帧重放、实际时刻和差异；上述早期约 150ms 的 NavigationView 采样限制仍适用于原采样工具。精确 compositor present 时间与像素等价继续未接受。WebGL2 基础与本批 Acrylic 已交付，不再属于待建立的后端；后续成本主要在完整材质/动画 API、核质量和原生组合矩阵，见 stage-5.md。
