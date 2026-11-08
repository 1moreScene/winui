# 滚动与模板基础控件批

2026-11-09：本批接入 **ScrollBar、Thumb、TickBar、ScrollContentPresenter、ItemsPresenter**。避开其他会话的 ItemsView、AnnotatedScrollBar、PagerControl、LayoutPanel、RichTextBlock 及其后续项，也没有修改菜单项控件的专属实现。

## Rust 与调用方的职责

Rust Scene 负责节点、属性校验、范围强制转换、模板槽位、测量排列、裁剪、命中、捕获、键盘、重复计时、拖动坐标、主题资源和绘制。TS SDK 只负责类型化引用、宿主输入和事件投影；React 使用同一 SDK，公共属性平铺。Canvas2D 为默认后端，WebGL2 需要显式选择。

| 控件 | 本批行为 |
| --- | --- |
| ScrollBar | 水平/垂直、范围与 viewport、方向反转和水平 RTL、箭头/轨道步进、250 ms 延迟与 50 ms 重复、拖动、Home/End/Page/方向键、ScrollEventType；可通过 `scrollTarget` 直接关联 Rust 滚动宿主。 |
| Thumb | DragStarted/DragDelta/DragCompleted、IsDragging、CancelDrag、Escape/失焦/取消/禁用收尾；增量使用按下时冻结的局部坐标，业务对象移动不会改变后续增量。 |
| TickBar | 通过类型化 Slider 引用读取范围、方向和 tickFrequency；零频率不显示，密集刻度按源码 20 DIP 最小间隔降采样，保留半 Thumb 偏移与一个物理像素厚度。 |
| ScrollContentPresenter | 单内容根，复用 Rust ScrollViewer 的 extent、viewport、offset、ChangeView、滚轮、缩放、裁剪与输入；默认不显示内置滚动条，可组合独立 ScrollBar。 |
| ItemsPresenter | Rust 创建并维护 header/items/footer 三个稳定槽位；单个 items panel、字符串或 SDK 子树标题/页脚、水平/垂直布局、更新与回收约束。 |

Thumb 的原生默认模板没有可见内容，SDK 默认也透明；示例显式设置背景。它发送拖动增量，业务回调决定移动哪个对象，这是 Thumb 的调用契约。有效默认样式中 ScrollBar 的 IsTabStop 为 false；需要独立键盘操作时显式设为 true。Thumb 默认保留 Tab 聚焦。所有示例保留实际焦点且不绘制黑色焦点框。

## 公共调用

```tsx
<ScrollBar minimum={0} maximum={100} value={25} viewportSize={25}
  indicatorMode={ScrollingIndicatorMode.MouseIndicator} isTabStop
  onScroll={e => saveOffset(e.scroll.newValue)} />

<Thumb width={100} height={48} background="#0078D4"
  onDragDelta={e => moveBusinessObject(e.horizontalChange, e.verticalChange)} />

<TickBar source={slider} width={320} height={4} />
<Slider onReady={setSlider} width={320} tickFrequency={20} />

<ScrollContentPresenter height={220} onReady={setPresenter}>
  <ItemsPresenter header="Items" footer={<Button text="Load more" onClick={load} />}>
    <StackPanel>{/* SDK item content */}</StackPanel>
  </ItemsPresenter>
</ScrollContentPresenter>
<ScrollBar scrollTarget={presenter} height={220} />
```

```ts
const content = scene.root.scrollContentPresenter({ width: 300, height: 200 });
content.stackPanel().button({ text: 'Item' });
const bar = scene.root.scrollBar({ height: 200, scrollTarget: content });
const unsubscribe = bar.onScroll(e => saveOffset(e.scroll.newValue));
content.changeView({ verticalOffset: 80, disableAnimation: true });
bar.scrollToEnd();
unsubscribe();
bar.dispose();
content.dispose();

const presenter = scene.root.itemsPresenter({ header: 'Header', footer: 'Footer' });
presenter.stackPanel().button({ text: 'Item' });
presenter.update({ header: '' });
// Rich content uses presenter.headerContent / presenter.footerContent.
```

`scrollTarget` 和 `source` 必须是同一 Scene 的存活 SDK 控件引用；销毁目标会解除关联。非法引用、单内容约束、受管理槽位重挂载以及字符串与自定义内容冲突在 Rust 提交前校验。生命周期及事件解绑沿用公共 SDK。

5 个演示入口：`#scroll-bar`、`#thumb`、`#tick-bar`、`#scroll-content-presenter`、`#items-presenter`。固定 Gallery 没有这些模板基础控件的独立页，因此作为 SDK 示例关联 ScrollViewer、Slider、ListView 分类，没有伪造官方 Gallery 用例。

## 来源与验证

- 固定 WinUI commit 为 `7b12709347527238494ca28cb9fed326d513e779`；14 个 C++/头文件/XAML 来源和 SHA-256 见 `references/scroll-primitives-sources.json`，保留原始版权声明。ScrollBar 主题模板、TickBar_Partial.cpp、Thumb_Partial.cpp、ItemsPresenter.cpp 和 ScrollContentPresenter_Partial.cpp 为行为依据。
- `tools/extract-scroll-primitives.py` 提取模板尺寸与主题别名，并从实际解析的 WinUI `2.3.10-experimental` generic.xaml 解析画刷；`references/scroll-primitives-template.json` 保存 SDK 文件指纹。探针解析的包版本、程序与 XAML DLL 指纹/签名见 `references/scroll-primitives-probe.json`。原始默认值见 `references/scroll-primitives-defaults.json`；其中未应用样式的 ScrollBar IsTabStop=true，与默认样式覆盖值区分记录。
- 同 SDK 独立原生探针捕获浅色/深色、125% DPI 共 **48 个静态状态**。24 个 ScrollBar 的 Thumb 布局矩形与 Rust 比较，最大误差约 **0.0000031 DIP**；12 个 TickBar 状态使用原生测得的边界和 Thumb 尺寸验证刻度算法，最大误差约 **0.0000062 DIP**。这些数字不代表绘制像素误差；另外 12 个 Thumb/ItemsPresenter/ScrollContentPresenter 状态保留作参考，未计入这 36 个算法/几何比较状态。
- 本批 **11 项 Rust 集成测试**覆盖拖动原坐标、取消、重复暂停/恢复、范围边界、引用与更新原子性、槽位所有权和三主题资源。冻结快照全 Rust 回归 **399 项通过**。
- Chrome 125% DPR：开发快照 **12 项**、生产包 **10 项**浏览器检查通过；覆盖 5 页实际源码、真实指针/键盘/滚轮、事件与销毁、Canvas2D/WebGL2、三主题、RTL。生产包和截图使用同一个测试 WASM SHA-256。严格 TS 检查、枚举负例及 SDK 声明生成通过。
- 可运行的固定生产包为 `out/scroll-primitives-production`，预览端口 **5221**。完整 Rust/前端快照为 `out/scroll-primitives-snapshot`，避免共享工作区其他会话的热更新影响验收。其他会话已更新共享 WASM 与部分入口，当前共享二进制不等于本批测试二进制；以上测试数只对应冻结快照与固定生产包。状态文件逐项记录差异：`references/scroll-primitives-status.json`。

常规复现：

```powershell
python tools/fetch-scroll-primitives.py
python tools/extract-scroll-primitives.py
pwsh tools/run-scroll-primitives-probe.ps1
cargo test --test scroll_primitives -- --nocapture
node tools/build-wasm.mjs
cd gallery
npm run typecheck
npm run dev -- --port 5220 --strictPort
# Another terminal in gallery:
npx playwright test -c playwright.scroll-primitives.config.ts
```

## 尚未验收的范围

本批不是完整 XAML 控件对象模型或逐像素等价验收。TickBar 通过显式 source 和常规布局组合，尚未投影 Slider 原生 TickPlacement 的自动模板插槽；每个 TickBar 最多输出 16,384 个可绘制刻度。ItemsPresenter 的方向由显式属性给定，尚未完整接入 ItemsControl generator、虚拟化 presenter 生命周期、原生 snap points 与 sticky footer。ScrollContentPresenter 是可独立组合的 SDK 宿主，完整 DirectManipulation 惯性与系统输入窗体处理仍沿用共享滚动模块的未完成项。

ScrollBar 指示器收缩、禁用态淡出及完整 VSM 时序、完整 UIA、字体栅格化、Acrylic/Composition 动画和 Store Gallery 发行窗口的逐帧/像素对照尚未完成。当前探针的 RenderTargetBitmap 静态图与布局矩形不替代这些验收。
