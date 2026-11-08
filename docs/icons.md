# 阶段 6.7：InfoBadge 修正与五种图标

本文保留 6.7 的历史验证记录。6.8 已补图标源、局部方向/镜像、图片放大对照、AnimatedIcon，并将 SVG 改为官方 camera 素材、BitmapIcon 示例默认改为彩色；当前范围以 [6.8 记录](animated-icons-shapes.md) 为准。

日期：2026-11-07。运行入口：[InfoBadge](http://127.0.0.1:5173/#info-badge)、[IconElement](http://127.0.0.1:5173/#icon-element)。本批实现五个可运行切片，阶段 6 整体仍未完成。

## InfoBadge

用户提供的官方图标和数字约为 20px 高，Dot 约为 5px 方形，对应 125% 缩放下的 16 DIP 和 4 DIP。之前的独立默认控件矩阵未覆盖官方三个徽标同处水平 StackPanel 的组合，不能用它判断 Gallery 样式是否正确。

现在 Rust 自动应用 Attention / Informational 的 IconStyle 留白 `[0,4,0,2]`，并区分 Success / Critical 的 SymbolIconSource 与 FontIconSource；数字和 Dot 使用对应的零 Padding。显式 `padding` 仍可覆盖。React 不再要求手动补齐该留白，Dot 按官方设置垂直居中。Gallery 下拉仅提供官方四组样式。

重新运行匹配 SDK 的真实命名 Style 和官方水平 StackPanel：两主题、四组样式，各三个节点，图标 16×16、数字 10 为 20×16、Dot 4×4。两后端共 16 个组合、48 个节点区域，矩形严格核对，区域平均通道差预算 16/255。数据见 `references/five-controls-metrics.json` 的 `galleryBadges` 和 `references/validation/badge-gallery-*.json`。原生默认自定义 FontIconSource 徽标仍为 22×16，它与官方 AttentionIconInfoBadgeStyle 不同。

SDK 使用内容 SHA-256 版本化 WASM URL，并在开发构建标记改变后重载，避免旧页面保留旧实例。测试核对实际请求版本与构建标记；未将缓存修正当作样式修正的替代。

## 图标 API

```tsx
<FontIcon fontFamily="Segoe MDL2 Assets" glyph={"\uE790"} />
<SymbolIcon symbol={Symbol.Accept} />
<PathIcon data="F1 M 16,12 20,2L 20,16 1,16" />
<BitmapIcon uriSource="/official/Slices.png" width={50} />
<ImageIcon source="/official/Slices.png" width={50} />
```

这些组件位于统一 Provider / SceneView 内，直接接收属性。基础 SDK 对应 `scene.root.fontIcon()`、`symbolIcon()`、`pathIcon()`、`bitmapIcon()`、`imageIcon()`，也可通过 Button、Border、Viewbox 和普通面板组合；返回类型化节点，提供 `properties`、`update()`、`snapshot`、`dispose()`。创建和移动受现有所有权规则约束，图标不能包含子控件；事务中的非法几何会原子拒绝整批更新。

| 控件 | 当前语义 |
| --- | --- |
| FontIcon | Glyph、FontFamily、FontSize、FontWeight、FontStyle；默认 20 DIP；继承前景色，字形在内容框中居中 |
| SymbolIcon | 默认 Emoji；197 个具名运行时 Symbol 枚举成员；按固定 WinUI C++ 将旧 Symbol 值映射到 Fluent 字形 |
| PathIcon | `M/L/H/V/C/S/Q/T/A/Z` 及相对命令、`F0/F1` 填充规则；保留原生 Stretch=None 的坐标和正向原点预算；没有强行拉伸到指定宽高 |
| BitmapIcon | UriSource、ShowAsMonochrome；默认使用图片 alpha 遮罩和继承前景色，关闭后保留原图颜色 |
| ImageIcon | 原图颜色；PNG/JPEG/SVG 复用现有浏览器解码和 Rust 图片尺寸/均匀适配链路 |

全部图标默认不进入 Tab 顺序；`accessibleName` 提供图像语义，否则作为装饰。按钮负责输入、状态和动画，图标继承其呈现前景色。本批图标本身没有独立的 AnimatedIcon 时间线。

路径由 Rust 解析并缓存，限制 4096 个命令和有限坐标。Canvas2D 直接执行矢量命令；WebGL2 缓存目标密度的局部矢量纹理。BitmapIcon 的 Canvas 遮罩使用原图分辨率，GPU 直接采样共享纹理 alpha，避免逐主题复制图片纹理。图片 URL 在两个图标种类和已有 Image 间共享解码；移除最后一个引用时按已有场景回收机制释放。依赖 `kurbo 0.13.1` 用于可靠解析曲线、弧线并计算边界，锁定在 Cargo.lock，许可证 MIT OR Apache-2.0。

## 来源和验证

Gallery 固定 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`，WinUI 固定 `7b12709347527238494ca28cb9fed326d513e779`，二进制与源码关系沿用现有基准边界。新增十个源文件、197 个 SDK Symbol 值、默认属性和 SHA-256；由 `tools/extract-icons.py` 生成共享映射及六个官方示例。SVG 示例使用固定 Gallery 自带的 MirrorPCConsent.svg，并在页面明确标注与官方外部 camera URL 的素材差别；没有把浮动外部素材当作固定基准。

```powershell
pwsh -File tools/run-native-probe.ps1 -Kind Icons
Copy-Item out/icons-native/icons-metrics.json references/icons-metrics.json
python -X utf8 tools/extract-icons.py
node tools/generate-enums.mjs
pwsh -File tools/test-rust.ps1
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
node node_modules/playwright/cli.js test
```

原生探针实际创建五类控件，覆盖两主题、多个字号/符号、直线/曲线/弧线、两种图片尺寸和单色切换，共 34 个区域；两后端共 68 个尺寸及区域对照。字形区域平均通道差预算 25/255，几何/图片 12/255，保留实际误差而不宣布像素等价。分数 DPR 1.25 / 1.5 / 2 的圆形 PathIcon 另以 32×32 面积积分独立检查覆盖率，预算 4/255，覆盖两个后端；生命周期验证包含共享图片引用、卸载、非法批次和失效句柄。React 验证六个运行示例、真实按钮输入、源码、SVG 和后端重挂载。

尚未验收完整 Store 窗口逐像素/呈现时序与屏幕阅读器；未导出 FlowDirection/RTL 镜像、系统文字缩放策略、FontIconSource/IconSourceElement 对象体系、任意 IconSource 模板、渐变图标前景和图片加载/失败事件 API。这些明确保留，不用当前静态区域对照推导完整 WinUI 等价。

本批最终验证：82 项 Rust、89 项 Chrome 浏览器测试全部通过；strict TS（含枚举和直接属性负例）、生产 WASM/Vite/SDK 声明构建、双目标 Clippy、fmt 和实际 VS Code rust-analyzer 扫描通过。基准核对 99 个 WinUI 源文件及 226 个本地指纹。完整数据见 `references/validation/results.json`、`references/stage-6.json`。
