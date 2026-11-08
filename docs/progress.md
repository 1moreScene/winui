# ProgressBar / ProgressRing（阶段 6.4）

2026-11-07。Rust 负责范围属性、状态、布局、几何、颜色和时间线；TS/React 使用同一场景实现。默认 Canvas2D，WebGL2 为显式选项。

## 用法

```tsx
import { ProgressBar, ProgressRing } from "./react";

<ProgressBar value={50} />
<ProgressBar isIndeterminate showPaused={paused} showError={failed} />
<ProgressRing />
<ProgressRing width={60} height={60} isIndeterminate={false} value={progress} />
<ProgressRing isActive={working} />
```

组件放在现有 `WinUIProvider` / `SceneView` 内。基础 SDK 使用 `scene.root.progressBar()` / `progressRing()`；按钮和普通容器也可以包含进度指示器。返回的对象统一提供 `properties`、`update`、`snapshot`、`on`、`dispose`。ProgressBar 的 `onValueChanged` 返回取消订阅函数，通知携带钳制后的 `event.value`；ProgressRing 保持原生独立属性模型，不虚构 RangeBase 事件。

`minimum=0`、`maximum=100`、`value=0`。有限范围外的值被 Rust 钳制。单独将 minimum 提高到 maximum 之上会同时提高 maximum；单独降低 maximum 同理。原子提交的显式反向区间会报错，且不改变已存在的控件。等值范围显示零进度。NaN、无穷大、自定义 AnimatedVisualSource 等未支持输入明确报错。

ProgressRing 默认 `isActive=true`、`isIndeterminate=true`、32×32 DIP，最小 16 DIP；停用时隐藏整个视觉并停止调度。ProgressBar 默认确定进度、3 DIP 指示器、1 DIP 轨道；`showError` 优先于 `showPaused`，两者默认 false。控件均不拦截指针，不进入 Tab 顺序，投影只读 `progressbar` 语义；不确定进度省略 `aria-valuenow`，停用的 ring 从无障碍内容视图隐藏。

## 源码与动画

Gallery 固定 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`；WinUI 源码固定 `7b12709347527238494ca28cb9fed326d513e779`。模板、IDL、C++ 和内置动画位于 `references/winui/Progress*`。`tools/extract-progress.py` 提取默认属性、主题需求、视觉状态、关键帧、来源指纹及四个官方示例到 `references/progress-template.json` 和 `gallery/src/official-progress.json`。

- Ring 不确定进度：80 单位画布、半径 35、线宽 7.5；2 秒内旋转 900°，两半周期分别增长/收缩 trim，并在半周期切换两个形状的透明度。确定进度采用 32 单位画布、半径 14.15999984、线宽 2.65499997，以及源动画的可见阈值和末端关键帧。两者均整体 Stretch.Fill，非正方形时连同笔画和端点一起缩放。
- Ring 数值增加按 AnimatedVisual 的 2 秒全程速度播放，减少时立即设置；连续增加从当前呈现值衔接，避免快速更新跳变。重复周期由 Rust 时钟推进，不由 React 每帧设置角度。
- Bar 不确定进度：40% 与 60% 的双段，第一段 1500ms，第二段延迟 750ms，周期 2000ms，曲线 `(0.4,0,0.6,1)`；暂停/错误使用 167ms 颜色变化及 750ms 收束轨道，恢复有 333/500ms 的模板过渡。确定值变化采用原生系统 Reposition 的 367ms 与实测曲线，中断保持当前呈现边缘。
- 默认浅/深主题资源从匹配 SDK 解析。高对比度使用项目已有的确定性颜色策略，不声称读取了用户操作系统的高对比度方案。减少动画或高对比度时，确定进度立即到达目标，不确定进度显示静止形状，不持续请求帧。

共享显示列表新增圆弧原语：Canvas2D 采用真正圆弧及局部矢量超采样，WebGL2 使用圆弧与圆端点的解析距离场，避免分段折线锯齿和描边重叠。文本和其它控件继续使用原有链路。

## 对照和限制

`pwsh -File tools/run-native-probe.ps1 -Kind Progress` 构建并运行独立匹配 SDK 探针。它记录实际 DLL SHA-256、系统、RasterizationScale、部件矩形、播放器时长，保存浅/深主题图像及冻结的 Storyboard/播放器采样。图像、输出在 `out/progress-native/`，指标在 `references/progress-metrics.json`。

浏览器在相同 1000×500 DIP、125% DPR、主题和数值下对照两个后端：每后端 58 个裁剪区域，共 116 个，包含确定值/暂停/错误、ring 的冻结周期点，以及 bar 双段运动的六个时间点和不确定暂停/错误终态。非循环原生动画的进度 1 结束帧与循环重置帧不同，因此该终帧未纳入循环截图对照。结果见 `references/validation/progress-Canvas2D.json`、`progress-WebGL2.json`。

Rust 回归覆盖范围钳制和原子失败、只读命中、显示列表平衡、动画时长/几何、值中断、颜色反转、优先级、隐藏/停用/卸载和减少动画。浏览器验证实际选项点击、React 属性变化、源码面板、主题、ARIA、停止调度和销毁。

这些是固定源码和匹配 SDK 的独立探针对照，不能代替 Store Gallery 窗口的逐帧呈现验收；暂停/恢复中间帧、非正方形/复杂变换和自定义 padding 的完整原生像素验收仍待补充。自定义 AnimatedVisualSource、完整 UIA 提供程序未实现。

Gallery 已提供四个官方示例及 ToggleSwitch 第二例的真实 ProgressRing。官方确定进度示例依赖 NumberBox；阶段 7 Popup 尚未完成，当前使用宿主数值编辑器驱动相同 SDK 属性，尚未宣称整个示例布局等价。AutoSuggestBox / NumberBox 继续按既定依赖顺序延期。

6.6 修复细条的离屏缩放和移动段裁剪端点。ProgressBar 直接绘制圆端点，ProgressRing 保留矢量超采样；新增 24 组独立面积积分检查覆盖默认/加高尺寸和入场裁剪、四种 DPR、两种后端，见 [本批记录](five-controls.md)。
