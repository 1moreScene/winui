# 应用内全局滚动条与编辑器内联按钮

日期：2026-11-07。用户确认的范围是 **SDK 应用内全局接管**。本批没有修改操作系统设置，也没有向其他进程注入代码。

## 默认接入与宿主边界

`await WinUI.create()` 默认给当前文档安装全局滚动条；React 的 `WinUIProvider` 复用同一入口。正文、侧栏、源码面板、原生 HTML 的 `overflow: auto/scroll` 容器以及可访问的开放 Shadow DOM 自动接入。动态增删、内容/尺寸变化、程序滚动、窗口缩放、主题切换、祖先裁剪与 CSS 位移动画同步更新。外部 DOM 遮挡以两轴探测收集矩形，Rust 计算剩余可见区域，同时用于绘制和宿主命中投影，避免被上层内容覆盖的滚动条穿出；任意复杂重叠的像素级等价尚未验收。SDK 自己的 Scene/NavigationView 投影不会被再次接管。

Rust 的 `Scene::set_scroll_host(HostScrollMetrics)` 接收视口、内容范围及偏移；同一个 ScrollViewer 执行范围钳制、滑块几何、命中、拖动、键盘、轨道/箭头重复、延迟扩缩和隐藏动画。宿主拥有实际内容；Rust 不需要为 DOM 内容制造一个假布局树，也不会将业务内容搬入 SDK 场景。

TS 适配仅负责发现 DOM 区域、观测尺寸/滚动及把 Rust 请求写回 `scrollTo`。滚轮、触摸惯性、选区自动滚动和焦点进入视口继续使用浏览器本来的行为。外部程序滚动会中断正在进行的 Rust 滚动请求；写回自身产生的 scroll 回声不会截断动画。RTL 和反向列布局的负偏移在适配边界归一化。

浏览器标准 `scrollbar-width: none` 隐藏原生外观而保留滚动能力，接管后有 Rust 绘制的滚动条及可聚焦、可用键盘操作的 ARIA scrollbar。依据：[CSS Scrollbars Level 1](https://www.w3.org/TR/css-scrollbars-1/)。

```ts
const sdk = await WinUI.create(); // 默认全局接入

// 只在指定子树接入：
const local = await WinUI.create({ globalScrollbars: false });
const bars = local.installGlobalScrollbars(container);
bars.refresh(); // 宿主有不产生 DOM/Resize 事件的外部布局变化时可主动刷新
console.log(bars.diagnostics);
bars.dispose(); // 恢复这份租约负责的原生外观
local.dispose();
```

临时保留原生外观可给容器/子树设置 `data-winui-scrollbars="native"`。同一文档的多个 runtime/租约共享一张 Canvas2D 和一套 Rust 场景。释放最后租约会移除样式、观测器、事件、临时 ID 与绘制资源；不会重排业务节点或清空内容。

开放 Shadow Root 创建使用文档级、可恢复的 attachShadow 包装，以发现已存在宿主后来创建的根；已有开放根同样扫描。最后租约释放时，仅在包装仍是 SDK 安装的版本时恢复原函数，保留调用方后续覆盖。根被移除时清理其观测器与样式。常态由事件/ResizeObserver/MutationObserver 驱动，没有扫描轮询或空闲 RAF；宿主几何动画期间及 Rust 动画期间按帧推进。

Rust 宿主 API 是平台中立的；其他自有平台适配器可传入同样的测量并将 ViewChanged 请求应用于内容。本仓库实际运行的全局自动发现适配器是浏览器 DOM，尚未实现 Win32 HWND/其他原生工具包的自动遍历和非客户区替换。

## 材质与访问限制

DOM 内容没有出现在 Rust 场景的 backdrop 中，Canvas 无法直接采样任意网页像素，因此 **应用外部 DOM 滚动条轨道使用原生资源的 fallback 色**。没有把透明 Canvas 采样结果称为 Acrylic。SDK 自己场景内部的 ScrollViewer 仍保留已有 Acrylic 与减少透明度路径。诊断明确报告 `material: "fallback"`。

跨源 iframe、关闭的 Shadow Root、浏览器内部 select 弹出等 UA 表面不受当前适配器控制；应在有权初始化的独立文档中安装 SDK。旋转/斜切/非矩形 clip-path 容器、顶层 dialog/popover 内部及超出当前安全范围的超大表面保留原生外观，并在 skipped 统计中体现。全局管理上限为 1500 个容器，超过部分保留原生外观。

Shadow 内滚动与可视/键盘投影已验证，但文档外部 ARIA id 引用不能跨入 Shadow 根；该关系与完整读屏器验收仍有差距，不能据此宣布跨 Shadow UIA 等价。规则依据：[ARIA 元素引用作用域](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Reflected_attributes)。

## 内联按钮遮罩与多行底条

之前错误地把 30 DIP 模板初始宽度作为固定命中宽度，并将悬停背景填满按钮。固定 C++ 的 `TextBox::OnDeleteButtonSizeChanged` 与 `PasswordBox::OnRevealButtonSizeChanged` 实际将宽度设为正文高度，形成正方形。模板内部 `ButtonLayoutGrid` 再应用 `0,4,4,4` 留白和 1 DIP 透明边框；绘制只填充内部背景，圆角为输入框圆角减去边框厚度。32 DIP 正文对应 32×32 命中区、26×22 背景填充；80 DIP 正文对应 80×80 命中区、74×70 背景填充。图标仍为 12 DIP，按原生部件中心及基线定位。

`EditorSnapshot.helperButton/helperMask` 将 Rust 的几何投影给宿主，不再在 TS 重算一套尺寸。独立原生探针覆盖 Light/Dark、32/80 DIP 和 Normal/PointerOver/Pressed 共 24 组，区域比较见 `references/validation/editor-helper-comparison.json`；这是匹配 SDK 的强制状态矩阵，不能代替 Store 发行版逐帧等价。

多行底条问题在 DPR 1.25 复现：渐变硬切边缘与分数物理像素覆盖组合，使多行高度变化后的实际覆盖降到约 1.28 DIP。现在聚焦底边按非对称边框独立绘制，使用原资源强调色、原圆角裁剪与 `round(2 × DPR)` 物理像素厚度，避免重复偏移相同的渐变边界；正常与非聚焦渐变仍按模板执行。1/2/3/5/10/25 行、DPR 1/1.25/1.5/2 的实际合成截图与数值验证见 `references/validation/multiline-accent.json`。

## 可复查验证

- `tools/run-native-probe.ps1 -Kind TextScroll`：原生模板部件、截图和 `references/text-helper-metrics.json`。
- `tests/text_scroll.rs`：宿主范围、拒绝混合内容/非法指标、只命中滚动条、不拦截正文、按钮几何和底边像素取整。
- `gallery/tests/global-scrollbars.spec.ts`：真实正文/侧栏/源码、拖动/键盘/程序滚动中断、原生触摸与触摸滑块、RTL、Shadow、动态增删、裁剪、位移、空闲和租约恢复。
- `gallery/tests/editor-chrome.spec.ts`：24 组原生按钮区域比较、多行底条与分数 DPR。
- `references/validation/global-scrollbars.json`、`editor-helper-comparison.json`、`multiline-accent.json` 和 `out/global-scrollbars/`、`out/editor-chrome/` 保存证据。完整回归与构建结果见 `references/validation/results.json`。
