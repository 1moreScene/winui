# 视图与命令批

本批为 SplitView、SemanticZoom、ParallaxView、UICommand、StandardCommand。公共 API 中的 **UICommand 实现 WinUI XamlUICommand，StandardCommand 实现 WinUI StandardUICommand**。基础 SDK 导出、工厂、类型、控制器和 React 组件均附有对应 JSDoc；采用这些名字不要求 XAML 解析器。另一个会话的 MenuBar、MenuBarItem、CommandBarFlyout、RelativePanel、WrapPanel 不属于本批。

控件布局、状态、命中测试、主题绘制、视差表达式、动画和命令协商全部位于 Rust `src/scene/view_controls.rs`。TS 只转换类型化属性、传递句柄和业务参数、投影无障碍节点并分发回调。React 使用相同工厂，未增加第二套布局或命令状态。

## 使用

```ts
import { WinUI, StandardCommandKind, SplitViewDisplayMode } from './index';
const ui = await WinUI.create();
const scene = ui.scene(host);
const save = scene.root.standardCommand({ standardKind: StandardCommandKind.Save });
const unsubscribe = save.onExecuteRequested(event => saveDocument(event.parameter));
const button = scene.root.button({ command: save, commandParameter: documentId });
save.update({ canExecute: false }); // Rust 更新所有绑定控件的可用性
save.update({ canExecute: true });
save.onCanExecuteRequested(event => { event.canExecute = hasPermission; });
save.execute(documentId);
const metadata = save.metadata; // Rust 解析后的标签、说明、图标、快捷键及共享 gate
unsubscribe();
save.dispose(); // 注销待处理通知、断开绑定；不销毁业务对象
scene.dispose();
ui.dispose();
```

React 的属性直接平铺，原类型映射也写在组件声明上：

```tsx
import { UICommand, StandardCommand, Button, SplitView } from './react';
<StandardCommand standardKind={StandardCommandKind.Save}
  canExecute={canSave} onReady={setSaveCommand}
  onExecuteRequested={event => saveDocument(event.parameter)} />
<Button command={saveCommand} commandParameter={documentId} />
<SplitView displayMode={SplitViewDisplayMode.CompactOverlay}
  pane={<NavigationContent />}><DocumentContent /></SplitView>
```

命令的标签、图标、说明和快捷键来自固定 SDK 的标准预设；本机原生捕获的默认语言为中文。调用方可覆盖字符串和图标，之后改变 `standardKind` 不覆盖显式值；传入 `null` 恢复预设，空字符串/空快捷键数组表示显式清空。Save、Copy 等只通知业务回调，不自动保存文件或修改剪贴板。参数须可 JSON 序列化。

`canExecute()` 读取 Rust 的共享 gate（含子命令 gate）；参数相关的 `onCanExecuteRequested` 在每次执行前协商，全部子命令批准后才发出任何执行通知。调用方通过 `canExecute` 属性设置共享可用性；单次请求否决只取消该次执行，不改变共享 gate。`notifyCanExecuteChanged()` 提供通知。跨场景、失效引用、命令环（含原子批次制造的环）均拒绝。销毁过程中尚未分发的通知会跳过已销毁对象。此 API 不复制 COM ICommand 的对象模型或同步参数查询方法。

基础按钮可使用 `command` 属性，任意已有动作节点也可 `bindCommand(command, parameter)`。AppBarButton/AppBarToggleButton 会继承未覆盖的标签及 Symbol 图标，说明自动投影为 Rust ToolTip。MenuEntry、SwipeItem 同样支持 `command` / `commandParameter`，由 Rust 继承元数据和可执行状态；读取属性返回类型化命令对象，销毁命令会清除嵌套绑定。订阅函数返回取消函数；命令执行回调可以更新、再次调用或销毁控件，事件继续走共享的重入队列。

## 三种视图

- **SplitView**：Overlay、Inline、CompactOverlay、CompactInline；左右位置、48 DIP 默认紧凑宽度、320 DIP 默认展开宽度、独立 pane/content 槽、主题背景、可选遮罩、Escape/内容区点击关闭、可取消的 `closePane()`、焦点恢复和可中断开合。直接更新 `isPaneOpen` 是调用方的明确状态设置，不走关闭取消协商。基础 SDK 使用 `pane()` 和 `content()` 返回可组合 Panel。窗格绘制裁剪与命中裁剪使用相同的 Rust 矩形。
- **SemanticZoom**：保留两棵子树，切换时禁用非活动子树输入；167 ms 来源化淡入淡出；分组标题缩小、概览组项返回并定位详细组、Ctrl 加减、Ctrl 滚轮、双指连续缩放、`canChangeViews` 和 `navigateToGroup(key)`。双指阈值/迟滞来自固定 C++；可选缩小按钮在鼠标移动后淡入，3 秒延迟后淡出。基础 SDK 使用 `zoomedInView()` / `zoomedOutView()` 槽，React 使用同名属性。固定 SDK 样式及本批 Gallery 示例默认不显示缩小按钮。
- **ParallaxView**：直接关联同场景 ScrollViewer/ScrollView/ListView/GridView，支持正负双轴位移、最大比例、夹取、Relative/Absolute 源偏移、缩放及源内容内/外定位。Rust 复用滚动呈现偏移，按源码 Measure/Arrange 规则扩展子元素并裁剪；移除源后自动断开。ScrollView 相对源范围保留现代滚动宿主的 viewport underpan 规则。调用方不需要滚动回调或逐帧更新。

## Gallery 用例对齐

六个运行用例读取同一固定 Gallery 的完整 runtime XAML 和 `ControlInfoData.json`，源码面板展示实际运行的 React 调用及原始 XAML。126 条目录数据中的范围外名称仅作为原始数据文本，不创建被排除的控件或页面。

- SplitView：400×300，初始 Inline/open、展开 256、紧凑 48；People/Globe/Message/Mail 的原始图标和左右模板、页面输出，以及原始 IsPaneOpen、Placement、DisplayMode、PaneBackground 和两个长度滑块。
- SemanticZoom：500 高的完整分组 GridView、标题/副标题模板，以及组概览 ListView；移除自创的切换按钮和演示分组。
- ParallaxView：完整排序目录、可滚动的原始页眉、半透明黑色列表背景；第二例为真正的 Rust ScrollView 和原始顺序的 19 个 150 高色块，均使用 cliff.jpg、VerticalShift=500。对照视口统一为 640×600；Gallery 的 750 高 ControlExample 还包含外层标题和源码区域。
- XamlUICommand：原始介绍、Favorite AppBarButton、Ctrl+D、标签和说明，以及 `You fired the custom command` 输出。
- StandardUICommand：原始介绍、File/Edit/Help 菜单、15 个 60 高列表项；悬停删除按钮、Edit/Delete、Delete 快捷键、右键菜单和触摸 Execute 滑动共用 Delete 命令，React 回调仅删除业务数据。

为原始用例补充了 Rust ScrollView、SwipeControl（方向动作集合及 Reveal/Execute）、集合页眉和通用容器指针通知。它们复用同一布局、滚动、命令与生命周期引擎。ScrollView 当前提供与 ScrollViewer 共享的类型化滚动接口，尚未覆盖全部 ScrollPresenter 交互源和惯性配置；SwipeControl 的复杂边缘阻尼/全部原生回弹轨迹仍需进一步对照。

同时修复共享文字换行：当一个单词超过行宽时，按完整 grapheme cluster 继续分行。原始 `Custom XamlUICommand` 标签因此恢复原生三行及按钮自然高度；不通过为该示例设置固定高度掩盖差异。集合二次排列也保留视图槽的可见性，关闭状态的滑动动作不会覆盖悬停按钮或进入无障碍树。

StandardUICommand 的两主题示例还覆盖共享 MenuBar 的 `Dark` → SDK `Default` 字典映射，防止深色菜单绘制读取空画刷。原生尺寸检查同时要求浏览器无页面异常。

## 来源与验证

固定 Gallery commit `7360ac322414e118eadfb0c7c2f4ecc31a218f59`，固定 WinUI 源码 `7b12709347527238494ca28cb9fed326d513e779`。`references/view-command-sources.json` 保存 59 个源文件的 Git blob 与 SHA-256；`official-view-command.json` 保存六个实际 Gallery 示例、选项 XAML、介绍和完整目录数据。SDK 模板为 `Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental`，指纹及模板投影见 `references/view-command-template.json` 和 `references/sdk/view-command.xaml`。

开合时间直接从解析 SDK 的 SplitView storyboard 提取：Overlay/CompactOverlay 展开 350 ms、收起 120 ms；Inline/CompactInline 展开 200 ms、收起 100 ms，使用各自 KeySpline。固定源码对应部分值不同，保留两者，不混用。SemanticZoom 的 FadeIn/Shown、FadeOut/Hidden 由同机 Windows AnimationMetrics 读取，均为 167 ms 线性；这是动画参数证据，尚非发行版逐帧呈现验收。

同版原生探针记录 42 个静态状态（SplitView 32、SemanticZoom 4、ParallaxView 6），两主题，保存原生程序集、SDK 和截图指纹。新增 `tools/native-view-gallery` 直接载入原始 Gallery runtime XAML、样式和目录数据，另采集六个实际示例的两主题状态，见 `references/validation/view-gallery-native.json`。浏览器独立服务使用端口 54837，测试调用公共 SDK/React 接口，另有 32 个 SplitView 状态在每种绘制后端的静态对照。最终运行结果与当前 WASM 指纹见 `references/view-command-status.json`。

```powershell
python tools/fetch-view-command.py
python -X utf8 tools/extract-view-command.py
powershell -File tools/run-view-command-native.ps1
powershell -File tools/run-view-gallery-native.ps1
cargo test --test view_commands --test command_controls --test navigation_controls --test overlays --test scene
npm --prefix gallery run build:wasm
cd gallery
npx playwright test -c playwright.view-commands.config.ts
```

## 尚未验收

这批是可运行 Rust SDK 实现，不表示完整原生等价。SemanticZoom 的原生 ISemanticZoomInformation 任意扩展点和 Windows 回退键集成未移植；双指与按钮延迟淡出已实现并测试，但尚未完成发行版动画逐帧验收。SplitView 的复杂嵌套焦点约束、完整模板边框/圆角和发行版逐帧动画仍需补充；ParallaxView 的 DirectManipulation 弹性越界和复杂旋转祖先组合尚未对照。标准命令当前预设语言来自本机原生资源，不提供完整 WinUI 多语言资源包。字体光栅化、完整 UIA 和 Store Gallery Composition 呈现差异继续保留；静态几何与平均像素误差不证明这些能力已完成。

统一类型检查还修正了 RepeaterRefreshPage 的示例键类型，使新增来源元数据键不会被当成带有 XAML 的示例。
