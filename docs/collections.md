# 集合控件批：布局、选择与可见区回收

本批按依赖实现 ItemsStackPanel、ItemsWrapGrid、VariableSizedWrapGrid、ListView 和 GridView。Rust 统一持有数据 ID、选择、布局、滚动、虚拟化容器与选中指示条动画；基础 TS SDK 管理业务对象及模板回调，React 包装复用相同句柄和控件。

Gallery 入口：[ListView](http://127.0.0.1:5173/#list-view)、[GridView](http://127.0.0.1:5173/#grid-view)、[ItemsStackPanel](http://127.0.0.1:5173/#items-stack-panel)、[ItemsWrapGrid](http://127.0.0.1:5173/#items-wrap-grid)、[VariableSizedWrapGrid](http://127.0.0.1:5173/#variable-sized-wrap-grid)。共十六个运行示例，源码从实际 React 文件提取。ListView/GridView/VariableSizedWrapGrid 同时展示固定版官方 XAML。独立面板示例明确标记 SDK 扩展，不伪称官方 Gallery 页面。

## 已实现的切片

| 控件 | 行为与来源 |
| --- | --- |
| ItemsStackPanel | 默认 Vertical；堆叠布局；用于 ListView 时按视口和 CacheLength 回收容器。 |
| ItemsWrapGrid | 面板默认 Vertical；GridView 的默认模板改为 Horizontal。固定首项单元尺寸、MaximumRowsOrColumns、双向填充与滚动轴。 |
| VariableSizedWrapGrid | 默认 Vertical；按 C++ OccupancyMap 前向扫描空位，支持 RowSpan/ColumnSpan、首项或显式单元尺寸。 |
| ListView | 默认 Single、IsItemClickEnabled=false；原生 88×40 最小项、16/12 内容边距、圆角背板与 3×16 指示条；None/Single/Multiple/Extended、键盘、Ctrl/Shift 范围选择、禁用项、触摸点击与滚动区分、ScrollIntoView。 |
| GridView | 默认 ItemsWrapGrid(Horizontal)，44×44 最小容器、尾部 4 DIP 间距及底部 10 DIP 留白；选中边框、多选复选框、方向导航与同一选择契约。 |

选中指示条的不透明度 83ms、缩放 167ms 和曲线来自 `ListViewBaseItemPresenter_Partial.cpp`。由 Rust 重定向当前呈现值，快速切换不会累积拉长；reduced-motion 与高对比度 fixture 跳过动画。图像、字体、画刷、裁剪和滚动条共用现有后端；Canvas2D 默认，WebGL2 显式选择。全局焦点黑框例外保持生效，保留真实焦点和 ARIA listbox/option/选中项语义。

## 本轮原生对齐修正

以 Store 发行版 3.0.4 的 ListView/GridView 实际窗口检查页面，再以同 SDK 原始 XAML 模板做统一输入的独立探针。安装包身份、Store 签名、依赖及两个 WinUI DLL 的逐字节一致性记录在 `references/validation/collections-release-audit.json`；发行版原图在 `out/collections-release/`，浏览器页面图在 `out/collections-page-browser/`。

- 恢复联系人示例的边框、350/400×400 尺寸、32 DIP 头像、两行联系人模板及三字段过滤；过滤输入使用真实 SDK TextBox。
- 恢复 GridView 的 190×130 图片、100 DIP 自然比例缩略图及底部标题/点赞遮罩。容器 Margin 控制行列间距，MaximumRowsOrColumns 控制换行。新增官方内容切换示例的四种模板、FlowDirection、点击输出和选择输出。
- 自然高度随模板、宽度、图片解码变化；不再用固定 Scene 高度留下大块空白或截掉后续行。ItemContainerStyle 同时作用于当前与后续回收容器。单元小于项的 MinWidth/MinHeight 时保留原生 RenderSize，允许其溢出单元，由外层 ScrollViewer 裁剪，不再压窄文字内容或按单元截掉 Item 10 等长标签；矩阵逐项检查前四个容器的尺寸和位置。原生 RTL 部件使用 TransformBounds 记录完整可见矩形，避免把镜像后的原点误当左上角而比较到空白区域；共享布局按父 FlowDirection 镜像非对称 Margin。
- 按 CMediaBase 的媒体 Arrange 计算 Image 实际尺寸与布局裁剪；UniformToFill 可以产生大于分配槽的 RenderSize，再由容器裁剪。裁剪边界也先做物理像素取整，修复 125% 下最后半行/整行消失。
- GridView 使用向内边框，而非中心描边。选中外框 2 DIP、悬停外框 1 DIP，内框按 C++ 的嵌套、负 Margin 和重叠顺序绘制；IsOpaqueBrush 仅检查颜色 alpha，画刷 Opacity 不参与嵌套判断。禁用颜色的非嵌套内框绘制在外框之后。
- 共享字体测量保留大字号精度，同时使用浏览器实际接受的字号换算；Chrome 将 16380px 字体限制为 10000px 时，不再把正常文本的基线错误上移。新增 WordEllipsis 的运行时枚举与单词边界截断。Title/Subtitle 模板还保留 OpticalMarginAlignment.TrimSideBearings；共享 TextBlock 通过高精度字形墨迹边界消除两端侧边距，修复大字号文字约 3 个物理像素的横向偏移，普通文本继续使用 None。
- ListView 指示条改为原生的离散布局 Height + 167ms ScaleY，按原生 Storyboard 的在途采样规则替换动画，并保留 83ms 不透明度轨道；补测快速按下/松开和分数 DPR。现代圆角项的 C++ 分支不执行旧版 PointerDown/UpThemeAnimation 倾斜，不能将其误列为缺失动画。

React Scene 在布局阶段创建；采样等待已实现化项的完整模板节点与图片请求结束，避免把初始空模板的 44 DIP 占位尺寸当作终态。并行验证的首帧/焦点失败日志保留在 `out/collections-parity-regression-concurrent-failure.log`。

静态矩阵额外覆盖彩色图片上的悬停、按下、选中、禁用和多选；Title 模板的平均误差另收紧至 4（未补光学边距时约 8.7）。逐例核对选中的容器索引，并分别检查四边 4 DIP 区域，防止大片背景平均后掩盖错误边框。禁用 fixture 在模板实例化后先强制 Enabled 再 Disabled，避免状态已切换而模板子项尚不存在导致的采样遗漏；记录实际 Opacity 和 BorderThickness。

## 公共 API

```tsx
<ListView items={['One', 'Two', 'Three']} />

<GridView
  items={photos}
  selectionMode={ListViewSelectionMode.Multiple}
  renderItem={photo => <Image source={photo.url} width={190} height={130} />}
  itemContainerStyle={{ margin: [5, 5, 5, 5] }}
  onSelectionChanged={e => setSelected(e.selectedItems)}
/>
```

对象数据要求稳定且唯一的 `id`，`text` 默认取 ID，`enabled` 默认 true；其他业务字段保留在 TS，模板与事件按泛型推导。字符串可直接使用，内部按文本及同名出现次数分配 ID；需要稳定更新/重排时使用对象 ID。选择模式、方向和面板种类使用运行时枚举，裸字符串及不兼容枚举由类型测试拒绝。

```ts
const list = scene.root.listView({ items: contacts });
const off = list.onSelectionChanged(e => console.log(e.selectedItems));
list.setItemTemplate((item, container) => {
  container.text({ text: item.name });
});
list.update({ selectedKeys: ['contact-42'] });
list.scrollIntoView('contact-42');
// 可通过 changeView / view / onViewChanged 使用共用滚动设施。
off();
list.dispose();
```

模板只为 Rust 已实现化的条目创建普通 SDK 子控件；React 的 `renderItem` 同样如此。容器由 Rust 独占创建和回收，不能由调用方销毁或迁移；模板内子控件可以正常创建、更新、订阅、清空及释放。数据对象替换后即使 ID 相同也会刷新模板；离开实现化窗口时递归释放句柄、回调及关联资源。原子批更新失败时不提交 TS 业务数据。

ItemClick 是通知，在选择改变前触发。宿主执行回调及回调内的属性更新后，Rust 再根据原请求和稳定 ID 提交选择；回调内移除条目或销毁控件时，不选择已失效条目。SelectionChanged 包含当前完整 selectedKeys/selectedItems。程序直接更新属性后，控制器的选择读取立即与 Rust 一致。

## 性能与资源边界

集合数据上限 100,000 条，ID/文本总计 32 MiB；沿用单 Scene 5,000 活节点上限。默认 CacheLength=4，即额外四个视口；实现化窗口最多 512 项，另保留首项作为尺寸锚。节点预算不足通过 `snapshot.collection.realizationError` 报告，释放容量后可恢复。模板过于复杂仍可能耗尽场景预算。

数据在 Rust 使用共享 Arc，少量属性更新及每帧布局不复制整份集合；选中集合用索引和哈希表处理。诊断快照省略完整 collectionItems/selectedKeys 数据，只暴露总数、选中数和已实现化容器；完整属性可显式读取，常规业务使用控制器 selectedKeys/selectedItems。十万条数据的本机 Chrome 创建耗时、活动节点数和快照字节量记录在 `references/validation/collections-capacity.json`，用于检查规模增长与回收，不作为跨设备性能保证。

当前虚拟化使用统一单元：首项模板测量或显式 ItemWidth/ItemHeight。ListView 的任意异高模板尚未实现；不能把此版本视为原生的完整动态高度虚拟化布局。三个面板允许直接 SDK 子控件是组合扩展；原生 ItemsStackPanel/ItemsWrapGrid 主要作为 ItemsControl 的 item-host，原生对照也放在 ListView 中运行。

## 官方来源与验证

- Gallery 固定 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`，20 个页面/示例输入文件；联系人与八张 LandscapeImage 使用该版本资产并记录 SHA-256。
- WinUI 固定 `7b12709347527238494ca28cb9fed326d513e779`，30 个 C++/头文件/XAML 与固定 Git tree blob ID 比对；清单为 `collections-sources.json`。
- 同版解析 SDK：Windows App SDK `2.5.4-experimental` / WinUI `2.3.10-experimental`。从实际 generic.xaml 提取四个容器模板、69 个 presenter/示例画刷及尺寸和七个原始 Gallery DataTemplate；原生运行提取画刷最终值和部件几何。
- 独立原生探针在两主题、125% DPI 运行 94 例，覆盖列表/网格普通、悬停、按下、选中、多选、禁用及自定义项模板，以及布局面板、跨格占位和实际色板。原生静态采样等待 500ms，避免把 167ms 指示条动画中间帧误当终态。浏览器两个后端各重放 94 例，保留逐项图像和指示条区域误差。
- Rust 独立验证选择顺序/重入、稳定 ID、键盘、触摸、RTL、快速中断、原子更新、占位算法、预算耗尽恢复与销毁；真实 Chrome 检查 React 路由、选择、滚动、SDK 模板变更与回收、十万条容量及 SplitButton 集成。最终结果和指纹见 `references/collections-status.json`。

```powershell
python -X utf8 tools/fetch-collections.py
pwsh -NoProfile -File tools/run-collections-probe.ps1
cargo test --locked
cargo clippy --all-targets --locked -- -D warnings
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
node node_modules/@playwright/test/cli.js test --config playwright.collections.config.ts
node node_modules/@playwright/test/cli.js test --config playwright.collections-regression.config.ts
```

## 分组、拖放与数据变化（2026-11-08）

本轮补齐 ListView 官方十个示例的顺序：基础、选择、双列表拖放、分组、过滤、底部增长的消息、图片、右键删除、保存/恢复位置、ScrollIntoView。加上 GridView 三例、VariableSizedWrapGrid 一例及两个明确标注的 SDK 面板示例，共十六例。

- `groups` 支持稳定组 ID、默认标题及 React `renderGroupHeader`。Rust 测量并回收标题，处理空组、粘性标题、下一组推出和标题下方内容裁剪。GroupStyle 的 12/8/12/0 内容边距、8 DIP 分隔线间距和底部 4 DIP Margin 来自同版原生样式。模板化 Stack 的已测量可变项高按稳定 ID 缓存，以前缀和定位可见窗口。
- `canDragItems`、`canReorderItems`、`allowDrop` 默认关闭。开启后支持 SDK 应用内列表/网格鼠标拖放、列表内重排、跨列表移动/复制、多选、空列表目标、边缘滚动与 Alt+Shift+方向键重排。与原生一致，分组视图不启用自动重排。跨列表应使用相容的数据模型和稳定的唯一 ID；业务对象及函数保留在 TS，Rust 只接收元数据。
- `onDragItemsStarting`、`onDragOver`、`onDrop` 可同步取消或修改 `acceptedOperation`；`onDragItemsCompleted` 恰好完成一次，仍能读取移动前的业务对象。常规 React 受控数据通过 `onItemsChanged={e => setItems([...e.items])}` 同步。SDK 另有稳定 ID 的 `reorder`/`remove`。
- `ItemsUpdatingScrollMode` 支持首项锚定、保持像素偏移、末项锚定/末尾追加跟随。`saveScrollPosition`/`restoreScrollPosition` 使用稳定项与相对位置。消息示例使用 `itemsPanelVerticalAlignment={VerticalAlignment.Bottom}`。近尾增量加载由 Rust 合并通知；SDK `onLoadMore` 管理异步页及释放时取消。
- 右键与 Shift+F10 使用同一个 `ContextRequested`，复用已有 MenuFlyout。`placementPosition` 是相对目标的坐标，Rust 将浮层限制在 SDK 视口。

### 跨列表放下卡顿与动画修复

实际浏览器记录发现：移动时源选项 DOM 会被回收，浏览器可能不再发出该元素的 `dragend`。完成清理改由 `drop` 的 `finally` 负责；取消和正常 `dragend` 使用同一幂等收尾。原生拖放回调只经过 `scene_collection_input` 协商事件和状态，Canvas 呈现与无障碍 DOM 更新延后到帧调度，避免同步重绘/回收引发重入。拖入目标空隙时按列表边界判断离开，放下前重新核定最终位置。

同时去掉每个实现化项每帧反复读取整份 `collectionItems` 的调用：投影直接使用有界快照中的能力标志，拖放业务对象和元数据只缓存本次移动的项；空事件帧不复制整个业务对象 Map。Canvas2D 跳过不透明度为零的绘制组，避免不可见占位项反复复制全幅 backdrop。

动画由 Rust 推进。`references/collections-animation-metrics.json` 是本机同版 SDK/Windows `AnimationDescription` 的实测轨道，原生探针保留了不支持的 effect/target 组合，未静默当作已支持：

| 轨道 | 时序 |
| --- | --- |
| 拖动源占位淡出 | 167ms，线性 |
| 让位等待 | ListView 200ms；GridView 300ms |
| 实时重排位移 | Reposition 367ms，原生曲线 |
| 新项入场 | 延迟 240ms，再用 120ms 淡入、0.85→1 缩放 |
| 新增时其它项位移 | 400ms |
| 移出后剩余项位移 | 延迟 60ms，再用 400ms 位移 |

跨列表外来项使用原生 LiveReorderHelper 的虚拟源槽，目标项目也会让出空位。提交后的新增/剩余项过渡按稳定身份记录当前呈现位置；快速变化不会把位置或缩放累乘。减少动画和高对比度策略直接落到终态。

### 实际对照及复现

重新检查的 Store 包是 `Microsoft.WinUI3ControlsGallery_3.0.4.0_x64__8wekyb3d8bbwe`，两个 WinUI DLL 与新原生探针逐字节一致。官方窗口实际观察了分组标题固定、裁剪及 Alt+Shift 重排，图片在 `out/collections-store-advanced/`。computer-use 的跨列表指针拖动未产生移动结果，因此没有把它记为发行版拖放验收通过；这部分用固定 C++/Gallery 处理代码、同 SDK 动画参数及真实浏览器输入验证。

新增原生分组矩阵包含 Light/Dark × 粘性开关 × 0/80/220 偏移，共 12 例，DPI=1。浏览器逐标题检查位置和尺寸，再比较实际 Canvas 截图；旧的 94 例、125% DPI 矩阵继续分别在 Canvas2D/WebGL2 重放。两种 DPI 的结果分别记录，不混成同一个采样环境。

当前验收和输入指纹见 `references/collections-status.json`。专用服务同时捕获 WASM、绑定、build-stamp 和 TS/React/CSS 源码，防止另一个会话的后续构建混入一次回归；文件在 `out/collections-5194-test-runtime/` 与 `out/collections-5194-app-runtime/`。验证服务使用 http://127.0.0.1:5194/#list-view；共享 5173 继续服务其它会话的实时修改。

本次通过 174 项 Rust 测试和 71 项浏览器检查，包含 Edge/Chrome 各四项拖放压力检查，以及反复跨列表移动、多选与空目标、动画中间帧和十万项数据检查。Rust/WASM Clippy 与生产构建通过。共享工作区及 dist 已被并行会话后续构建更新，其 WASM 指纹与本次验收快照不同；这些结果仅对应上述 5194 固定服务，不代替后续共享构建的回归。

```powershell
pwsh -NoProfile -File tools/run-collections-advanced-probe.ps1
cargo test --locked --target-dir target/collections-validation
cargo clippy --locked --all-targets --target-dir target/collections-validation -- -D warnings
cd gallery
npm run build
# 专用测试服务（独立终端）
npx vite --config vite.collections-test.config.ts --port 5194
$env:WINUI_COLLECTION_TEST_URL='http://127.0.0.1:5194'
$env:PW_CHANNEL='msedge' # 另以 chrome 重放
npx playwright test --config playwright.collection-drag-stress.config.ts
npx playwright test --config playwright.collections-advanced.config.ts
npx playwright test --config playwright.collections.config.ts
npx playwright test --config playwright.collections-regression.config.ts
```

## ListView 滚动卡顿修复（2026-11-08）

滚动的共用链路新增以下修正，ListView/GridView 无需调用方配置：

- 虚拟化窗口按**当前呈现偏移**加 CacheLength 计算，不再创建当前位置到动画终点之间的全部容器。连续滚轮和远距离动画目标不会随滞后距离扩张整个可见子树；拖动源固定和首项测量锚点继续保留。
- 列表项与分组标题的 Measure 结果按布局修订、约束和 DPR 缓存。纯滚动位移复用测量；模板、数据、字号、尺寸与字体加载通过现有布局失效链重新测量。
- BrowserText 的 cap-height 按完整字体缓存，字体加载时统一失效，避免每帧重复设置超大测量字号及读取 Canvas 字体度量。
- 原生滚动探针的轮询比 Composition 呈现更快，重复 offset 表示同一呈现帧。运行曲线保留不同 offset 的首次时间并连续插值，避免把采样重复误作动画停顿；原始 `text-scroll-metrics.json` 保留不变。这是对采样重建的修正，不代表完成原生滚动引擎的全部惯性语义。
- 无障碍 TextBlock 标签不变时保留现有 Text 节点，滚动只更新投影变换。

新增 `tests/collection_scroll.rs` 覆盖滚动曲线无采样停顿、测量复用/失效、动画过程中的视口覆盖及容器预算。`gallery/tests/collection-scroll.spec.ts` 用真实滚轮遍历全部可滚动的 ListView 示例，并验证普通、模板和分组列表的十万项数据。60,000 DIP 动画目标的本机 Edge 检查中，三种列表最多各实现化 37 个项，过程中的视口检查均通过；这不构成跨设备帧耗时保证。

本轮固定验收服务是 http://127.0.0.1:5195/#list-view，保留先前 5194 服务及其证据。滚动采样脚本为 `tools/profile-collection-scroll.mjs`；结果、CPU profile 与端口隔离的浏览器记录位于 `out/collection-scroll-*`、`references/validation/collections-5195-scroll-*`。共享 5173 和生产构建也已更新，具体二进制指纹见本轮验证记录。

本轮通过 178 项 Rust 测试、42 项浏览器检查（Edge/Chrome 滚动各 3 项、集合/拖放/静态矩阵回归 21 项、文字与全局滚动条回归 15 项）、Host/WASM Clippy、严格类型检查和生产构建。独立顺序采样中，普通/模板/分组/十万项列表的 `scene_frame` P95 分别由 4.6/7.4/4.4/4.6ms 降到 3.9/5.9/3.7/3.7ms；这些数值包含 CPU profiler 开销，仅用于本机对照。完整结果见 `references/validation/collections-scroll-status.json`，当前源码、生产 WASM 和 5195 验收 WASM 指纹一致。

## 验证边界

已实现本节列明的 SDK 应用内鼠标拖放与动画轨道；触摸长按拖放、任意 WinRT DataPackage/跨应用文件拖放、完整 UIA/SelectionModel、ItemsRepeater 不在本轮完成范围。可变高 Stack 非可见项使用估计尺寸；异步图像/字体造成上游尺寸变化的锚定仍需更广泛测试。分组 GridView 的全部原生模板组合未形成完整矩阵。

静态强制 VSM、RenderTargetBitmap、AnimationMetrics 和浏览器轨道采样不能证明 Store compositor present 时刻的逐帧像素等价。字体栅格、图片重采样、分数像素及材质的残差仍保留；没有宣称全面像素或 Composition 动画等价。早先的连续指示条高度模型已被离散 Height + Scale 替换，但这项修正同样不等于完成发行版逐帧验收。

SplitButton 第一色板继续使用真实 GridView + ItemsWrapGrid + Rectangle，第二色板使用 VariableSizedWrapGrid + Button，并复用共享 Flyout。RichEditBox 尚未实现，页面仍明确使用 TextBlock 文字预览。
