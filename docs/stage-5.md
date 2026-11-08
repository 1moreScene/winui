# 阶段 5：动画与材质

2026-11-09 后续：Motion 新增实现和当前边界见 [Gallery Motion / Rust SDK](motion.md)。下文保留阶段 5 最初验收记录。

日期：2026-11-07。阶段 5 的同场景动画与应用内 Acrylic 出口已实现；本轮进一步按照固定 Gallery 补入多个官方示例。具体覆盖范围如下，不将其等同于完整 Composition/XAML 动画运行时或原生逐像素、逐帧等价。

## 可运行页面与对应范围

| 页面 | 已实现 | 验证边界 |
| --- | --- | --- |
| [Acrylic](http://127.0.0.1:5173/#acrylic) | 官方全部 3 个应用内示例：默认资源、自定义 tint/fallback、luminosity；原有背景图形、尺寸、选项与顺序 | 12 组同 DPI 原生静态对照；500ms 颜色过渡另有固定进度和墙钟比较 |
| [Easing Functions](http://127.0.0.1:5173/#easing) | 官方 4 个示例，11 种缓动函数、3 个方向、Exponent 选项 | 原生 Ease() 的 8481 个样本；可连续点击中断 |
| [Property transitions](http://127.0.0.1:5173/#transitions) | Opacity、Rotation、Scale、Translation 的前 4 个示例，X/Y 分量及连续重定向 | 参数取固定源码及 SDK；通过公共 animate API 驱动。尚无隐式属性挂接、Z、最后两个画刷/局部主题示例 |
| [Gradient brushes](http://127.0.0.1:5173/#gradients) | 官方 RadialGradientBrush 交互示例，Relative/Absolute、Center/Origin/Radius、Pad/Reflect/Repeat；线性画刷取旋转示例配方 | 6 个原生径向配置 × 2 后端，含椭圆外焦点 |
| [System Backdrops](http://127.0.0.1:5173/#system-backdrops) | 系统能力边界和官方调用来源 | 浏览器无 Windows 桌面合成宿主，Mica/Desktop Acrylic 未实现 |
| [Animation and Acrylic 实验场景](http://127.0.0.1:5173/#effects-lab) | 原有同场景文字、Button、移动/滚轮背景、反向、取消与材质策略 | 作为组合、生命周期、采样与性能回归，独立于官方 Acrylic 页面 |

旧的 `#effects` 入口现在转向官方 Acrylic 页面。正常开发继续复用 5173，避免重复启动导致端口占用。

## Rust / TS API

- `SceneNode.animate(targets, options)` 支持 translationX/Y、scaleX/Y、rotation、opacity。每条轨道接受端点数值或 1–256 个递增的关键帧；最后一个 offset 必须为 1。省略 offset 0 时，从当前呈现值接续。支持 Discrete、逐帧 cubic/具名缓动、delay、多属性及恰好一次终态通知。
- `EasingFunction` 的 Back/Bounce/Circle/Cubic/Elastic/Exponential/Power/Quadratic/Quartic/Quintic/Sine 移植自固定 `EasingFunctions.cpp/.h`，支持 `EasingMode` 和原生默认参数。ElasticEase 不是物理弹簧动画。
- `properties` 保存逻辑目标，`snapshot.presentation` 保存当前呈现值。绘制、DOM 和命中测试使用同一变换矩阵；rotation/scale 使用本地 centerPoint，视觉动画不触发布局重算。
- 重叠属性中断整个旧组并从当前值接续；不重叠组并行。取消冻结呈现值，保留逻辑目标。失败事务不改变轨道；回调可重入；节点、祖先或场景销毁结算全部动画并释放资源。
- 封闭属性均从公共入口导出运行时枚举，strict TS 包含裸字符串、错误成员和不兼容枚举的编译负例；基础 SDK 不依赖 React。

## 材质与画刷

从 `AcrylicBrush.cpp/.h` 提取 blur 30、noise opacity 0.02、fallback crossfade 167ms、颜色变更 500ms 及相应曲线，记录于 `references/material-graph.json`。效果顺序为强制不透明 fallback → 下层场景 source-over → hard-border Gaussian → luminosity → tint/color → 原始 256×256 噪声 → fallback crossfade；opaque tint 保留原生快捷分支。

默认资源通过 `acrylicResource` 解析到主题配方或高对比度实色；`acrylic` 提供自定义配方。原生 ColorKeyFrameAnimation 的 Auto 实测沿 HSL 插值；使用暂停的原生颜色控制器提取 129 个默认曲线样本，Rust 在效果颜色层执行插值。没有通过拟合墙钟来掩盖呈现延迟。固定进度 Acrylic 截图是独立的留出验证，未用于计算这条曲线。

Canvas2D/WebGL2 都采样本场景已绘制的下层内容。隔离透明组保留祖先背景；上层文字和 Button 不会进入 backdrop。GPU 采用降采样双向 Gaussian，支持嵌套裁剪与仿射变换，缓存按尺寸复用并在卸载时释放。减少动画直接到目标；减少透明度进入 fallback；高对比度立即退出材质效果；媒体策略变化有真实浏览器回归。

线性/径向画刷支持 2–32 个有序色标。GPU 直接计算焦点椭圆；Canvas 参考后端对径向及重复画刷缓存局部纹理，最多 8 项、单项 1MP，超过预算明确报错。没有将整个场景先交给 Canvas 再当作 GPU 绘制。原生焦点在椭圆外时出现锥形有效域，无效区域取最后一个色标，不能将焦点强行钳回椭圆内。

## 对照结果

全部 **38 项 Rust、33 项浏览器回归**通过；strict TS（含枚举负例）、两个目标的 Clippy `-D warnings`、fmt、枚举生成检查、WASM/Vite 和 SDK 声明构建通过。Button 的 36 个原生状态、NavigationView 的焦点与快速点击、四档 DPR 的布局/文字/GPU 回归继续通过。

统一 Windows SDK、主题、SystemAccentColor `#0078d4`、尺寸及 DPR 1.25。这里的平均通道差指 RGB 绝对误差，范围 0–255：

| 对照 | 样本 | 结果 |
| --- | --- | --- |
| 官方 Acrylic 静态 | 12 个主题/配方组合 | 均值 0.139–1.335；预览全区域排除窗口边缘 5 个物理像素 |
| 径向渐变 | 6 个原生配置 × Canvas/GPU | 均值 0.010–0.065；含 Pad/Reflect/Repeat 和椭圆外焦点 |
| 11 种缓动、3 个方向 | 33 × 257 | 每个样本绝对误差小于 0.0001 |
| Acrylic 颜色固定进度 | 34 张黑→红、红→蓝 | 均值的 P95 0.420，最大 0.461 |
| Acrylic 颜色墙钟重放 | 75 帧，含中断 | 均值的 P95 18.469，最大 20.546；保留 UI/compositor 呈现延迟差异，不接受精确时序等价 |

原有组合场景保留 84 帧原生动作重放与材质局部区域比较。其 UI Rendering、GDI 捕获和浏览器回放不是同一种 present 时间，详细数据以 `effects-native-comparison.json` 为准。原生捕获工具校验已知背景和颜色端点；失去前台时只允许捕获探针自己的窗口，禁止把桌面或其他应用像素当作对照。

生产性能使用独立的 4175 preview、三轮新 Chrome context，各 120 RAF。报告分别记录同步 frame、GPU timer query、RAF 间隔和 fence 上界；query 不等于显示延迟，缓存数量不等于 VRAM 字节，未测总进程内存。实际数值与环境见 `effects-performance.json`，不据此推导跨设备性能。

## 证据与重跑

| 内容 | 位置 |
| --- | --- |
| 范围、指纹和机器结果 | `references/stage-5.json`、`references/stage-5-alignment.json`、`references/baseline.json` |
| 固定 Gallery 的 50 个源文件与提取 | `references/gallery-motion/`、`tools/extract-gallery-motion.py`、`gallery/src/official-motion.json` |
| 固定动画源码 | `references/winui/EasingFunctions.cpp`、`EasingFunctions.h`、`SharedTransitionAnimations.cpp` |
| 原生曲线与默认值提取 | `tools/extract-native-motion.mjs`、`references/composition-color-profile.json`、`motion-native-defaults.json` |
| Acrylic/渐变/颜色对照 | `references/validation/official-acrylic-comparison.json`、`gradient-comparison.json`、`tint-animation-comparison.json` |
| 原生原始输出和浏览器截图 | `out/materials-native/`、`out/materials/`、`out/effects-native/`、`out/effects/` |
| 生命周期、关键帧、缓动、交互 | `tests/animation.rs`、`tests/keyframes.rs`、`tests/easing.rs`、`gallery/tests/materials.spec.ts`、`effects.spec.ts` |

```powershell
./tools/run-native-probe.ps1 -Kind Materials # 包含原生曲线提取
./tools/run-native-probe.ps1 -Kind Effects
./tools/prepare-baseline.ps1
node tools/verify-baseline.mjs --local
cargo test --locked
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
node node_modules/playwright/cli.js test # 使用配置中的 JSON 输出，勿覆盖 reporter
cd ..
node tools/benchmark-effects.mjs
node tools/compare-navigation.mjs
node tools/collect-validation.mjs
node tools/record-stage-5.mjs
```

原生 runner 仅关闭自己创建的进程，性能工具仅关闭自己的 preview。

## 剩余范围

完整隐式属性挂接、Vector3 的 Z、BrushTransition、局部主题动画，以及 Theme/Entrance/Reposition/Content/Page/Connected、spring/expression 家族尚未完成；相应固定 Gallery 源文件已登记，不把文件存在算作已实现。集合、导航和浮层相关示例需按阶段 6/7 依赖推进。

Mica/Desktop Acrylic 依赖 Windows 合成宿主，浏览器端不以半透明填色冒充实现。Gaussian 降采样/有限核、8-bit 曲线测量、字体/边缘栅格化及未覆盖的原生复杂图层矩阵仍有质量或覆盖限制。多色标 API 和原生两色不透明径向对照分开登记；未完成所有色标/透明度组合的原生验收。
