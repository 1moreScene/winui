# ItemsRepeater、StackLayout、UniformGridLayout、RefreshContainer、RefreshVisualizer

后续已将 Gallery 页面改为固定仓库的 7+2 个真实用例，并补齐所需 Rust 布局依赖；当前用例对应及新增验收见 [Gallery 对齐记录](repeater-gallery-alignment.md)。下文早期测试数量与独立指示器示例属于首批切片历史记录。

本批避开用户指定的 MenuBar、MenuBarItem、CommandBarFlyout、RelativePanel、WrapPanel、SplitView、SemanticZoom、ParallaxView、XamlUICommand、StandardUICommand，以及目录中正在接入的日期/时间/颜色控件。

## 实现边界

Rust 的 `src/scene/repeater.rs` 持有数据元信息、稳定 ID、实例化/回收、尺寸缓存、可见区域和布局；`StackLayout`、`UniformGridLayout` 是原生意义上的布局对象，不伪装成 UIElement。它们可在多个 ItemsRepeater 间共享描述，各实例的测量状态仍保存在各自 Rust 节点中。Repeater 不维护 ListView 的选择模型、不绘制选择装饰或滚动条，使用父 ScrollViewer 的视口与偏移。

StackLayout 支持横/纵方向、间距、异高/异宽模板、测量估算与关闭虚拟化。UniformGridLayout 支持两种方向、第一项自然尺寸或明确单元尺寸、行列间距、最大行列数、None/Fill/Uniform 拉伸、六种逐行对齐及 RTL 镜像。按照原实现将可用尺寸归一到 float 后进行整数余量分配，防止分数 DPR 下 179.999… DIP 被误截断。

Rust 的 `src/scene/refresh.rs` 持有 Idle、Peeking、Interacting、Pending、Refreshing 状态、触摸边缘资格、四种拉动方向、严格大于 0.8 的触发阈值、取消和完成令牌。重复刷新请求合并，旧完成令牌被拒绝。RefreshContainer 自动创建并拥有 RefreshVisualizer；默认图标使用 SDK 的原生 Symbol.Refresh 映射，支持自定义 SDK 子内容。旋转、Pending 缩放和内容变换由 Rust 生成。减少动画策略保留刷新生命周期并停止持续旋转。

TS 只保留业务对象、模板回调、事件订阅、deferral 计数与平台输入转发，不计算可见范围、单元位置或刷新状态。React `renderItem` 在 Rust 已实例化的槽位中使用普通 SDK 控件。帧快照仅传输实例化元数据，不重复序列化十万条业务源。超出 Scene 节点预算通过 `snapshot.repeater.realizationError` 报告。

## 简单调用

```ts
const host = scene.root.scrollViewer({width: 480, height: 250});
const repeater = host.itemsRepeater({items: data}); // 默认 StackLayout
repeater.setItemTemplate((item, slot) => {
  slot.text({text: typeof item === 'string' ? item : item.text ?? item.id});
});
repeater.update({layout: new UniformGridLayout({minItemWidth: 96, minItemHeight: 64})});
const first = repeater.tryGetElement(0); // 未实例化时返回 null
const stop = repeater.onRealizedChanged(slots => console.log(slots.length));
stop();
host.dispose(); // 自动释放 repeater、实例化项及模板后代
```

```tsx
<ScrollViewer width={480} height={250}>
  <ItemsRepeater items={data} layout={new StackLayout({spacing: 8})}
    renderItem={item => <TextBlock text={item.text} />} />
</ScrollViewer>

<RefreshContainer onRefresh={async () => { await reload(); }}>
  <ScrollViewer><ItemsRepeater items={data} /></ScrollViewer>
</RefreshContainer>
```

高级异步方式：`onRefreshRequested(e => { const d = e.getDeferral(); work().finally(() => d.complete()); })`。必须在回调返回前取得 deferral，每个 deferral 的 `complete()` 幂等。所有 deferral 完成后，由 SDK 把对应完成令牌交回 Rust。无 deferral 时自动完成，和原生事件契约一致；控件或 Scene 销毁后，不再投递完成回调。RefreshContainer 的刷新事件投递到容器，所属 visualizer 作为借用的呈现对象供读取/配置；独立 RefreshVisualizer 投递自己的事件。

Rust 调用方可使用 `Scene::items_repeater(parent, items, RepeaterLayout::StackLayout(StackLayout::default()))`、`Scene::refresh_container(parent, RefreshPullDirection::TopToBottom)`、`Scene::refresh_visualizer(parent, RefreshVisualizerOrientation::Auto)`、`request_refresh` 与 `complete_refresh`，无需自行构造控件模板。

## 固定来源与验证

- 同项目基准 WinUI commit `7b12709347527238494ca28cb9fed326d513e779`；48 个源文件的 Git blob / SHA-256 在 `references/repeater-refresh-sources.json`，重取命令 `python tools/fetch-repeater-refresh.py`。
- `tools/extract-repeater-refresh.py` 重现模板常量，并从固定 Gallery commit `7360ac322414e118eadfb0c7c2f4ecc31a218f59` 提取 13 份示例来源。构建流程自动执行该提取器。
- `tools/native-repeater-refresh` 使用已解析的 `Microsoft.WindowsAppSDK/2.5.4-experimental`，WinUI 为 `2.3.10-experimental`。42 个浅/深色状态、布局矩形、刷新 deferral 完成记录在 `references/repeater-refresh-native.json`；构建源码和 DLL 指纹在 `references/repeater-refresh-native-run.json`。
- 浏览器测试覆盖普通 SDK、React Gallery、两后端实例化、十万条数据、模板回收、异步完成、触摸短拉取消，以及同 SDK Grid 几何。封闭参数的具名枚举及错误字符串类型用例在 `gallery/tests/repeater-refresh-types.tsx`。
- 为避免其他会话改动影响验收，`tools/prepare-repeater-refresh-validation.py` 冻结完整源码与引用，不删除或排除别的控件；实际通过数量、二进制指纹和剩余验证见 `references/repeater-refresh-status.json`。

本次冻结版本通过 294 项 Rust 测试（含本批 9 项）、Chromium Canvas2D/WebGL2 共 10 项交互测试，以及生产构建 Chromium/WebKit 共 10 项页面/交互测试。浅/深色共 24 个 Grid 状态在每个后端的最大几何差为 0.800002 DIP。类型检查、Vite 生产构建和声明生成通过。

共享目录的最终二进制包含其他会话在冻结之后的变更，其指纹与冻结二进制不同；已额外对当前二进制独立复跑同一组 10 项 Canvas2D/WebGL2 测试，全部通过。生产 Chromium/WebKit 截图与 294 项 Rust 结果对应冻结版本，不推导为其他会话后续逻辑的完整验收。

Gallery 路由：`#items-repeater`、`#stack-layout`、`#uniform-grid-layout`、`#pull-to-refresh` / `#refresh-container`、`#refresh-visualizer`。附属布局/visualizer 路由复用官方所属页面的元数据，不虚增官方目录项目。默认保持 Canvas2D，WebGL2 为显式选项。

## 尚未接受的原生能力

这是可用的 Rust 控件切片，不表示完整 WinUI 运行时或像素完全一致。尚未移植任意自定义 VirtualizingLayout / IElementFactory、GetOrCreateElement 强制实例化与 pin 接口、原生 RecyclePool 对象复用、ItemsSourceView 的全部增量通知、复杂变换链中的视口相交、未知项尺寸下的精确滚动锚定、原生 XYFocus/UIA 的完整语义及全部 ItemCollectionTransitionProvider。

异高模板的未测量项使用估算尺寸，滚动范围会在真实测量后收敛。当前回收销毁模板后代并按需创建新槽位，不承诺保留项内未外置的业务状态。业务数据需提供稳定 ID；需要保留的状态应放在业务对象中。

触摸拉动采用浏览器输入适配和 Rust 边缘判断，尚不等同于 Windows DirectManipulation / InteractionTracker 的惯性和阻尼。方向和阈值已实现，释放回弹、Pending 的原生 Composition 缓动、Store 发行版逐帧时序、屏幕阅读器完整通知仍待对照。独立同 SDK RenderTargetBitmap 不捕获 Composition 旋转，不能用其刷新图像宣布动画等价。

```powershell
pwsh -NoProfile -File tools/run-repeater-refresh-probe.ps1
cargo test --locked --test repeater_refresh
cd gallery
npm run build
npx playwright test -c playwright.repeater-refresh.config.ts
```
