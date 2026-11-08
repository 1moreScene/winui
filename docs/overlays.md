# Popup、ToolTip、Flyout、MenuFlyout、Slider

2026-11-07，阶段 7 首批可运行切片。沿用 Gallery `7360ac322414e118eadfb0c7c2f4ecc31a218f59`、WinUI `7b12709347527238494ca28cb9fed326d513e779` 和匹配 SDK 探针。本批不表示完整浮层家族或五个控件的全部高级能力已经完成。

运行：[五个控件](http://127.0.0.1:5173/#overlays)。`#popup`、`#tool-tip`、`#flyout`、`#menu-flyout`、`#slider` 也进入该页。五个独立交互示例提供 Options、Output、与实际运行片段相同的 React 源码，以及固定 Gallery 的首个官方 XAML 示例。完整官方示例清单保存在 `gallery/src/official-overlays.json`，不把未移植示例登记为完成。

## 实现范围

| 控件 | 已实现 | 本批剩余范围 |
| --- | --- | --- |
| Popup | 单内容容器、正负父级偏移、显式开关、可选 light dismiss、根级绘制和命中、逻辑父级释放 | 窗口外独立原生表面、系统输入面板避让、完整 ChildTransitions |
| ToolTip | 文字或单内容、目标控件、悬停与聚焦、400ms 鼠标延迟、5s 显示期限、ARIA 描述、释放清理 | Windows 系统延迟设置、200ms 快速重显策略、完整安全区域/长按服务、完整原生浮层逐帧像素等价验收 |
| Flyout | 任意单内容、五种具名方位、翻转与横向移位、外部点击/Escape、同步取消 Closing、聚焦内容与恢复此前焦点 | 全部边缘对齐模式、ShowMode、原生滚动 presenter、焦点约束与转场全部细节 |
| MenuFlyout | 命令、Toggle、Separator、禁用项、鼠标与方向键/Home/End/Enter/Space、事件携带业务 ID 和勾选值 | SubItem、Radio、图标、键盘加速键、type-ahead、原生内容模板和菜单滚动 |
| Slider | 范围钳制、拖动捕获、水平/垂直、反向/RTL、步进、箭头/Home/End/PageUp/PageDown、标签、四状态、共享 ToolTip、ARIA slider | TickBar/Ticks snapping、自定义 Thumb/值转换器、游戏手柄 engagement、全部原生动画时序 |

显式提供或更新 ToolTip 的 `isOpen` 后，切换为调用方控制，不再由悬停服务覆盖；自动模式直接省略该属性。ToolTip 内容的 DOM 子树为 inert，保持只读提示语义。

ToolTip 时长取自 `ToolTipService_Partial.h` 的系统查询失败 fallback，浏览器当前使用这一确定值，不冒称已读取用户 Windows 配置。Slider 步进复用 `Slider_Partial.cpp` 的零点倍数规则，等距时选前一步；SmallChange/LargeChange 与指针 StepFrequency 分开。

浮层仍属于原逻辑父级，但不参与父级自然尺寸和常规子级合成。Rust 在普通场景之后统一布局、绘制和反向命中浮层；DOM 语义投影同步移到 Scene 根。浮层可越过所属 ScrollViewer 的裁剪，最终受同一 Scene 视口约束，不跨 Scene 使用目标，不建立第二棵控件实现。React 只挂载 SDK 对象和业务回调；切换后端时忽略已销毁的旧目标，等待新目标就绪。

浮层 DOM 只在顺序改变时移动，避免每帧 append 导致焦点丢失。关闭回调可重入更新或销毁，过期 request 不再关闭已处理的实例。逻辑父级关闭/禁用和目标销毁会隐藏浮层，所属内容随父级销毁。

Flyout/ToolTip 使用对应模板的 Acrylic 资源；ToolTip 默认背景已改为 `ToolTipBackgroundBrush`，避免误用旧纯色资源。MenuFlyout 原生透明背景另有 SystemBackdrop，浏览器将其适配为真实 Scene 内容采样的 Acrylic，保留 reduced transparency 与高对比度 fallback；不采样浏览器外的桌面。

三种浮层共用 Rust 呈现时间线与空心阴影：Flyout 按实际方位从 50 DIP 偏移进入，透明度延迟 83ms 后淡入 83ms、位移 367ms；ToolTip 淡入淡出 167ms；MenuFlyout 250ms 展开、83ms 淡出。时序来自同机 UxTheme Animations 记录和固定 WinUI 源码。关闭期间继续呈现但不接收输入，逆向打开保持当前位置与透明度。Opened 在进入动画完成时通知，Closed 在退出呈现结束时通知；reduced motion/高对比度立即收敛。

MenuFlyout 内容与完整背景边框沿竖直方向平移，受固定弹出窗口范围裁剪。固定版本模板没有命名 `MenuFlyoutPresenterBorder`，因此 `LayoutTransition_partial.cpp` 中针对该部件的缩放分支实际不生效；此前按该分支实现的缩放已撤回。Flyout/MenuFlyout 的窗口裁剪沿用 `ThemeShadow.cpp` 的 Medium insets（左 10、上 2、右 10、下 18 DIP），ToolTip 使用 Small insets。DOM 命中区域同步采用 Rust 投影的裁剪范围。主题资源提供 1 DIP 的低透明度灰色描边，使用内侧圆角边框几何，保留官方的细边。阴影按 `DropShadowRecipe.h` 和 `HWCompNodeWinRT.cpp` 的 Z=32/16（ToolTip）空心投影适配；Canvas 与 Composition 的模糊半径换算、内缩投影体及源图形隔离避免圆角黑点和过宽阴影。两后端使用同一套阴影栅格执行器。

## 公共 API

```ts
import { WinUI, OverlayPlacement, MenuEntryKind, EventKind } from './src/index';
const ui = await WinUI.create();
const scene = ui.scene(host);
const button = scene.root.button({ text: 'Open' });
const flyout = scene.root.flyout({ placement: OverlayPlacement.Bottom });
flyout.text({ text: 'Hello' });
const off = button.on(EventKind.Click, () => flyout.showAt(button));
const cancel = flyout.on(EventKind.Closing, e => { e.cancel = hasUnsavedChanges; });
flyout.hide();
console.log(flyout.properties, flyout.snapshot.overlay);

const tip = scene.root.toolTip({ text: 'Help' });
tip.attachTo(button); // 自动处理悬停/聚焦
const menu = scene.root.menuFlyout({
  menuItems: [{ id: 'option', text: 'Enable option', kind: MenuEntryKind.Toggle }],
});
menu.on(EventKind.MenuItemInvoked, e => console.log(e.itemId, e.isChecked));
const slider = scene.root.slider({ width: 240, value: 40 });
slider.onValueChanged(e => console.log(e.value));
slider.update({ value: 50 });
off(); cancel(); ui.dispose();
```

属性 `isOpen: false` 是调用方强制关闭；`hide()`、外部点击和 Escape 对 Flyout/MenuFlyout 发出可同步取消的 Closing 请求。Popup/ToolTip 没有取消关闭事件。

React 直接属性：

```tsx
const [target, setTarget] = useState<SceneNode | null>(null);
const [open, setOpen] = useState(false);
<SceneView style={{ height: 260 }}>
  <Button text="Open" onReady={setTarget} onClick={() => setOpen(true)} />
  <Flyout target={target} isOpen={open} onClosed={() => setOpen(false)}>
    <TextBlock text="Hello" />
  </Flyout>
  <ToolTip target={target} text="Help" />
  <Slider width={240} value={40} onValueChanged={e => save(e.value)} />
</SceneView>
```

常规调用不暴露 placementTarget 数字句柄。诊断快照仍保留内部 ID。有限值使用公共运行时枚举；裸字符串与不兼容枚举已加入 TS 负例。

## 验证与边界

源码来源、SHA-256、模板 setter、资源别名、尺寸和 Tooltip 服务参数由 `tools/extract-overlays.py` 提取到 `references/overlay-template.json`，构建自动重提取。原生探针保存到 `references/overlay-palettes.json`、`references/overlay-metrics.json`；本次 DPI 为 125%。

Slider 对照包含浅/深两主题、水平/垂直、0/50/100、Normal/PointerOver/Pressed/Disabled，共 48 个独立 native 截图。浏览器两后端分别对照这 48 个区域，报告 `references/validation/overlays-Canvas2D.json` 和 `overlays-WebGL2.json`。几何断言限定最大误差 0.81 DIP；同时报告有色像素集合上的 RGB 平均误差，避免大块背景稀释。像素误差是诊断值，不是逐像素等价声明。它也不替代动态轨迹、高对比度系统窗口、完整动态浮层或 Store 发行版验收。

Rust 验证布局隔离、裁剪逃逸、避让、取消关闭、焦点恢复、Tooltip 时钟、菜单键盘、拖动捕获、反向、失效目标、事务和释放。Chrome 验证真实键盘/鼠标、无障碍关系、控件选项、后端重挂载与公开 API。原生 MenuFlyout 全样式及完整动画逐帧像素等价尚未验收；不以 API 导出或静态几何代替完整功能。

```powershell
./tools/run-overlays-probe.ps1
cargo test --locked --test overlays
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
node node_modules/playwright/cli.js test --config playwright.overlays.config.ts overlays.spec.ts overlays-parity.spec.ts overlay-presentation.spec.ts overlay-shadow.spec.ts overlay-menu-motion.spec.ts
```

独立 Playwright 配置把结果写入 `out/overlays-browser/`，避免覆盖同时进行的阶段 6 回归。全套回归可沿用该配置而省略文件名。本批未重新建立冷启动、CPU/GPU 或内存性能基线。

2026-11-07 浮层呈现修复验证见 `references/validation/overlay-presentation-*.json`、`overlay-shadow-*.json`、`overlay-menu-motion-*.json` 与 `references/stage-7.json`。阴影对照使用真实原生 Composition 窗口截图，在 125% DPI、浅深主题与 Z=16/32 比较外部阴影分布、圆角杂色和向下投影；材料与时序另有浏览器像素及确定时钟检查。Gallery 的 Empty cart 按钮移除了多余 ScrollViewer；另有 Rust 回归保证浮层不进入自动滚动范围。ScrollViewer 显式 Visible 的原生语义保持不变。

复采原生阴影：`./tools/run-overlay-presentation-probe.ps1`。复采系统动画曲线：`python -X utf8 tools/capture-overlay-motion.py`。原生截图在 `out/overlay-presentation-native/`，浏览器截图在 `out/overlay-presentation/`。这些对照限定于记录的参数和场景，不表示完整浮层家族的逐帧像素等价。

并行构建时可先运行 `./tools/prepare-overlay-validation.ps1`，再从 gallery 运行 `node node_modules/playwright/cli.js test --config playwright.overlay-validation.config.ts overlay-menu-motion.spec.ts overlay-presentation.spec.ts overlay-shadow.spec.ts overlays.spec.ts`。该配置在独立端口运行冻结的 SDK/WASM 与宿主副本，避免开发服务器热重载。上一轮修复验证：112 项 Rust、11 项浮层浏览器回归通过；fmt、双目标 Clippy、枚举映射、固定基准指纹和 strict TS 通过；构建与 VS Code rust-analyzer 错误扫描通过。另有双后端 × 三主题的 6 组交互检查。

## 实际浮层复查（2026-11-07）

新增 `tools/run-overlay-controls-probe.ps1`，通过探针自身窗口的键盘消息打开真正的 Flyout、MenuFlyout，使用前台客户区屏幕像素采集 Composition。共 16 个原生稳定场景：浅/深主题 × 纯色/条纹背景 × 两种控件 × 上/下方位；两浏览器后端构成 32 组对照。另存四条原生展开轨迹，每条 13 帧；浏览器使用确定时钟采样相应请求时刻。实际时间范围逐帧记录，不能把壁钟请求时刻视为 compositor present timestamp。

发现并修正：菜单窄/宽行距必须缓存唤起时的输入类型，Mouse/Pen/Keyboard 使用 NarrowPadding，Touch/None 使用 DefaultPadding；文字列仅在菜单含 Toggle 项时保留 28 DIP 勾选列；使用模板的 E73E 勾选字形、4,2,4,2 项间距与 11,4,11,5 窄内边距；分隔项为原生 1 DIP 线加上下 padding，并按物理像素取整。默认示例在 125% DPI 的菜单高度从原先多出 16.8 DIP 修正到匹配原生。按下项使用原生 Pressed 画刷。TextBlock 自然高度去除重复的整数 DIP 向上取整，在最终 Measure 阶段统一按物理像素向上取整，消除 Flyout 多出的一排物理像素。

原生记录：`references/overlay-controls-metrics.json`；DesktopAcrylicController 的实际浅深默认参数：`references/overlay-desktop-acrylic-defaults.json`；32 组完整控件结果与展开采样：`references/validation/overlay-controls-comparison.json`。对照查看页：`out/overlay-controls-review/index.html`，支持场景、后端与展开帧切换。生成命令：先运行原生探针，再在运行 Gallery 的情况下执行 `node tools/compare-overlay-controls.mjs` 和 `node tools/create-overlay-review.mjs`；并行构建时可通过 `OVERLAY_URL` 指定冻结宿主。

材料边界：SystemBackdrop 的控制器默认 tint、luminosity、fallback 参数与当前应用内配方相同，但系统背景的噪声/模糊输出仍与浏览器适配不同；有色背景下的 MenuFlyout 内部像素误差单独保留，没有通过调颜色、放宽几何门槛或隐藏差异来登记完整一致。原生按钮焦点黑框是项目明确取消的例外，不纳入材质 ROI。独立 SDK 探针不是 Store Gallery 发行版验收。

本轮结果汇总：`references/validation/overlay-controls-validation.json`。最终 120 项 Rust、较早的完整 119 项浏览器回归、另加 2 项触控/鼠标菜单密度检查通过；WASM/Vite/声明构建、fmt、双目标 Clippy、枚举、strict TS、rust-analyzer 通过。32 组外框与菜单行几何最大差异小于 0.00002 DIP（JSON 浮点精度）；材质仍报告实际像素残差。校验期间曾检测到并行修改的 compact-controls-template.json；保留其他会话的改动后，最终全量源码/本地指纹复核已通过。

细描边补充：按 `BackgroundSizing=InnerBorderEdge` 把浮层材质限制在边框内，且阴影空心区域使用原生内缩 1 DIP 的 dummy geometry，保留边框下方的阴影重叠。浅色左边缘实采原生 RGB 216，修复前约 233，修复后 Canvas2D 约 214、WebGL2 约 216；32 组四边采样的最大平均 RGB 误差小于 2/255。阴影专用探针现使用相同主题细边和 InnerBorderEdge，避免把带边框的浏览器浮层同无边框原生矩形错误比较。完整浏览器回归后的这次描边修订另有最终浮层专项回归，二者 WASM 指纹分别记录。

最终描边修订后的 13 项浮层专项回归通过（含双后端、触控与鼠标、阴影、材料策略、展开窗口裁剪、实际键鼠/焦点恢复）；复核相同原生场景与对照页图片。更早的完整 119 项浏览器检查、最终专项及其 WASM 指纹在汇总中分开保存，避免用旧全量结果冒称新二进制已执行全部测试。


## Popup 圆角和实测差异修复（后续检查）

Popup 的子 Border/Panel 使用 Acrylic 时，原先背景命令未遵守圆角边界，深色主题能看见矩形底层。本次在共享背景绘制处对有圆角的非浮层节点加入 RoundedClip，含正常材质和减少透明度的 fallback；不修改示例尺寸或用 CSS 遮挡。Canvas2D/WebGL2 × 浅/深主题 × 材质/fallback 在 125% DPI 的四角及内部像素检查通过。

MenuFlyout 的 Desktop Acrylic 与应用内 Acrylic 分开执行：同版 wuceffectsi.dll 的图恢复了 HostBackdrop、COLOR(22)、LUMINOSITY(23) 两层混合，没有额外纹理噪声或显式 Gaussian 节点。完整函数证据为 references/overlay-desktop-graph-evidence.json；HostBackdrop 的浏览器模糊适配记录于 references/host-backdrop-profile.json。原生 raw HostBackdrop 探针进一步证实采样受弹出层矩形边界影响；浏览器先延展该边界，再模糊，避免混入窗口外的条纹。该检查点的 Canvas 曾使用四次半 sigma 过滤；2026-11-08 后续检查改为下文记录的共享 49-tap 执行器。30 物理像素是原生像素推导的浏览器近似值，不是反编译恢复的系统常量。

首次展开现在在第一个可呈现布局帧启动动画，避免宿主首次调度延迟提前消耗过渡；恢复/反向保持现有时间线连续，不插入任意的系统启动延时。对应 Rust 回归覆盖首次帧延迟 120ms 的情形。壁钟截图仍不能证明 DWM present-time 等价。

最终结果和二进制指纹保存在 references/validation/overlay-popup-material-followup.json；旧的全量浏览器检查保留为独立历史检查点。图像查看页仍为 out/overlay-controls-review/index.html。Popup 四角图像位于 out/popup-corners/。本轮报告分别记录几何、边缘、材质误差；没有登记完整像素等价或 Store Gallery 发行版验收。


## 实际控件再验证（2026-11-08）

本轮加入真正 ToolTip 的浅/深主题、纯色/条纹、上/下方位对照。共 24 个原生稳定场景、双后端 48 组；展开与关闭共 12 条轨迹、156 个原生帧、312 个浏览器帧。GDI 采样移到工作线程，避免截图阻塞 XAML dispatcher 而推迟 Opening/Opened/Closed；每帧保留截图开始/结束时间，浏览器采用范围中点，仍不能将其视为 DWM present timestamp。

修正了窗口采样边界：ToolTip 与 MenuFlyout 开启独立 WindowLayer。ToolTip 的应用内 Acrylic 仅采样弹出窗口自己的下层视觉，不混入宿主条纹；MenuFlyout 的 HostBackdrop 采样窗口之外的场景，排除本窗口阴影。普通 Flyout 保持应用内采样。对实际 Flyout 子 Border 移除 ThemeShadow 和 Z=32、再恢复的探针确认其 Acrylic 确实受自身阴影影响；没有把窗口式规则错误推广给它。证据见 `references/validation/overlay-own-shadow-sampling.json`。

Canvas Acrylic 的颜色、噪声、fallback 混合改为浮点单次计算，最后一次量化，避免 Canvas 多次 blend paint 累积舍入。噪声保留官方 256×256 纹理及双线性相位。MenuFlyout 的 Canvas HostBackdrop 采用仅计算浮层区域的 49-tap 分离高斯，与 GPU 相同的 quarter-DIP 采样、RGBA8 中间面和边界限制；Canvas 默认后端无需 WebGL。

TextTrimming 默认值修正为 None。显式 Clip 和菜单文本按原生 LineServices 的 300 单位/DIP 度量，再应用 Measure 的物理像素高度余量；普通 TextBlock 保持 DWriteLayout 路径。七档字号 × Segoe UI/Arial/Segoe Fluent Icons × None/Clip 共 42 组的原生基线和行高有独立验证。浏览器通过不可见且无滚动溢出的主字体行框取得 lineGap，以 8192px 度量避免小字号舍入和 Chrome 的 10000px 字号上限；字体加载时清理缓存，场景销毁时移除行框。Segoe Fluent Icons 包含拉丁文字且走 DWriteLayout 的七组宽度仍有差异，单独登记，未登记全部缺字与字体回退策略一致。字形以稳定的物理像素相位缓存，避免浮层平移动画每帧重新栅格化。字形覆盖率与原生 DirectWrite 仍有残差，没有用固定 gamma 调色掩盖。

Opened 在首个布局帧发出，与入口动画结束分离；窗口式 MenuFlyout 按原生立即关闭，取消多余卸载淡出。ToolTip 的布局先按原生 integer-DIP RECT/SIZE 定位，再绘制实际小数尺寸；偏移量扩张 docking rect。React 的 Scene/节点挂载、属性、浮层 target 和 SplitButton flyout 引用统一在布局阶段同步，避免首个呈现帧出现半棵树或旧锚点。普通与 StrictMode 的双后端 40 次挂载/释放及 12 组首次浮层定位通过；字体行框全部随场景释放。Slider 的 ValueChanged 也不再被延迟 effect 回写旧值，双后端共 20 次完整重复通过。

材质诊断 ROI 修正为真正无文字、无分隔线的内部区域。当前报告与旧报告的 ROI 不同，不能将误差变化全部算作实现提升。无色 Acrylic 黑白边缘/条纹探针另外隔离了模糊核残差，见 `references/validation/overlay-app-backdrop-kernel.json`。30 物理像素 HostBackdrop 仍是浏览器适配；应用内配方沿用官方 BlurAmount=30 DIP，没有用拟合值替换官方参数。

本轮完整记录为 `references/validation/overlay-refinement.json`，查看页为 `out/overlay-controls-review/index.html`。该页包含 Flyout、MenuFlyout、ToolTip 的稳定、展开和关闭图。完全像素一致、字体栅格化一致、DWM present-time 一致仍未验收；后续五个组合控件的状态继续单独记录于 `docs/composed-controls.md`。


共享回归补充：Grid 在无限宽度下不再把自然 Star/Auto 轨道宽度回灌到第二次测量，恢复 Viewbox 示例中图片的 90 DIP 固有尺寸与 190×149 内容尺寸。直接位于 Canvas 的 Image 按 CMediaBase 无布局存储路径保留指定矩形，由内部 ImageBrush 执行居中 Uniform/UniformToFill；不再错误地扩大裁剪区域而偏移照片。两个问题均有原生截图与 Rust 回归，未改图片内容或像素门槛。ARIA radio 的测试使用 click 后等待 Rust 投影的 aria-checked，而不是要求点击返回瞬间已更新的 HTML input 行为。


异半径圆角补充：共享 CornerClip 支持四角独立的 x/y 半径，Border 材质按 InnerBorderEdge 扣除各方向边框宽度，保留椭圆内角；GPU 不再用象限和半高裁切大圆角。16 个真实原生 Popup 场景与双后端共 32 组对照覆盖不同/大/零/归一化半径、非等宽边框、两主题及正常/纯色 fallback，边界探针均无漏色。高对比度解析成 solid 资源时也复用同一裁剪，避免回到矩形填充；该模式另外用项目的确定性黑黄颜色夹具检查，不冒称实际 Windows 高对比度全场景验收。报告为 `references/validation/popup-corner-materials.json`。

最终共享图片回归补充：147 项全量断言虽全部通过，日志仍暴露了图标页切换后端时的 WebGL 1281；不能把该检查点称为无运行错误的验收。逐调用诊断将其定位到没有显式固有尺寸的 SVG 的 HTMLImageElement 纹理上传，旧版本 10 次切换全部复现。共享 GPU 图片路径现先将解码图像解析为自然尺寸的 Canvas 像素面，再首次上传并缓存，不按文件后缀判断格式。data/blob SVG 有独立像素检查，图标页补上 pageerror 断言。修复后最新冻结版本的 61 项图片、图标、材质、浮层、React 与渲染回归通过，另有 10 次逐 WebGL 调用诊断均无错误；151 项 Rust、双目标 Clippy、fmt 与生产构建通过。旧全量与最新专项的 WASM 指纹单独保存于汇总，未以旧全量代表修复后的二进制。

专项圆角查看页为 `out/popup-corner-materials/index.html`，可切换 16 个原生场景及两浏览器后端；它与浮层查看页互相链接。32 组四角背景探针误差为 0，完整区域仍保留原生/浏览器的边缘覆盖率残差。所有报告继续保留 `acceptedPixelEquality=false`，不将有限场景通过宣称为全字体、全合成时序的完全一致。

## 文字渲染继续校准（2026-11-08）

新增真实 TextBlock 的 84 个原生实例（两主题、三字体、七字号、None/Clip），双浏览器后端每版形成 168 组像素对照。探针同时记录 XAML RasterizationScale、Win32 DPI 和物理客户区比例并强制一致；首次漏接 per-monitor 启动标记的采集已作废。来源、原生指标和结果分别在 `references/text-raster-sources.json`、`references/text-coverage-native.json`、`references/validation/overlay-text-render-followup.json`。

固定源码表明 DWriteTextRenderer 将基线像素对齐交给 XAML；D2DTextDrawingContext 对全部字形 run 执行基线对齐。TextBlock 的 DWriteLayout 路径在 GetContentRenderingOffset 还会加入 Measure 的完整高度取整余量，其公开 BaselineOffset 仍是未调整值。共享绘制层现补齐两步，保留公开度量；LineServices 已含余量，不重复添加。普通 Segoe UI/Arial 的字形区域平均误差从 37.4993 降为 18.1630 / 255；修复后两字体的 None/Clip 绘制位置一致。该数值限定于记录的 “Open” 字样矩阵，不能推广为所有字体内容的像素验收。

材质最后输出及 CPU 模糊中间像素的字节转换使用 ToUint8Clamp 的最近偶数规则，配方 Color 打包继续独立。该规范修正未消除实测平坦噪声区域的残差。不同过滤精度、Canvas 上下文选项及文字选项的探测只保留为诊断，没有将单个截图拟合值写入生产实现。

最新冻结二进制通过 154 项 Rust、149 项浏览器全量回归（无跳过、重试通过或未捕获运行错误），fmt、双目标 Clippy、strict TS、生产构建和基准指纹验证通过。256 个固定源码路径逐个核对 Git blob；374 个本地指纹通过。实际浮层另更新 48 组稳定场景、312 个动画截图和 32 组 Popup 圆角对照，WASM 加载内容的哈希与这次全量回归一致。

文字查看页为 `out/overlay-text-coverage/index.html`，可按物理像素放大，切换修复前后、字体、字号、主题及后端。普通文字仍有字形覆盖率残差；Segoe Fluent Icons 的 None/拉丁文本，原生为缺字方框而浏览器会回退字体。系统模糊与 compositor present-time 也未登记完全一致。报告保留 `acceptedPixelEquality=false`；后续 AutoSuggestBox、NumberBox、ComboBox、ContentDialog、TeachingTip 的 UI 尚未开始。严格对齐是否允许增加 Windows 原生宿主依赖仍待交付范围澄清，默认 Canvas2D 约定未改变。
