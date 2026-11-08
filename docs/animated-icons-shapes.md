# 阶段 6.8：图标扩展、AnimatedIcon 与五种 Shape

日期：2026-11-07。运行入口：[IconElement](http://127.0.0.1:5173/#icon-element)、[AnimatedIcon](http://127.0.0.1:5173/#animated-icon)、[Shapes](http://127.0.0.1:5173/#shapes)。这是阶段 6 的新增切片，阶段 6 整体尚未完成。

## BitmapIcon 与 IconElement

BitmapIcon 默认 ShowAsMonochrome=true：保留原图 alpha，以继承的 Foreground 着色。Slices.png 内部不透明，因此勾选单色时显示实心圆是原生行为。固定 Gallery 的这个示例显式设置 False；现在页面初始显示彩色，并从实际 XAML 提取说明文字。关闭单色后恢复原图颜色，不使用灰度滤镜。

SVG 示例改为官方引用的 LibreICONS camera-panorama.svg。素材固定到外部 commit `2d2172d15e3c6ca03c018629d60050e4b99e5c55`，MIT 许可证随素材提供；指纹见 `references/external-icons.json`。这取代 6.7 的 MirrorPCConsent 素材替代方案。

新增图标局部 FlowDirection、FontIcon 镜像及 AnimatedIcon 原生方向策略。它们不改变其他控件的 RTL 布局。修正图片自然尺寸测量复用文字约束向下取整造成的分数 DPR 宽高差；图片仍可放大，不能错误地限制为不超过原图。

IconSource 是类型化值描述，支持 Font、Symbol、Path、Bitmap、Image。当前固定 SDK 的 IconSourceElement 支持前四种，传 Image 会明确拒绝；AnimatedIcon 的 fallback 支持全部五种。描述通过 create/update 复制，不能像 WinRT 可变共享对象一样原地修改后自动传播。普通 TS 节点提供 properties/update/snapshot/dispose。

```tsx
<IconSourceElement iconSource={{kind: IconSourceKind.Symbol, symbol: Symbol.Find}} />
<AnimatedIcon source={AnimatedIconSource.Find} state={state}
  fallbackIconSource={{kind: IconSourceKind.Symbol, symbol: Symbol.Find}} />
```

## AnimatedIcon

此阶段已有矢量、画刷、场景时钟和动画资源基础，可以实现固定内置源：Back、ChevronDownSmall、ChevronRightDownSmall、ChevronUpDownSmall、Find、GlobalNavigationButton、Settings。提取器读取固定 C++ 生成代码，生成带来源指纹的几何、关键帧、缓动、属性表达式和视觉树描述；遇到未知必需语法即失败。

Rust 执行视觉图和时钟，不由 React 逐帧更新属性。状态名保持开放字符串，按源 marker 查找转换；保留原生默认 QueueOne、队列上限 4、最短播放 20ms 和状态回退。支持减少动画、隐藏停止、源更新、卸载和局部继承状态。SDK 实例的 `sdk.animatedIconInfo(source)` 提供固有尺寸、时长与 marker。

Gallery 提供官方按钮指针示例和 NavigationView 的 Settings 示例。NavigationView 项可设置 animatedIconSource；其玩家由 Rust 管理并随项移除释放。箭头源的状态名不同于 Find，不能假设每个源都响应 PointerOver。

按钮示例现使用 SDK 便捷属性 `useParentState`，由 Rust 读取最近按钮的 Normal/PointerOver/Pressed/Disabled，显式 state 或 attached animatedIconState 优先。默认 false，属于本 SDK 的组合接口；原生 Gallery 示例仅接 PointerEntered/Exited，没有按下联动。固定 Find 源的悬停段 0..0.113125 没有几何变化（实际原生 0 与 0.06 截图完全相同），按下和释放段才会缩放/回弹。页面对此明确说明；Settings 可检验悬停动效。两种 On/Off 箭头示例使用 ToggleButton，Rust 为对应源追加 On/Off。真实输入测试检查图标暗色像素变化，避免仅验证状态文本而漏掉无可见动画。

当前未实现任意 Lottie/自定义 AnimatedVisualSource、私有播放策略测试钩子、完整 WinRT 依赖属性语义和全局系统文字缩放。既有 CheckBox 的 Accept 专用播放器尚未迁移到本次通用队列。未以这些切片宣布所有动画全面对齐。

## 下一批五个控件

Rectangle、Line、Path、Polygon、Polyline 共用 Rust 几何与 Shape 画刷链路。支持填充、描边、粗细、Stretch、填充规则、独立端帽、连接、斜接限制、虚线与偏移，Rectangle 支持独立 x/y 圆角。几何变换后再拓宽描边，避免 Stretch 一并缩放线宽。Uniform 居中；UniformToFill 裁剪到实际布局框。实体及线性/径向渐变使用同一几何遮罩，Canvas2D 默认，WebGL2 显式选择。

```tsx
<Rectangle width={100} height={100} radiusX={12} radiusY={8}
  fill="#4682b4" stroke="#000000" strokeThickness={2} />
<Path data="M 10,100 C 100,25 300,250 400,75 H 200" stroke="#b8860b" />
```

五个运行示例及源码来自固定 Gallery 的 Shape/Line 页；暂用宿主范围编辑器，Slider 的默认 ToolTip 仍等待阶段 7 Popup。此批未实现完整 GeometryGroup 对象 API、点位标签示例和通用几何变换对象。Ellipse 的既有原语未被当作本批完整 Shape 描边实现。

原生显式尺寸矩阵验证 Shape 布局、填充规则、四端帽、三连接、虚线和四 Stretch。未指定宽高时，当前 SDK 的 Canvas 子节点可见但 Actual/DesiredSize 为零；Rust 当前保留源代码自然正向边界算法，该布局场景尚未获得原生等价验收，不能由显式尺寸矩阵推导。

## 独立对照及边界

继续固定 Gallery `7360ac322414e118eadfb0c7c2f4ecc31a218f59` 与 WinUI `7b12709347527238494ca28cb9fed326d513e779`，源码和二进制严格对应关系仍未建立。

AnimatedIcon 探针使用实际 Composition 源，冻结 9 个进度、7 种源、2 个主题，共 126 区域；浏览器两个后端共 252 区域，平均通道差预算 12/255。采用每显示器 DPI 感知、125% 的实际探针窗口捕获，排除 DPI 虚拟化放大模糊。此结果是冻结帧验证，不能替代 Store 发行窗口逐帧呈现时序验收。

Vectors 探针直接创建原生控件，两主题共 106 区域，两个后端共 212 区域。涵盖五种 Shape、镜像、PathIcon、50/180 DIP 图片与非正方形框、IconSourceElement 和五种 fallback。RenderTargetBitmap 按实际返回尺寸保存，避免 stride 错误。普通图形区域预算 8/255，字体/图标源预算 20/255；所有 acceptedPixelParity 标志保持 false。

```powershell
pwsh -File tools/run-native-probe.ps1 -Kind AnimatedIcons
pwsh -File tools/run-native-probe.ps1 -Kind Vectors
# 将各探针 metrics 复制到 references 后运行提取、构建和测试。
node tools/build-wasm.mjs
pwsh -File tools/test-rust.ps1
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
npx playwright test
```

矩阵和实际交互回归见 `gallery/tests/animated-icons.spec.ts`、`vectors.spec.ts`；Rust 状态/所有权/非法批次验证见 `tests/animated_icon.rs`、`shapes.rs`。最终实际计数与指纹统一记录在 `references/stage-6.json` 和 `references/validation/results.json`。

并行会话正在同一工作区实现 Popup/ToolTip/Slider。本批浏览器回归使用 `playwright.stage6.config.ts`，单独保存结果且不将另一会话的 overlays.spec.ts 当作本批验收。`tsconfig.stage6.json` 同样只排除该测试文件，SDK/React 源码仍接受 strict 检查。共享工作区整体 fmt/Clippy 的实际退出状态单独记录在 `references/validation/stage6-integration-checks.json`，不能把单批通过表述为整个并行工作区已通过所有检查。

额外端点验证对四种 Line 端帽各取 16×16 物理像素区域，预算 4/255，避免大面积背景稀释端帽问题。WebGL2 局部矢量纹理现在保留目标物理像素相位，平移后的纹理四边形对齐到像素边界，消除中间栅格和最终合成的两次过滤。该规则限于正向、轴对齐、等比变换；旋转/非等比仍沿用原采样路径。

本次最终记录：共享工作区 101 项 Rust 测试通过（本批新增 11 项）；阶段 6 的 97 个浏览器项目最新结果通过，其中全量运行 95 项通过，另外两项经重跑通过。原始全量与重跑统计同时保留在 results.json 的 browserRuns，不表述为单次全量全绿。一个失败源于并行构建触发热重载；另一个是 RepeatButton 页自绘 CheckBox 的 ARIA 在下一帧提交，测试现使用 click 后等待 checked。专项 8 项全部通过，检查实际按钮点击/键盘、悬停暗色图形像素变化、箭头 On/Off、双后端冻结矩阵、渐变边缘与示例更新。完整 strict TS、Vite/SDK 声明构建、rust-analyzer 错误扫描和基准指纹检查通过；整体 fmt/双目标 Clippy 仍被并行 overlay 代码的格式/告警阻挡，详情见集成检查文件。
