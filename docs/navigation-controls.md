# 导航与层级控件首批

本批提供 FlipView、PipsPager、BreadcrumbBar、TreeView、TabView 的 Rust 状态、布局、绘制和输入，以及同一套 SDK 上的 TypeScript 控制器、平铺属性 React 组件。Canvas2D 仍为默认后端。另一会话的 AutoSuggestBox、NumberBox、ComboBox、ContentDialog、TeachingTip 保持独立范围。

Gallery 入口为 `#flip-view`、`#pips-pager`、`#breadcrumb-bar`、`#tree-view`、`#tab-view`。共 21 个示例入口：3 / 2 / 2 / 4 / 10；TabView 最后一个入口打开独立浏览器窗口，未移植原生 AppWindow 标题栏和窗口撕出。

## 来源与实际对照

沿用 Gallery `7360ac322414e118eadfb0c7c2f4ecc31a218f59`、WinUI `7b12709347527238494ca28cb9fed326d513e779`，实际解析的 Windows App SDK 为 2.5.4-experimental，WinUI 为 2.3.10-experimental。没有混入最新 main。

- `references/navigation-controls-sources.json`：95 个固定源码文件的 git blob / SHA-256 校验。
- `references/navigation-controls-template.json`：实际安装 SDK 的 23 个样式、152 个画刷引用、布局常量、模板部件及视觉状态。原生提取保留 Acrylic 与线性渐变，不将复杂画刷转成透明色。
- `references/navigation-controls-assets.json`、`gallery/src/official-navigation-controls.json`：原版图片、Gallery 页面、SamplePage1/2/3 和源码指纹。官方目录遗漏了 FlipView 的绑定示例，提取器已按实际页面补入。
- `tools/native-navigation-controls` / `tools/run-navigation-controls-probe.ps1`：独立同版 WinUI 探针，Light/Dark 共 60 个状态，DPR 1.25。静态截图等待 800ms，避免把初始 Entrance 中间帧当作最终样式；FlipView 在添加全部项目后再设置选中项。
- `out/navigation-controls-store/observations.json` 及截图：通过 computer-use 在另行启动的 Store Gallery 3.0.4.0 实例中实际查看全部五页，验证 TabView 切页、BreadcrumbBar 自定义模板回退、TreeView 折叠及父子多选、FlipView 键盘翻页、PipsPager 与图片联动。未操作另一会话已有的 Gallery 窗口。

探针的 RenderTargetBitmap 静态矩阵与 Store 窗口的人工交互观察分开保存。浏览器矩阵使用实际 Canvas 位图，避免 SDK 外的全局滚动条顶层窗口混入截图；Gallery 冒烟检查另有真实网页截图。几何尺寸或像素统计不代表 Composition 材质、动画逐帧等价。

## 本批行为

FlipView 支持水平/垂直、方向键、200ms 滚轮去重、触摸拖动、选择事件和相邻页模板回收。按钮在页面及所有模板内容之后绘制，确保 InApp Acrylic 采样最终页面；边线在按钮边界以内。按钮复用实际 Acrylic 配方，16×38 / 38×16 DIP，按下比例 0.875。静止指针停留在内容上也会在 3 秒后隐藏按钮；停在导航按钮上保持显示。快速切换从当前呈现位置接续。

PipsPager 使用原版 FontIcon EA3B 字形，不再以椭圆代替圆点；选中项按下时回到 4 DIP 字号，状态画刷和导航箭头的 0.875 按下比例按模板执行。符号字形使用其 em 方框基线，避免测量 Latin H 时落入回退字体导致上移。PipsPager 支持有限/无限页、最大可见页数、双向绑定、横纵方向、按钮可见策略和有限页循环。使用原版 12×24 / 24×12 项与 4/6 DIP 圆点；无限页边界使用饱和运算。

BreadcrumbBar 保留最后一个路径项，从根部收缩；溢出使用现有 Rust Flyout 和 Button，并按原版逆序列出隐藏父级。控件发送 ItemClicked，应用决定是否移除后续项：原版第一个示例保持路径，第二个自定义模板示例执行回退。

TreeView 复用 ListView 虚拟化、滚动和选择指示器，层级数据单独保存在 Rust 中。支持展开、折叠、键盘、None/Single/Multiple、三态父子选择、未加载子节点标识和树内拖动重排/改父节点。隐藏子节点及选择不会因折叠而丢失；非法循环移动原子拒绝。多选复用真实 CheckBox，列顺序是复选框、展开箭头、内容，包含 RTL 定位。

TabView 支持三个宽度模式、添加/关闭请求、可关闭项、滚动到选中标签、模板、彩色位图、条头/条尾、重排预览和 367ms 可中断位置过渡。初次入场使用 28 DIP 纵向偏移和 667ms 淡入回位；新增使用 240ms 延迟与 120ms 缩放淡入，删除保留非交互视觉进行 120ms 缩放淡出，剩余标签延迟 60ms 后用 400ms 移动。参数来自同机 Windows.UI.Core.AnimationMetrics，保留快速操作的当前呈现值；减少动画、禁用和卸载会清理相应视觉。选中形状来自 `TabViewItem::UpdateTabGeometry` 的外翻底角，顶部渐变边线保留原生画刷。`Auto` 与 `Always` 显示关闭按钮；`OnPointerOver` 在选中或悬停时显示。Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+F4 是控件行为；Ctrl+T / Ctrl+W / 数字快捷键是 Gallery 示例代码。

跨 Scene 标签移动保留原始业务对象，目的提交成功后才移除来源；drop 的 finally 清理不依赖浏览器补发 dragend。公共选项使用原生 `allowDropTabs`，并区分 `canDragTabs` 与仅本条重排的 `canReorderTabs`。

TreeView 外框需要 `TextControlBorderBrush`，本批同时补齐共享 Border 的渐变背景/边线执行和相应校验，避免将资源画刷送入纯色通道。

共享浮层现在可获得浏览器视口边界：独立 Scene 仍使用自身范围，浏览器宿主为无控件专属定位器的通用浮层提供窗口可用空间。BreadcrumbBar 的溢出菜单因此可以超出只有一行高的画布，不再被挤成无法点击的一小条。窗口滚动、缩放仅重新调度已打开的浮层，避免给普通列表滚动增加每帧 DOM 测量。

## 用法

```tsx
<FlipView items={photos} width={400} height={270} />
<PipsPager numberOfPages={8} selectedPageIndex={page}
  onSelectedIndexChanged={event => setPage(event.index)} />
<BreadcrumbBar items={folders}
  onItemClicked={event => setFolders(items => items.slice(0, event.index + 1))} />
<TreeView items={documents} selectionMode={TreeViewSelectionMode.Multiple} />
<TabView items={tabs}
  onTabCloseRequested={event => setTabs(items => items.filter(tab => tab.id !== event.item?.id))}
  renderContent={tab => <TextBlock text={tab.contentText} />} />
```

普通 SDK 使用 `scene.root.flipView(...)` 等工厂；`select`、`next`、`previous`、`TreeView.expand/collapse/selectNode/reparent`、`TabView.requestClose` 和事件订阅均封装内部句柄。`setItemTemplate` / React `renderItem` 使用普通 SDK 场景子控件，回收与销毁随拥有控件发生。业务对象与函数保留在 TS，不序列化进 WASM。

## 重现

```powershell
npm --prefix gallery run build
cargo test --locked --target-dir target/navigation-controls-validation
powershell -NoProfile -File tools/run-navigation-controls-probe.ps1
cd gallery
npx vite --config vite.collections-test.config.ts --port 5196
# 另一终端，使用系统 Chrome；本机 bundled Chromium 启动会报 spawn UNKNOWN。
$env:PW_CHANNEL = 'chrome'
npx playwright test --config playwright.navigation-controls.config.ts
npx playwright test --config playwright.navigation-visual.config.ts
```

该独立 Vite 配置冻结 WASM 与 TS/React 源码，并写入 `out/collections-5196-{test,app}-runtime`，避免另一会话构建覆盖测试中的运行时。最终哈希、测试结果与当前文件是否仍匹配见 `references/navigation-controls-status.json`。

## 首版验证结果

生产构建、TypeScript 检查、声明生成、主机全部目标与 WASM 的 Clippy（`-D warnings`）通过。Rust 共 194 项测试通过，其中本批独立测试 14 项；浏览器新控件交互 13 项、集合/滚动/拖放/浮层回归 28 项通过。原生 60 状态在 Canvas2D 和 WebGL2 下共 120 次静态对照通过设定的几何和可见输出检查。最大根布局误差约 0.0000062 DIP，面包屑部件误差约 0.000025 DIP；这些数字仅属于本矩阵，不代表全部控件或逐帧一致。

原生探针的 `Microsoft.ui.xaml.dll` 与 `Microsoft.UI.Xaml.Controls.dll` 已重新核验，与 Store Gallery 安装文件逐字节一致。最终浏览器测试使用同一冻结的 WASM 和应用源码，具体哈希与当前文件匹配情况保存在状态文件中。

## 材质、动画与关闭按钮修订验证

`references/navigation-controls-animation-metrics.json` 保存同机原生动画参数和 Entrance 默认偏移。`tools/run-navigation-controls-probe.ps1 -RefinementOnly` 提取关闭按钮的 20 个浅、深色模板状态；`references/navigation-controls-close-{metrics,validation}.json` 保留原生部件位置与浏览器局部比较。关闭按钮保持 32×24 DIP 命中/底板，4 DIP 圆角、12 DIP 字形；未选中标签内侧 1 DIP 边框计入偏移。指针位于关闭按钮上时，父标签同时进入悬停状态，关闭按钮自己的状态画刷再覆盖父级默认画刷。

`gallery/playwright.navigation-refinement.config.ts` 覆盖原有交互、新增/删除/入场实际绘制帧、两后端有色模板上的 Acrylic，以及关闭按钮局部对照。截图位于 `out/navigation-refinement-browser`，其中 `close-buttons-comparison.png` 是未缩放的同 DPR 局部并排图。短暂动画在其活动期间采样，静态矩阵等待初始入场结束；不再拿静态最终帧证明存在动画。

本次生产构建、TS 与声明生成、主机全部目标和 WASM 的严格 Clippy 通过；Rust 199 项、导航浏览器检查 18 项通过。两个后端的 120 个静态状态及关闭按钮 20 个独立状态通过各自设定的断言；关闭按钮最大几何误差约 0.000016 DIP。该结果不替代逐帧原生 Composition 验收。

本次官方发行版桌面检查因 Escape 停止；停止后未继续操作桌面窗口。后续证据来自固定源码、同版独立探针、系统 AnimationMetrics 和独立浏览器测试，未据此宣称发行版 Composition 逐帧或 Acrylic 全面一致。

## 分页按钮材质修订

FlipView 的普通主题按钮原本不画边框：`FlipViewButtonBorderThemeThickness` 在 Light/Default 是 0，仅 HighContrast 是 1。已删除误加的描边；箭头也改为原版 EDD9/EDDA/EDDB/EDDC 实心三角。固定按钮尺寸和 Margin 在分数 DPR 下先按原生 Measure 向上取整，再做边缘与居中对齐。PipsPager 自身的导航按钮在普通主题下使用透明背景，不给它附加 Acrylic；Gallery 中集成的 FlipView 同样获得本次修正。

共享 InApp Acrylic 现在先裁剪到所绘制视觉的输入范围，再降采样与 Gaussian HARD 边界延伸。原实现先模糊整张画布，会把窄按钮之外的页面底色混进材质；先对整幅图降采样再裁剪也会残留边缘污染。Canvas2D 使用有界 CPU blur tile，仍保持 Canvas2D 后端；WebGL2 使用同样的局部纹理和采样映射。HostBackdrop 保留已有桌面来源边界策略。

`tools/run-navigation-controls-probe.ps1 -ButtonsOnly` 生成同版探针的 42 个按钮状态，同时分别保存 RenderTargetBitmap 和 PrintWindow 自身客户区捕获；不操作前台、不采集其他应用。启用系统高级效果时，纯色、条纹及“只有按钮所在矩形为蓝色，外围改为红色”的隔离背景用于确认材质输入边界。浏览器材质比较使用原生捕获的相同前景下层像素，排除条纹布局取整对模糊测试的影响。

`playwright.navigation-paging.config.ts` 在两个后端运行 84 个状态，检查几何、材质局部误差及外部像素隔离；`playwright.navigation-material-regression.config.ts` 复跑既有 Acrylic、颜色中断和渐变的 5 项测试。另有导航交互 18 项、Rust 200 项及严格主机/WASM Clippy 通过。固定服务 5196 继续运行本轮已验证的冻结二进制和应用源码。另一会话后续更改了共享 App/Scene 并重新构建，因此当前工作区/生产目录与该运行时的匹配标记按实记录，不把其后续产物计入本轮验收。测试的准确哈希、均值与最坏局部误差见 `references/navigation-paging-status.json`；高频条纹仍有 D2D 与浏览器模糊内核残差，没有宣布逐像素一致。

## 尚未接受的范围

本批不是五个 WinUI 类的全部 API 或像素/帧级移植完成证明。待继续验证和实现：FlipView 的原生 DirectManipulation 惯性及逐帧时间线；TabView 的 ContentThemeTransition 在非增删内容替换场景中的完整覆盖、原生 Composition 逐帧验收、上下文菜单和完整多窗口拖出协议；TreeView 跨树的结构化拖放、延迟展开和完整原生 UIA 模式。当前跨树/普通列表的平面拖放被拒绝，避免丢失隐藏子树。

HighContrast 当前提供策略级颜色与减少动画验证，尚未提取用户实际系统高对比度调色板。浏览器字体、文字裁切边界、Acrylic 后景和原生 Composition 输出仍有差异；静态几何和图片误差单独保留，不以平均误差替代动画验收。
