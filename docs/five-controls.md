# 阶段 6.6：五个控件与 ProgressBar 端点修复

本批新增 Border、Canvas、HyperlinkButton、Expander、InfoBadge。Rust 负责布局、状态、输入、资源和动画；React 使用同一 SDK 的直接属性。Canvas2D 仍为默认后端。

## 使用

```tsx
<Border borderBrush="#0067c0" borderThickness={[2, 2, 2, 2]} cornerRadius={8} padding={[16, 16, 16, 16]}>
  <TextBlock text="Text inside a border" />
</Border>
<Canvas width={200} height={120}>
  <Button text="Move me" canvasLeft={20} canvasTop={30} zIndex={1} />
</Canvas>
<HyperlinkButton text="Microsoft home page" navigateUri="https://www.microsoft.com" />
<Expander header="Details" expandDirection={ExpandDirection.Down}>
  <TextBox text="Editable content" />
</Expander>
<InfoBadge value={10} badgeStyle={InfoBadgeStyle.Attention} />
```

基础 SDK 对应 `scene.root.border()`、`.canvas()`、`.hyperlinkButton()`、`.expander()`、`.infoBadge()`。支持 `properties` / `update` / 原子批量、事件订阅取消和 `dispose`。Border、Expander 只接受一个直接内容；多个内容应先包在 Grid / StackPanel 中。创建或移动第二个内容会报错并保留原树。

```ts
const details = scene.root.expander({ header: "Details" });
details.textBox({ text: "Edit me" });
const off = details.onExpanding(event => console.log(event.isExpanded));
details.update({ isExpanded: true, horizontalContentAlignment: HorizontalAlignment.Stretch });
// 不再使用时取消订阅并释放整个子树。
off();
details.dispose();
```

| 控件 | 当前行为 |
| --- | --- |
| Border | 四边独立厚度、统一外圆角、正确的椭圆内边缘、背景、Padding、单内容布局和圆角裁剪；Canvas2D 直接路径，WebGL2 缓存目标密度的边框纹理 |
| Canvas | 子项无限约束测量；自然 DesiredSize 为零；Left / Top 附加位置、负坐标、稳定 ZIndex、溢出和可选显式裁剪；绘制、命中及 DOM 顺序一致 |
| HyperlinkButton | 独立的原生资源样式和 83ms 背景过渡、Click / ClickMode、指针捕获与键盘、禁用；Click 后由浏览器宿主打开 URI |
| Expander | 字符串 Header、任意单内容、Up / Down、默认居中及显式内容对齐；展开/收起事件、裁剪、输入与编辑宿主坐标、收起后的焦点恢复；原版内容转场与箭头关键帧 |
| InfoBadge | Dot / 数字 / FontIcon；Value >= 0 优先于图标；六种资源配色、自适应圆角、至少正方形的自然尺寸；错误数值原子拒绝；非交互的可访问图像语义 |

Expander 默认最小宽度 96、Header 最小高度 48、内容 Padding 16、方向 Down，默认收起。内容水平和垂直对齐均为 Center，可通过 `horizontalContentAlignment` / `verticalContentAlignment` 设置对应枚举。事件 `Expanding` / `Collapsed` 捕获当时的 `isExpanded`，在程序设置和用户操作时均通知。

内容展开采用 333ms 关键帧，收起平移为 167ms；向上展开的反向收起保留原模板 200ms 的 Visibility 终点。属性变化当时即启动时间线，反向采样当前值；隐藏、减少动画和卸载会结束调度。

InfoBadge 默认 Value=-1、最小尺寸 4×4、最大高度 16、字号 11；Value=5 的自然尺寸 16×16，123 为 26×16。`glyph` 是 Segoe Fluent Icons 字形，经过原模板 Viewbox 的尺寸规则；默认图标徽标为 22×16。`badgeStyle` 选择资源配色，默认 Default。6.7 起 Rust 自动应用 Attention / Informational 官方 IconStyle 的 `[0,4,0,2]` 留白，并区分 SymbolIconSource；显式 padding 仍可覆盖。官方组合中图标 16×16、数字 10 为 20×16、Dot 为 4×4。详见 [徽标修正与图标](icons.md)。

HyperlinkButton 的 `navigateUri` 接受绝对 http / https / mailto URI；不设置时只触发 Click。宿主遵守浏览器弹窗策略；没有静默跳过到普通 Button 的假实现。自动测试拦截目标页面，在实际点击后验证新窗口及目标 URI。

## ProgressBar 与小字号绘制

进度条先求移动段与可见范围的交集，再绘制圆端点，避免矩形裁剪切平端点。细条直接绘制到目标密度，移除条带的离屏缩放；ProgressRing 保留局部矢量超采样。端点不叠加第二层圆角抗锯齿遮罩，避免覆盖率相乘；WebGL2 使用解析几何覆盖率。

独立测试用每个物理像素 32×32 面积积分核对圆端点，覆盖 DPR 1 / 1.25 / 1.5 / 2、两后端、默认高度、自定义加高以及进入视口的移动段，共 24 组。端点区域平均通道误差预算为 8/255，数据在 `references/validation/progress-cap-coverage.json`；原有 116 个进度控件原生区域对照继续保留。

小字号徽标还暴露了 GPU 字形纹理的二次线性过滤。轴对齐、未缩放文字现在按最终物理像素相位光栅化，并将纹理原点对齐物理像素；保留实际字号、字宽和亚像素位置。带缩放/旋转的文字仍走既有仿射路径。缓存区分相位并沿用已有容量和设备丢失清理。

## 来源与复现

Gallery 固定提交 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`；WinUI 固定提交 `7b12709347527238494ca28cb9fed326d513e779`，匹配 SDK 及二进制对应关系的边界沿用基准记录。`tools/extract-five-controls.py` 提取模板、资源需求、内容转场、箭头旋转/偏移的全部关键帧与缓动、标记区间，并复制实际官方示例。IR、原文件 SHA-256 与官方源码面板均保留。

```powershell
pwsh -File tools/run-native-probe.ps1 -Kind FiveControls
# 将探针 metrics / palettes 复制到 references 后重新提取和构建
python -X utf8 tools/extract-five-controls.py
pwsh -File tools/test-rust.ps1
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
node node_modules/playwright/cli.js test
```

探针读取真实模板尺寸和颜色，提供浅/深主题、按钮状态、内容方向、徽标样式及图标、非均匀边框的 76 个区域；浏览器两个后端共 152 个。Expander 图像冻结自身 Storyboard 终态；RTB、部件矩形和本探针窗口的 PrintWindow 捕获分开保存。曾发现测试内容 Grid 自然宽度为 0，实测居中位置后修正 SDK 内容对齐和探针内容宽度，没有将空白截图当成实现目标。

`metrics.extra.parts` 在初次布局采样，可能仍处于入场转场，不能作为冻结终态的部件位置；冻结后的展开部件另存于 `out/five-controls-native/*-Expander-*-parts.json`。本批逐像素区域检查使用冻结图像及外框，SDK/源码/探针和 DLL 指纹关联见 `references/baseline.json`。

## 当前边界

- 这些是固定来源的可运行切片，整阶段 6 尚未完成，也未通过 Store 发行版逐像素、逐帧、完整 UIA 验收。字形栅格化、小圆角裁剪和原生 Composition 仍有差异，所有对照记录明确 `acceptedPixelParity=false`。
- 浅/深主题由匹配 SDK 读取资源；HighContrast 使用确定性的系统色语义 fixture，不切换用户的 Windows 辅助功能设置，也不将该 fixture 当作原生高对比度像素验收。
- Border 公共圆角当前为统一值；通用 XAML 模板、渐变边框和 BackgroundSizing 覆盖未导出，非实色 borderBrush 报错。Canvas 没有 Padding、行列轨道或 Spacing，类型和运行时均拒绝。
- Expander 自定义 HeaderTemplate/Selector、任意 React Header 槽及完整 AnimatedIcon 原生队列策略未实现。箭头移植原关键帧、缓动、偏移及标记；快速状态变化合并到一个待播目标，不宣称原生队列完全等价。
- InfoBadge 尚未导出任意 BitmapIcon / PathIcon / ImageIconSource 体系；Gallery 已实现样式与按钮组合示例，NavigationView 的 InfoBadge 插槽示例仍待集成。
- 官方 Canvas 示例的实心矩形通过既有 Grid 组合；Expander 本批实现第一个官方示例，第二个自定义 Header 示例未冒充完成。Options 中的宿主编辑器尚未替换为 Slider / ComboBox。
- HyperlinkButton 第二个示例使用实际 Click 计数展示业务事件；官方 Frame 页面导航宿主尚未移植。官方 XAML 作为独立参考标签保存，React 源码面板显示实际运行代码。
- AutoSuggestBox、NumberBox、Slider 继续等待统一 Popup / ToolTip，不在本批发布缺少默认浮层能力的接口。
