# AutoSuggestBox、NumberBox、ComboBox、ContentDialog、TeachingTip

五个控件已经接入 Rust Scene、框架无关 TypeScript SDK、React 和 Gallery。默认仍为 Canvas2D，WebGL2 由调用方选择。状态、编辑提交、选择、步进、模态关闭和动画时间线在 Rust 中执行；浏览器负责输入法、平台输入和业务对象。

这是一轮可使用的控件实现，**没有登记为原生逐像素或完整 WinRT API 对齐**。详细结果在 `references/validation/composed-controls.json`，可混合查看原生/浏览器截图的页面是 `out/composed-visual/index.html`。

## 已实现

| 控件 | 当前能力 |
| --- | --- |
| AutoSuggestBox | 业务过滤、三种 TextChanged 原因、建议导航/选择/查询、搜索按钮、轻关闭、IME、原始业务对象事件、SDK/React 虚拟化项模板 |
| NumberBox | 空值、范围联动、提交/取消/失焦验证、表达式、大小步进、滚轮、环绕、Hidden/Inline/Compact、区域小数解析与显示、十位有效数字、0.25 等显示增量 |
| ComboBox | 普通及可编辑模式、选择/清空、键盘和 type-ahead、Alt+方向键/F4、可处理的 TextSubmitted、长列表虚拟化、当前项滚动及 SDK/React 项模板 |
| ContentDialog | 每 Scene 根单实例、烟幕、可滚动丰富内容、默认按钮、焦点循环/恢复、两阶段按钮与 Closing 事务、取消、deferral、showAsync 结果、销毁时完成待决 Promise |
| TeachingTip | 目标/无目标、14 种偏好（含 Auto）、避让、箭头开关、PlacementMargin、图标、内容/Hero 槽、操作/关闭、关闭原因、取消/deferral、展开/收起 |

Gallery 五页包含固定官方页的全部 13 个示例位置，源码面板使用实际运行的 React 片段，并可切换到固定版官方 XAML。Hero 图片从固定 Gallery Git blob 提取，指纹记录在 `references/composed-controls-assets.json`。

入口：`#auto-suggest-box`、`#number-box`、`#combo-box`、`#content-dialog`、`#teaching-tip`。

## 使用

```ts
import { WinUI, NumberBoxSpinButtonPlacementMode, ContentDialogButton } from 'winui-wasm';

const sdk = await WinUI.create();
const scene = sdk.scene(host);
const controls = scene.root.stack({ spacing: 16 });
const quantity = controls.numberBox({
  value: 42,
  spinButtonPlacementMode: NumberBoxSpinButtonPlacementMode.Inline,
});
quantity.onValueChanged(e => console.log(e.newValue));
quantity.update({ value: null }); // 对应原生空值/NaN，公开 JSON 边界使用 null。

const dialog = controls.contentDialog({
  title: 'Save your work?', primaryButtonText: 'Save', closeButtonText: 'Cancel',
  defaultButton: ContentDialogButton.Primary,
});
dialog.text({ text: 'Your changes will be saved to the cloud.', wrap: true });
dialog.onClosing(e => { e.cancel = false; });
const result = await dialog.showAsync();
```

React 同样使用直接属性，例如 `<NumberBox value={42} />`、`<ComboBox items={items} isEditable />`。`renderItem` 复用真实集合容器；普通 SDK 使用 `control.itemsView.setItemTemplate(...)`。TeachingTip 的 `heroContent` 是由控件持有生命周期的内容槽，不能单独销毁或重挂。

`ComboBox` 的 `clearable` 属性复用 Editable ComboBox 的清除按钮模板。可用 `clearSelection()` 在代码中清除选择。设置 `selectionMode={ListViewSelectionMode.Multiple}` 可使用 WinUI CheckBox 连续选择，选择变更事件提供 `selectedKeys` 和 `selectedItems`，数据项使用稳定的 `id`。

`TreeComboBox` 接收带 `children` 的树节点，默认单选。多选沿用 TreeView 的级联选中和半选状态。`parent.treeComboBox(...)` 返回的控制器通过 `presenter` 暴露 TreeView 的展开和模板 API。列表和树形下拉都默认按可见区域虚拟化，`maxDropDownHeight` 控制下拉高度。

树形、多选和长列表下拉使用 WinUI 实色背景资源，并按视口限制缓存的行数。长列表的滚轮输入直接更新视口偏移，避免连续输入反复启动滚动动画。简短的单选下拉沿用 Acrylic。

异步按钮处理调用事件的 `getDeferral()`，异步工作结束后调用 `complete()`；重复完成无效。按钮和 Closing 分别是一轮事务，任一轮取消都会保留对话框。

`numberFormat` 使用浏览器 Intl 提供数字、符号和分组描述，Rust 负责解析、表达式和舍入。当前公开的是十进制描述，不冒充任意 Windows.Globalization/WinRT formatter。默认解析器拒绝科学计数输入，允许区域分组字符；保留原生 RoundHalfUp 的负数中点行为。

## 本轮修复

- 浮层使用独立的 Rust 绘制表面和浏览器顶层弹出岛，保持 Scene 所有权与事件链，能够越过外层卡片的 overflow 裁剪。两后端共享窗口材质隔离和背景采样。
- NumberBox Inline 恢复原生透明按钮、边框、间距与列宽；清除按钮按当前非空、可编辑与焦点决定，初始化值、程序更新值以及失焦后的再次聚焦都有效。
- ComboBox 恢复独立下拉按钮、清除按钮避让、项边距、选中指示和 PointerOver/PointerPressed 资源；每次打开固定定位基准，选择新项后的关闭动画不再重新定位。
- ComboBox 使用 SplitOpen 250 ms 与原生裁剪曲线；实测窗口化浮层关闭时立即移除，CPopup::Close 取消卸载动画，因此不继续绘制 XAML 中声明的 SplitClose 残影。展开时先隐藏阴影，250 ms 后用 500 ms 的原生曲线淡入。NumberBox 和 AutoSuggestBox 不叠加模板中不存在的 Flyout 位移动画。
- ContentDialog 使用实测 Z=128 阴影，按自然文本宽度分配按钮；TeachingTip 裁剪区域包含外伸箭头，瞬态箭头与气泡使用同一 Acrylic。
- 编辑器先按物理像素舍入文本视口，再添加模板 Padding 和 Border，修复 125% DPI 下高度少一个像素的问题。
- 窗口化浮层的阴影绘制在独立内容表面之外，防止 Acrylic 模糊采样自身阴影；ComboBox 补齐 SelectedUnfocused，区分失焦选中与 hover 底色。
- 浏览器原生选区通知可能晚于下一次绘制；现在只在 Rust 选区或值发生变化时同步选区，避免 WebKit 全选后输入追加到旧值。
- 收起状态的 ComboBox 按独立的 CommonStates 和 FocusStates 绘制，键盘焦点保留 hover 背景与边框；下拉箭头跟随整个控件的状态。画刷提取保留 Absolute 坐标、SpreadMethod 和变换，修复浅色边缘渐变翻转丢失。可编辑控件失焦时使用 ComboBox 外观，聚焦时在原有底层边框上叠加 TextBox，边框与背景按物理像素对齐。
- 共享 ScrollState 的最大偏移移除相对机器精度范围内的算术残差，修复 137.5% DPI 下 `extent - viewport = 2.84e-14 DIP` 仍绘制滚动条的问题；不使用整像素容差，真实 0.001 DIP 溢出仍可滚动。
- 可编辑 ComboBox 的下拉按钮显式设置垂直 Stretch，命中区填满输入体，模板内部 hover Margin 单独保留，修复按钮高只剩字形高度的细条。
- 模板自适应测量使用统一的物理宽度约束，避免浮点取整反复清空不同字体的实测高度。四项字体列表的内容高度与视口相等，没有错误滚动条；真实超出视口的列表继续正常滚动。
- 缓存页面的 Scene 停用时，浏览器文档输入锁随生命周期暂停；恢复时重新接入，销毁后释放，防止旧页面的下拉框吞掉新页面首次点击。
- Rust 的 `background_scroll_root` 决定展开的 ComboBox 输入范围，滚轮和触摸不会传到背景或在列表端点向外链式滚动。TS SDK 只把该范围投影到浏览器文档输入，覆盖普通 DOM 和其他 Scene；关闭与销毁后恢复。
- 滚动性能修复包含实际浮层范围的独立画布、帧快照不再重复序列化完整选项源，以及缓存隔离窗口内不变的 Acrylic 底图。缓存键包含主题颜色、透明度、变换、尺寸和 DPR；动态前景仍逐帧绘制，桌面或嵌套实时背景不使用该缓存。
- 扩展回归发现，滚动到页面下方的 TeachingTip 仍以 Scene 高度选择方向，按钮可能落到浏览器窗口外。目标定位现在使用 SDK 投影的实际窗口范围选择回退方向，允许弹出岛延伸到 Scene 上方。

## 基准与验证

### ComboBox 浮层亚克力恢复（2026-11-10）

按用户要求，ComboBox 浮层恢复固定 WinUI 源码模板的应用内 Acrylic 外观，
作为相对二进制 SDK 窗口化浮层表现的明确例外。
`ComboBoxDropDownBackground` 已保存官方 `AcrylicInAppFillColorDefaultBrush`
浅色/深色配方；原有窗口隔离使其只采样空白弹出窗口，视觉上接近实色。
现在 Rust 在阴影表面内另建内容表面，内容继承阴影下面的背景，
Canvas2D 和 WebGL2 均排除自身阴影并采样当前 Scene 的实际内容。
保留浮层圆角、选项、开合动画和主题资源，高对比度及减少透明度继续回退。
此前采样范围只有所属 Rust Canvas，不能覆盖 Gallery 的 DOM 卡片、文字及
其他 Canvas。这正是用户仍看不到背后内容的原因，材质权重为 1 不能作为
真实页面背景模糊已生效的验收。

现在公共 Scene 宿主自动在 ComboBox 展开时采集页面中对应浮层区域，排除
所有浮层及采集容器，把安全的背景栅格与本地坐标交给 Rust；Rust 继续执行
官方模糊、明度/色调混合、噪点、圆角及开合，不采用 CSS backdrop-filter。
页面 DOM 变化、滚动、窗口尺寸和主 Canvas 内容变化会使背景失效，采集请求
合并并限制为最多每 250 ms 一次，不逐帧克隆文档。关闭、停用或销毁 Scene
后释放采集观察器，异步旧请求不能覆盖已关闭/重开的浮层。

浏览器栅格适配采用 `html2canvas@1.4.1`（2026-11-10 从 npm 官方 registry
核实 latest，MIT，固定版本及完整许可证已归档）。首次展开异步采集完成后
更新背景。这是页面内容的重绘栅格，不是操作系统截图：不采集 iframe、桌面、
无 CORS 授权的跨域图像，不承诺库不支持的 CSS、视频或未保留缓冲的独立
WebGL Canvas。失败状态通过 `data-winui-page-backdrop=unavailable` 标明。

`gallery/tests/combobox-page-backdrop.spec.ts` 在独立 Scene 外创建真实 DOM
文字和红/蓝背景，验证浮层色彩响应、锐利分界被模糊、DOM 变色自动更新及
关闭后释放；覆盖 Canvas2D/WebGL2、浅/深色、125% DPR。截图为
`out/combobox-dom-acrylic-{backend}-{theme}.png`。原有独立彩色 Canvas 回归
继续保留，不能用其替代页面采样测试。

回归：`cargo test --test composed`；构建 WASM 后在 `gallery` 运行
`npx playwright test tests/combobox-acrylic.spec.ts`，检查两后端、两主题的
实时背景响应和减少透明度回退。

本次验证：82 项相关 Rust 测试、Chrome 下 4 项两后端/两主题材质像素检查
通过；TypeScript 类型检查、来源边界检查、发布版 WASM 与 Vite 生产构建通过。
浏览器采用 `PW_CHANNEL=chrome`，不依赖本机缺少的 Playwright Chromium 包。

实际 Gallery 宿主回归补充：此前 `GalleryControls.Surface` 对所有控件显式
传入 `reducedTransparency=true`，使顶栏及选项 ComboBox 始终回退为实色。
ComboBox 现移除此强制覆盖，跟随 SDK 的系统透明度策略；其他控件策略保持原样。
独立创建彩色背景 Scene 的测试不能替代这条挂载链路。新增测试直接点击
Gallery 的 Renderer 下拉框和 Colors 示例，确认浮层实际材质权重为 1，
并保存 `out/combobox-gallery-acrylic.png`、`out/combobox-example-acrylic.png`。

- Gallery 固定为 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`；WinUI 源码固定为 `7b12709347527238494ca28cb9fed326d513e779`。47 份 C++/IDL/XAML 的来源与指纹已保存。
- 实际 SDK 为 `Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental`，从其 generic.xaml 提取 18 个样式和 698 个资源（485 个已解析画刷）。未宣称该 SDK DLL 与固定源码 commit 严格一一对应。
- 原生探针采集浅色/深色共 100 个真实前台窗口状态和 368 帧实时开合动画，1000×500 DIP、125% DPI；另有 30 个 NumberBox 原生格式/解析结果。运行来源和 DLL 指纹见 `references/composed-controls-run.json`。
- 两后端各有 100 个浏览器状态截图。几何只比较同类窗口/呈现器，不把逻辑宿主的零尺寸与原生弹出根混比；报告同时保留区域像素差，字体差异没有用全窗口平均数掩盖。
- 交互验证覆盖真实编辑、IME 草稿、键盘、区域格式、取消/deferral、模态焦点、原始业务对象、万条 ComboBox、项模板、销毁及 13 个 Gallery 示例。
- 验证宿主冻结 WASM 和绑定，避免并行会话热更新污染结果。报告记录冻结二进制指纹以及其是否仍与当前构建相同。
- 当前冻结验证的统计与二进制指纹见 `references/validation/composed-controls.json`；浏览器交互、扩展回归和动画结果分别记录，不把旧二进制的通过数计入当前构建。全库格式和静态检查仍需区分并行会话的导航/命令控件修改。
- 此前冻结构建 `9ca8283f51bd9e12aa4de82618f16492f3d1927b8e03eebb91262edc94c8a8d9`：203 项相关 Rust 测试、Chromium 29 项、WebKit 29 项、动画回放 2 项、浮层/文本/紧凑控件回归 26 项通过。Rust 范围排除了另一会话新增的 `command_controls` 测试；历史全量尝试及更广的路由断言失败另存于报告，不冒充全库通过。类型检查、Vite 生产打包、SDK 声明以及 host/WASM Clippy 完成；Clippy 保留并行导航/命令代码的现有警告。
- 本机 Chrome 默认 Canvas2D 的 40 项/万项列表平均绘制耗时分别从 30.4/39.7 ms 降至 5.5/7.3 ms；本次 WebGL2 为 10.7/18.7 ms，万项场景仍超过 16.7 ms；不宣称稳定 60 FPS。120 帧滚动均实际改变 SDK 列表偏移，性能报告与上述冻结 WASM 指纹相同。
- 当前矩阵的客户区内可比部件最大几何差约 0.8 DIP。另有每后端四个顶边 ComboBox 状态：原生窗口可延伸到客户区上方 −56.8 DIP，浏览器按自身视口约束为 0，原始最大位置差 56.8 DIP 单独保留，不能记成完整定位一致。两后端各回放 368 个动画采样时刻；静态与动态混合对比页面分别为 `out/composed-visual/index.html` 和 `out/composed-motion/index.html`。这些指标没有替代整窗像素验收。

下拉列表对照见 `references/validation/composed-choice.json`：40 个原生指针观察（含实际鼠标打开及选中关闭）和 8 个明确标记的 SDK VSM 静态样式状态。hover 颜色比较使用同状态模板，原始鼠标 hover 观察另存，不能混为实时 hover 动画验收。两后端材质与 hover 色块的局部 RGB 平均误差均低于 1/255；字形与桌面合成仍按下文保留。

收起状态另有 28 个同 SDK VSM 对照，覆盖两种主题、只读/可编辑、普通、文本区 hover、箭头区 hover、键盘焦点、焦点加文本/箭头 hover 和禁用。背景及直边分别比较，不以空白窗口稀释误差；报告为 `references/validation/combobox-faceplate.json`，原生探针来源为 `references/combo-faceplate-run.json`。该报告同时保存 40 项与万项列表各 120 次真实 SDK 滚轮帧的前后基准，包含 WASM 指纹、实际滚动偏移、绘制耗时、帧间隔、快照大小和浮层范围；只代表本机 Chrome 条件。

复现：

```powershell
npm run build --prefix gallery
powershell -NoProfile -File tools/run-composed-controls-probe.ps1
powershell -NoProfile -File tools/run-composed-number-format-probe.ps1
powershell -NoProfile -File tools/prepare-composed-validation.ps1
cd gallery
npx playwright test -c playwright.composed.config.ts --grep-invert "replays the live"
npx playwright test -c playwright.composed.webkit.config.ts --grep-invert "replays the live"
npx playwright test -c playwright.composed-motion.config.ts
cd ..
python -X utf8 tools/analyze-composed-controls.py
python -X utf8 tools/analyze-composed-motion.py
python -X utf8 tools/analyze-choice-interaction.py
powershell -NoProfile -File tools/run-combo-faceplate-probe.ps1
node tools/benchmark-combobox.mjs out/combobox-performance-after.json
python -X utf8 tools/analyze-combobox-faceplate.py
python -X utf8 tools/update-composed-status.py
cargo test --target-dir out/overlay-rust-check
```

2026-11-08 冻结构建 `239aeb1d7222de56182340a433a37f6da931093fb486b7580ec012f2d41296db` 与 5173 实际返回的 WASM 一致：全量 242 项 Rust 测试、Chromium 35 项、WebKit 35 项、动画回放 2 项、相关回归 26 项通过；另补查每个静态状态的实际后端及 context-lost 状态。滚动条与 editable 箭头的本轮纠正证据见 `references/validation/combo-correction.json`。复测直接访问用户确认的 5173，另使用冻结宿主执行双浏览器、双后端验证；分数 DPI 检查包含实际绘制像素，不能只用滚动范围快照代替。主题画刷共享依赖同时补齐，避免 Gallery 帮助图标在干净构建时初始化失败。

日期/时间/颜色批的 CalendarView、CalendarDatePicker、DatePicker、TimePicker、ColorPicker 已接入，实测范围见 [批次实现与验收边界](picker-controls.md)。

## 尚未接受

- DWrite 与浏览器的字形覆盖率、物理相位仍有差异；测得的局部几何误差也不等于字形或整窗像素一致。
- 桌面 HostBackdrop 和 DWM 合成与浏览器背景采样仍有平台差异；浮层越出 Scene 已有真实浏览器点击和裁剪验证。
- ContentDialog 的 250/167 ms 缩放、83 ms 淡入淡出来自 SDK XAML；TeachingTip 的 300/200 ms、曲线和缩放来自固定 C++。已采集并回放同 SDK 原生探针的开合帧；这仍不代表 Store 发行版的 DWM 动画逐像素验收完成。
- 任意 WinRT formatter、可编辑选择盒的任意模板、ContentDialog InPlace 模式、完整 UIA/系统能力不在本轮已接受范围。
- 本轮保留全局不绘制黑色焦点框的用户约定，同时保留真实焦点、Tab 和选择语义。
