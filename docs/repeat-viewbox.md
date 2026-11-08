# RepeatButton / Viewbox（阶段 6.5）

2026-11-07。本批继续阶段 6 的输入与布局基础，复用 Rust 场景、输入、主题、绘制、时钟和 React 适配。默认 Canvas2D，WebGL2 显式选择。

## 简单用法与属性

在现有 `WinUIProvider` / `SceneView` 下直接使用：

```tsx
<RepeatButton text="Click and hold" onClick={() => setCount(c => c + 1)} />
<Viewbox width={200} height={200}>
  <Image source="/picture.png" />
</Viewbox>
```

基础 SDK：`scene.root.repeatButton()`、`scene.root.viewbox()`；普通容器和按钮内容也可以创建 Viewbox。统一 `properties`、`update`、原子批量、订阅取消、`dispose`；Viewbox 接受一个子节点，需要多个内容时先创建 Grid 或 StackPanel。创建、移动第二个内容或将包含交互控件的 Viewbox 移入按钮时，Rust 报错并保留原有树。

```ts
const repeat = scene.root.repeatButton({ text: "Hold", delay: 500, interval: 33 });
const off = repeat.onClick(() => increment());
repeat.update({ interval: 60 });
const view = scene.root.viewbox({ stretch: Stretch.Uniform, stretchDirection: StretchDirection.DownOnly });
view.image({ source: "/picture.png" });
// 不再需要时：off(); repeat.dispose(); view.dispose();
```

`delay` 是非负 32 位整数毫秒，默认 **500**；`interval` 是正整数毫秒，默认 **33**。默认 `ClickMode.Press`，按下立即 Click，之后由 Rust 定时通知；没有额外的 Repeat 事件。支持 Hover、Press、Release、Space 持续重复、Enter 单次触发、拖出停止/重入重新延迟、取消、失焦、禁用、隐藏和卸载。活动计时器的 Delay 修改不重启当前等待；Interval 在下一次 tick 后生效。UI 线程迟到时不补发一串过期 Click，减少动画也不会关闭业务重复操作。空闲时没有周期 RAF；Rust 投影下一次 tick，宿主只安排一次唤醒。

Viewbox 默认 `Stretch.Uniform`、`StretchDirection.Both`。`Stretch` 是现有 `ImageStretch` 的公共别名，共用同一具名枚举与 Rust 映射；支持 None、Fill、Uniform、UniformToFill。`StretchDirection` 为 UpOnly、DownOnly、Both。没有 Padding 属性，需内边距时将带 padding 的容器放进子节点。

## 固定原生来源与实现

- Gallery：`7360ac322414e118eadfb0c7c2f4ecc31a218f59`。
- WinUI：`7b12709347527238494ca28cb9fed326d513e779`；RepeatButton 的 CommonStyles 模板、`RepeatButton_Partial.cpp/.h`、自动化 peer，以及 `core/core/elements/Viewbox.cpp` / `core/inc/Viewbox.h`。
- `tools/extract-basic-next.py` 提取独立的 RepeatButton 状态、资源别名、83ms BackgroundTransition 和实际 Gallery 示例，保留 ContentPresenter 的原始绑定及未实现能力说明；不把 RepeatButton 当成任意 Button 样式的静态副本。
- 匹配 SDK 探针读得默认 Delay=500、Interval=33、ClickMode=Press；内容水平和垂直对齐均为 Center。Native `TextBounds` 不能单独用来反推这两个属性。

Viewbox 将唯一内容按无限约束 Measure，使用内部容器按物理像素取整后的自然尺寸计算比例；无约束轴借用另一轴，零尺寸不产生无穷或 NaN。Arrange 保留未缩放的子空间，通过同一份 Rust 矩阵驱动绘制、DOM、编辑宿主和命中。UniformToFill / UpOnly 可产生大于槽位的实际 RenderSize，布局裁剪单独投影，不能只放大 Canvas 或 CSS 外壳。源实现的 XFLOAT 对齐运算在对应步骤使用 f32，避免在 125% DPI 显式尺寸居中时与原生相差一个物理像素。

分数 DPI 核对还发现 GPU 几何四边形过紧，导致部分边缘片元在进入 SDF 覆盖率计算前被丢弃。几何绘制加入一物理像素的采样余量；纹理和材质矩形保持原采样范围。轴对齐矩形 stencil 的半像素边界按原生 top-left 规则处理，绘制几何位置不移动。

## 复现与证据

```powershell
pwsh -File tools/run-native-probe.ps1 -Kind BasicNext
pwsh -File tools/run-native-probe.ps1 -Kind BasicNext -PerMonitorDpi
pwsh -File tools/test-rust.ps1
cd gallery
$env:PW_CHANNEL='chrome'
node node_modules/playwright/cli.js test tests/basic-next.spec.ts
```

第二个原生调用启用进程级 DPI 感知；本机当前为 125%，数据仍以记录中的实际 `environment.dpi` 为准，不更改系统 DPI。文件在 `out/basic-next-native/`、`out/basic-next-native-125/`，对应 `references/basic-next-metrics*.json`。

原生探针记录浅/深主题、确定性高对比度资源、四种按钮状态、Viewbox 的四种 Stretch × 三种方向 × 大/小/显式尺寸；并通过本进程 Content Island 的 HWND 消息观察 Space 重复、Enter 单次。消息不注入其它程序，采样时间保留调度抖动，不作为精确呈现时刻。

另外使用官方 Slices.png 和完整条纹、边框、文字组合核对 Gallery 示例：100% DPI 下原生与 Rust 的自然内容均为 190 × 149 DIP，200 × 200 槽位的 Uniform 缩放比例一致，实际高度约 156.842 DIP；浏览器回归直接读取探针记录验证这些尺寸。

Rust 新增 7 项回归，包含两组 DPI 共 144 个 Viewbox Arrange 数据、16 个无界/零约束 Measure 结果，以及计时、失效句柄、裁剪命中与树约束。浏览器新增 6 项测试，覆盖实际长按/键盘/释放、动态属性、源码面板、四种 DPR 的交互和 DOM 矩阵；Canvas2D / WebGL2 各 156 个原生区域，共 312 个。RepeatButton 使用 100% DPI 的 12 个状态，Viewbox 使用 100% 与 125% DPI 各 72 个区域。

结果：`references/validation/basic-next-Canvas2D.json`、`basic-next-WebGL2.json`。按钮边框/背景与字形区域分开记录误差，字形栅格化仍有 DirectWrite 与浏览器后端差异。强制 VSM、RenderTargetBitmap 和平均误差不代表 Store 发行版的逐像素或逐帧验收。

## 当前边界

RepeatButton 尚未提供通用 XAML ContentTemplate/ContentTransitions、直接边框/BackgroundSizing 和内容对齐属性覆盖；可用现有子节点布局组合内容，未支持的直接属性会报错。Viewbox 未承诺复杂旋转、嵌套材质和所有字体条件的原生像素等价。完整 UIA/屏幕阅读器验收仍待补充。

Gallery 运行两个固定官方示例。Viewbox 中的方形 Border 和 Rectangle 用现有 Grid 布局组合；Width/Height 选项当前使用宿主 range 输入，未将它冒充 SDK Slider。Slider 的默认数值提示涉及 ToolTip，AutoSuggestBox / NumberBox 也依赖 Popup，继续留到统一浮层设施之后完整实现。阶段 6 整体仍未完成。
