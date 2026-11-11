# Gallery Motion / Rust SDK

本轮日期：2026-11-09。使用既有固定 Gallery `7360ac322414e118eadfb0c7c2f4ecc31a218f59`、WinUI 源码 `7b12709347527238494ca28cb9fed326d513e779` 和 WinUI NuGet `2.3.10-experimental`。

## 新增能力

| Gallery 页面 | Rust SDK 行为 |
| --- | --- |
| `#transitions` | 赋值触发的 Opacity/Rotation/Scale/Translation 隐式过渡；X/Y 分量选择；背景实色交叉淡化；局部主题资源重新解析及过渡。共 6 个示例。 |
| `#theme-transitions` | Entrance、Reposition、Content、AddDelete、Popup。布局与视觉位移分开；Entrance 同批子元素错峰；删除立即使句柄失效并保留短期退出绘制；文本刷新保留旧内容的退出绘制。共 5 个示例。 |
| `#connected-animation` | 场景内的准备/启动/返回/取消；源可在准备后销毁；目标布局转换与源视觉快照；Gravity、Direct、Basic。集合、卡片、配置选择、ItemsRepeater 共 4 个示例。 |
| `#xaml-comp-interop` | 原生采样对照的有阻尼弹簧、悬停反向时零初速重启；反比缩放、级联位移、ActualSize 圆周布局、ActualOffset/ActualSize 相对定位。共 5 个示例。 |

已有 Easing、Frame/Page transitions 和 Parallax 继续复用原 SDK。浏览器默认 Canvas2D，WebGL2 由调用方显式选择。Gallery 不使用 CSS 动画、逐帧 JS 属性更新或 JS 动画状态机。

## 公共调用

React 可直接声明原生式隐式过渡和悬停弹簧：

```tsx
<Grid opacity={opacity} motion={{implicit:{[AnimatedProperty.Opacity]:300}}} />
<Button text="Item" motion={{hoverSpring:{period:50,dampingRatio:0.6}}} />
<StackPanel motion={{childrenTransitions:[ThemeTransition.Entrance]}}>
  {items.map(item => <Rectangle key={item.id} width={50} height={50} fill="#add8e6" />)}
</StackPanel>
```

命令式 SDK 使用同一组配置和 Rust 时间线：

```ts
const tile = scene.root.grid({width:50,height:50,
  motion:{implicit:{[AnimatedProperty.TranslationX]:300}}});
tile.update({translationX:200});

const run = tile.animate({scaleX:1.5,scaleY:1.5},
  {spring:{period:100,dampingRatio:0.4}});
run.cancel();
await run.finished;

const prepared = source.prepareConnectedAnimation('hero');
// 业务方完成布局或页面内容切换；目标可以是新建节点。
prepared.tryStart(target,ConnectedAnimationConfiguration.Gravity);
prepared.cancel();

circle.bindExpressions({
  [AnimatedProperty.ScaleX]:ScalarExpression.constant(1)
    .divide(ScalarExpression.reference(tile,ExpressionProperty.ScaleX))
});
circle.clearExpressions();
tile.dispose();
```

表达式使用类型化树，支持加减乘除、余数、sin/cos 和呈现/布局属性引用。Rust 验证场景句柄、循环引用和表达式深度，按依赖顺序在布局后求值；零除等非有限帧保留最近的有限呈现值。显式属性更新或动画替换重叠的绑定；源销毁会解绑并恢复逻辑值。绑定本身不持续申请绘制帧，只有源变化或动画才需要帧。

连接准备最多 64 个、键最长 256 字节，2000ms 后过期，启动只能消费一次。退出绘制最多保留 128 个，连接快照最多 32768 条绘制命令，超预算明确报错。取消、到达终点、减少动画策略和场景销毁释放视觉快照。取消按键作用于准备或已启动的连接；同键重新准备会替换该键的准备内容。

`tryStart` 可在 React 挂载回调中调用。目标或协调元素尚未完成布局时，Rust 在准备内容的有效期内保留启动请求，布局得到有效尺寸后启动；取消、过期或目标被移除时清理请求。尚无可捕获布局的源产生不可启动的连接，使图片加载期间的快速返回仍能完成页面导航。

## 来源和参数

- `references/gallery-motion/` 保存固定 Gallery 原始示例；`tools/extract-gallery-motion.py` 按页面实际顺序提取上述三个 Motion 页面，同时保留仅有 C# 的示例。
- `references/motion-sources.json` 记录 21 个固定 ConnectedAnimation 源文件的 Git blob 和 SHA-256。
- `references/gallery-motion-native.json` 通过 `tools/capture-gallery-motion.py` 读取 Windows UxTheme 数据，沿用固定 `LayoutTransition_partial.cpp` / `ThemeGenerator.cpp` 的故事板选择。记录含机器 OS、每轨的延迟、时长、曲线、起止值和 stagger。它是本机系统主题记录，不代表所有 Windows 版本相同。
- Entrance 平移/透明度 667ms，错峰 35ms、上限 333ms；Reposition 367ms；Content 平移 500ms、透明度从 50ms 起运行 170ms、旧内容退出 50ms；Add 166ms 后缩放/淡入 333ms；Delete 100ms；Popup 367ms 平移、83ms 后淡入 83ms，退出淡出 83ms。
- 隐式标量和向量沿用已有 300ms / cubic `(0.8,0,0.2,1)`；画刷 150ms 线性交叉淡化。
- ConnectedAnimationService 默认 300ms / cubic `(0.8,0,0.2,1)`；Direct 覆盖为 200ms / `(0.1,0.9,0.2,1)`。Gravity 源配方在 0.66 进度有 80 DIP 的 Y 下沉，再返回；无尺寸缩放时增加 1.1 倍缩放，采用源中的两段缓动。
- `tools/extract-motion.py` 从匹配 SDK 提取本轮所需画刷及 SDK 文件指纹；它们进入共享 Rust 资源表，局部主题可重新解析。

## 验证与边界

专项 Rust 用例：`tests/motion_effects.rs`、既有 `tests/animation.rs` / `tests/keyframes.rs`。浏览器交互、两个渲染后端、源码展示和 SDK 生命周期用例：`gallery/tests/motion-effects.spec.ts`。类型负例：`gallery/tests/motion-types.ts`。

```powershell
cargo test --locked --test motion_effects --test animation --test keyframes
cd gallery
npm run build
npx playwright test -c playwright.motion.config.ts
```

系统主题记录和功能回归不等于发行版 Gallery 的逐帧视觉验收。共享渲染器以二维仿射投影为基础，已支持平面 Z 深度、Gravity 的 Z=32 / ThemeShadow 和预乘透明交叉混合；本页末尾记录后续轨迹与合成修正。任意三维透视、原生 Composition 的任意字符串表达式、跨 Scene/窗口连接以及原生冻结纹理/剪裁形变仍未实现。示例未宣称复刻全部原生页面细节。

本轮最终结果：400 项 Rust 回归、8 项浏览器用例（Canvas2D/WebGL2）、strict TS、枚举生成检查、WASM Release、Vite 生产构建与 SDK 声明生成通过。专项动画用例包含 11 项新增 Rust 测试和 5 项既有动画/关键帧测试。浏览器测试的 WASM 与当前开发文件及生产资产 SHA-256 一致。严格 Clippy 仍因其他控件模块的 17 项诊断失败，原始输出保存在 `out/motion-clippy.log`。

最终验证数据和所测 WASM 的 SHA-256 见 `references/validation/motion-effects.json`。

## 2026-11-09：Animation interop / Connected Animation 对照修正

此前四个 Connected Animation 示例共用图片按钮网格，第三个示例甚至没有官方的色块布局。本批按同一固定 Gallery 提交恢复了各自的内容：

- ListView 的八条图片、标题、Views / Likes 与斜体描述，点击进入详情，返回使用 Direct 并恢复滚动与焦点。
- GridView 的十三张 150×110 卡片、Acrylic 标题条、烟雾遮罩、400×320 详情及关闭按钮；连接的是整个卡片，返回动画完成后才释放遮罩。
- 两种色块布局、Navigate，以及 Default / Gravity / Direct / Basic 四个 RadioButtons 选项；Default 沿用服务的 Gravity 默认配置。
- ScrollViewer + ItemsRepeater 的十三个图片模板、说明文字、150×120 单元与 8 DIP 间隔。模板是可聚焦 Grid，支持点击、Enter / Space、四方向定位及返回恢复。

Animation interop 的五个示例恢复了 RadioButtons 阻尼选项（0.2 / 0.4 / 0.6 / 0.8）、带刻度的周期 Slider、Rectangle / Ellipse、四按钮的原始文字与 Margin、八按钮圆周，以及真正的 Popup。前三个悬停示例共用阻尼和周期参数，与官方共享 Spring 动画的行为一致。Popup 使用完整原文、四边文字 Margin、原生背景与边框资源；位置由 Rust 的 ActualOffset / ActualSize 表达式计算。

Rust SDK 同步修正：

- `tryStart(target, configuration, coordinated)` 支持协调元素；其源矩形由主连接的源/目标映射推导，同步缩放、位移与淡入。
- 已保留在树中的源元素在连接期间暂停绘制，避免卡片原位出现重复影像。结束或取消后恢复；快照所有权仍由 Rust 管理。
- 目标节点的 `EventKind.ConnectedAnimationCompleted` 携带 `payload.key`。正常结束与减少动画的立即完成各通知一次，取消不通知成功。
- 可聚焦 Grid 的激活由 Rust 输入处理；ItemsRepeater 的方向键依据实际布局矩形选择目标，支持二维网格。
- Grid 跨 Auto/Star 范围测量时保留有限宽度，跨列内容优先向 Star 分配空间，避免正文撑大 Auto 图片/色块列。来源为固定版本 `CGrid::MeasureCell` / `EnsureMinSizeInDefinitionRange`，原文件与指纹见 `references/motion-layout-sources.json`。
- 浮层分配区域、剪裁和阴影使用同一呈现变换，修复 Popup 已有正确表达式位置但绘制区域仍在旧位置的问题。

`ConnectedAnimation/support/` 保存六组官方子页面及代码，均从固定提交读取。标题、图片和描述采用官方数据；Views / Likes 在官方随机范围内固定，便于复查。`motion-system-colors.json` 记录 `UISettings.GetColorValue(Accent)` 的本机实测值，由 `tools/native-motion-contract` 重新采集；这份强调色不会随应用浅/深色切换而改变，也不会在普通构建时重新采集。

本批完整 Rust 回归通过 426 项；新增用例覆盖协调元素、源绘制抑制、完成通知、Grid 激活、二维方向键、分数 DPI 下的跨列布局及浮层变换边界。Canvas2D / WebGL2 的 8 项浏览器回归、strict TS、枚举检查、Release WASM、Vite 生产构建及 SDK 声明生成通过。浏览器证据和最终构建指纹另见 `references/validation/motion-gallery-parity.json`。需要隔离其他构建时，`playwright.motion.config.ts` 接受 `WINUI_MOTION_WASM`（glue / WASM / build-stamp 同一目录）和可选 `WINUI_MOTION_ROOT`（源码快照）。本次隔离 Release 构建关闭 LTO、使用 16 个 codegen units；仓库默认构建参数没有修改。

本次窗口操作被用户按 Esc 停止，后续没有继续控制官方窗口；本批没有完成发行版窗口的逐像素/逐帧复验。三维 Z/ThemeShadow、透明复杂图层的精确合成、ItemsRepeater 的原生 TabFocusNavigation.Once，以及完整 Frame 页面生命周期仍沿用既有边界。示例页面内容在同一 Scene 中切换并保留集合控件；本批不将它计作新增的 Frame 生命周期实现。


## 2026-11-09：原生容器尺寸复核及正式 WASM 更新

此前浏览器功能测试没有验证官方 ControlExample 的容器默认值，未能发现整体对齐偏差，不能据此判定视觉一致。本次使用已有的匹配 SDK 原生探针测量、固定 Gallery 的 ControlExample.xaml / .xaml.cs 及子页面源码继续修正；按用户要求，本轮不启动或操作 WinUI Gallery app。

预览内容由 Rust ContentPresenter 执行 Padding=12、HorizontalContentAlignment=Left、VerticalContentAlignment=Top，自然宽度不再被 React 场景的全宽拉伸改变。外围 Gallery 宿主恢复官方示例标题间隔与 Options 的 Auto / MaxWidth=320 / Padding=16；移除这两页默认多出的 Renderer / Reduce motion 行，`?motionDiagnostics` 仍可用于切换后端验证。五个 interop 示例在 1143 DIP 内容宽度下的原生高度依次为 266、224、364、248、199；Options 分别为 153、无、无、183、183 DIP。测试在 640 / 1143 DIP 内容宽度与 1 / 1.25 DPR 下读取原生测量夹具作对照，允许文字度量及像素取整的 2 DIP 误差。

SDK 新增 TextBlock.maxLines（0 表示无限制）及高度约束下的多行省略；列表两行描述和卡片三行正文使用同一 Rust 文字链路。Subtitle / Subheader / Title / Body / Caption 的字号、字重、换行和光学边距从固定 SDK 样式提取，详情标题恢复 34 DIP Light，计数值采用 Subtitle 的 SemiBold。Slider 默认 Inline 刻度复用 Rust TickBar 算法；横向模板按 SliderHorizontalHeight=32 的顶端轨道行排列，不会因外部 Stretch 将轨道移到控件中部。

SDK 新增 isHitTestVisible，作用于节点和后代的指针命中及指针通知，并保持 enabled 与绘制状态；卡片烟雾遮罩期间使用它阻止底层命中，不再使卡片进入 Disabled 配色。鼠标、Enter / Space、ItemsRepeater 的二维方向键、两次展开关闭、四种连接配置和 Slider 键盘操作均经实际浏览器验证。

可复查的原生尺寸和来源指纹见 `references/validation/motion-native-layout.json`；本轮构建及浏览器结果见 `references/validation/motion-gallery-native-alignment.json`。原生夹具来自之前运行的独立探针，不是本轮的 Store 发行版截图；这次浏览器对照不代替原生逐像素／逐帧验收。三维 Z / ThemeShadow、复杂透明层的精确叠化、完整 Frame 生命周期及 ItemsRepeater TabFocusNavigation.Once 的既有边界仍保留。

本轮正式产物采用仓库默认 Release 配置（含 LTO），WASM 为 8,306,461 字节。完整 Rust 回归 431 项、正式 WASM 的浏览器回归 11 项，以及开发入口和生产包三主题共 12 组检查全部通过；开发入口实际返回的二进制、正式文件和生产资产 SHA-256 均为 `4331657bb2af706fcac40ddffe329f6fcdd55040eaece757b7b45eed9ed3e160`。`tools/validate-motion-production.mjs` 可复查生产包；设置 `WINUI_MOTION_VERIFY_URL` 与 `WINUI_MOTION_VERIFY_OUTPUT` 可验证已有开发服务并独立保存结果。


## 2026-11-09：弹簧轨迹、视觉溢出与透明合成复核

先前只核验终点和控件参数，漏掉了弹簧时序的实质差异。匹配 SDK 的独立后台探针将 Composition Scale.X 编码到颜色通道，再用 WGC 只捕获该探针自己的离屏、未激活 HWND。没有启动、操作或捕获 WinUI Gallery app，也没有捕获屏幕或其他窗口。探针及运行脚本在 `tools/native-spring-contract/`；规范化脚本为 `tools/normalize-native-spring.py`，轨迹和指纹在 `references/validation/motion-spring-native.json`。

实测的角频率为 `1 / Period`；旧实现使用 `2π / Period`，导致动画快约 6.28 倍。本批修正 Rust 弹簧求值与保守运行时长。三组 Period / DampingRatio 只对齐捕获管线的固定延迟，不拟合时间缩放，最大缩放误差为 0.0048；采样量化步长为 1/128。原生反向采样也确认默认 InitialVelocity 为零，因此官方 hover 示例反向时显式使用零初速。通用 SDK 的 `initialVelocity` 可显式指定，省略时继续保留中断速度。精确的原生静止/完成判据尚未实现；目前时间线保守运行至衰减尾部。

放大裁剪在共享 Rust Scene 修复：逻辑 DesiredSize 与栅格表面边界分开，`surfaceBounds` 包含呈现变换后的溢出和阴影；显式 Clip、滚动视口及圆角祖先的裁剪继续生效。宿主仅投影 Rust 边界及表面原点。第一示例仍为原生的 105 DIP 内容布局高度，按钮放大后绘制表面自动扩展，不再被底边截断；外围 ControlExample 布局高度不变。验证读取实际底部像素并检查命中与显式 Clip。

Connected Animation 增加预乘 RGBA 的真正交叉混合：源、目标分别渲染到裁切表面，按 `(1-p)*source + p*target` 相加，再一次合入父表面，避免先绘制完整源再用透明目标覆盖。Canvas2D 和 WebGL2 均验证半透明红/蓝图层的实际像素。连接源使用共享不可变绘制命令；WebGL 复用流式纹理，避免每一进度创建新的缓存纹理。

Rust 的 `translationZ` 支持属性、动画和表达式。Gravity 沿固定源码的两段曲线升至 Z=32，再回到零，并由已有 ThemeShadow 配方绘制动态阴影；Direct / Basic 不附加该阴影。独立原生 Composition 和 XAML 的重叠采样均证明默认 Z 位移保留集合顺序，因此不按 Z 重排兄弟节点，也不凭空加入透视缩放。此能力仍不是任意 4×4 透视矩阵或 rotationX / rotationY 渲染器。

性能修正包括：直接序列化帧快照；纯合成帧省略未变的静态属性并由宿主恢复公共快照；动画期间避免为保留绘制表面序列化整份显示列表；透明度为 1 的普通图层直接作用于当前表面；交叉混合只分配局部区域；WebGL 随视觉溢出改变尺寸时复用帧缓冲资源。

最终构建、同机性能对比、完整回归和实际开发/生产响应指纹见 `references/validation/motion-compositor-followup.json`。仍保留的范围边界包括：上述原生完成判据、任意三维透视、跨 Scene/窗口连接、依赖复杂背景的原生冻结纹理/剪裁形变、完整 Frame 生命周期和 ItemsRepeater TabFocusNavigation.Once；本批不宣称两页全部逐帧、逐像素完全一致。

同机 Chrome / Canvas2D、Period=200、DampingRatio=0.2 的 2.2 秒 hover 采样：DPR=1 的 WASM 单帧中位耗时从 6.5ms 降至 0.6ms，P95 从 10.7ms 降至 1.0ms；宿主帧 P95 从 11.5ms 降至 1.5ms。DPR=1.25 的 WASM 中位耗时从 6.6ms 降至 0.7ms。稳态帧属性数据约 7KB。前后 rAF 中位间隔均约 16.7ms，这些数据证明本机 CPU 工作量减少，不表示所有设备的帧率提高。复测脚本：`tools/benchmark-motion.mjs`。

本批最终 Release WASM 为 8,706,336 字节，SHA-256 为 `2baeef90794695c1ba538688a09d6bd6983091b05fa55168124bc9b0b1c060b5`；完整 Rust 回归 468 项、最终产物的浏览器回归 14 项、开发/生产两入口三主题共 12 组核验通过，实际响应指纹与正式 WASM 一致。strict TS、来源边界、枚举生成、SDK 声明及生产构建均通过。
