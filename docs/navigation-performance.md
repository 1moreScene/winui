# NavigationView 性能回归（2026-11-09）

本轮修复保留 Rust 中的真实 NavigationView 模板节点、Frame/Page、材质及动画。Gallery 仍通过公共 SDK 创建八个示例和 API in action。

性能记录见 [机器结果](../references/validation/navigation-performance.json)，原始采样保存在 `out/navigation-performance/`。固定 WinUI/Gallery 基准继续沿用 [导航实现说明](navigation-frame.md)。

## 修复

- WASM 按节点缓存完整属性，直接比较 Rust 属性值，只传输发生变化的属性。比较覆盖内部模板和编辑器的属性写入，不依赖公共 update 调用或布局版本。JS 宿主补回已缓存属性，公开快照仍完整且与调用方隔离。
- NavigationView 和 Frame 的订阅先选择本控件状态，再复制给调用方。订阅导航不再复制其他模板、页面资源或整棵 Scene；Scene 的完整诊断快照接口仍可使用。
- 指针悬停、选中指示条、材质和滚动条透明度动画更新画刷或采样时间，不重新测量页面。展开/折叠、层级动画、实际滚动偏移和尺寸变化继续更新布局。
- 模板部件的创建复用各控件默认值相对公共 schema 的差异，保留属性合并、强制转换和校验流程。逐一比较 116 种控件的新旧创建结果和非法属性错误。
- 普通节点不再为祖先可见性/可用性判断反复分配默认 ViewProperties。
- 宿主跳过没有变化的导航投影矩形和子节点顺序；React 重复提交相同主题/系统策略不再触发布局。
- Gallery 源码文本立即存在；折叠或屏外的源码面板在可见后才加载格式化器、格式化并创建高亮节点。
- Frame 投影避免重复写入 hidden/inert；转场的位移、透明度变化只更新已发现滚动条的几何，不再每帧重扫整份文档。显示状态变化和新增页面仍触发滚动宿主发现。
- 固定尺寸的屏外画布合并连续尺寸变化，进入视口、显式 render/快照读取或普通属性/输入更新时由真实 Rust 场景刷新；需要自然高度/宽度的宿主继续及时测量。导航展开/收起不再带着八个屏外示例逐帧重绘。
- NavigationView 根模板的排列不再重复处理随后由行 presenter 排列的整套 item 模板部件。
- 无交互的模板网格及默认图标/标签由 Rust 绘制；无障碍 DOM 只保留公共控件、浮层、内容宿主及必要的祖先裁剪。完整 Rust 诊断树不减少，自定义 item 内容中的真实交互控件仍保留。
- Gallery 直接投影 Rust 输出的内容矩形，避免为了每个 pane 宽度样本重新协调所有缓存业务页。全局滚动条在尺寸变化时更新已知宿主，并在候选首次溢出时发现新滚动条。
- 按固定版 SplitView 模板的离散列宽与 ContentTransform 规则，Inline 内容宽度在状态改变时一次更新，动画采样只移动内容位置。Gallery 用 Rust 矩形投影固定宽度和平移，避免整页随每个动画样本反复 reflow；Canvas 内的真实 Frame/Page 使用同一宽度语义。
- Overlay 的 Acrylic 按 SplitView PaneRoot 固定在 OpenPaneLength，随面板动画改变裁剪范围。背景采样和材质缓存不再因每个宽度样本失效；移动阴影在背景采样后绘制，避免阴影反馈进入模糊输入。背景实际变化时仍重新采样，保留动态材质。

## 复测方法

```powershell
cargo build --locked --release --target wasm32-unknown-unknown --target-dir target/navigation-production --jobs 2
$env:NAVIGATION_COMPOSITION_TARGET='target/navigation-production'
node tools/prepare-navigation-composition-validation.mjs --reuse-build --production
# 在 5413 启动 out/navigation-composition-preview 的 Vite preview
$env:NAVIGATION_PERF_URL='http://127.0.0.1:5413'
$env:NAVIGATION_PROFILE='0'
node tools/benchmark-navigation.mjs production
node tools/benchmark-navigation-pane.mjs pane-after
```

脚本使用 Chrome、1440×960、DPR 1.25 和默认 Canvas2D，依次采样指针移动、展开所有分组、20 次实际滚轮输入、进入 Button/NavigationView 页面，以及真实点击主导航。记录 WASM、完整宿主 draw、状态量、复制、长任务、冷启动和页面可见后两个 rAF 的时刻。页面进入时间包含业务页面创建，不等同于单次 Rust Frame 导航耗时。

`NAVIGATION_PROFILE=1` 可另存 CPU profile。最初的故障轨迹启用了 Profiler，后续正式发布构建的耗时采样关闭 Profiler；两类结果分别保留，不把不同采样条件下的耗时差直接当作代码加速比。

面板专项脚本另外采样主导航、NavigationView 示例页及复杂背景上的真实 Frame/Page Overlay。记录整个点击窗口和从首个快照到终态的动画帧间隔；整个 750 ms 窗口包含静止帧，须结合动画区间、移动宽度样本数及 WASM 耗时判断。

性能受机器负载、缓存和浏览器影响。结构回归检查覆盖没有整树复制、没有悬停测量、默认值一致、缓存属性更新可见及动画/材质真实绘制；帧耗时单独记录，不用静态几何一致代替性能验收。

## 本机面板专项结果

正式 release（opt-level 3、LTO、单 codegen unit），Chrome、1440×960、DPR 1.25、Canvas2D，关闭 Profiler。主导航基线为内容宽度修复前的采样；Acrylic 基线为固定材质表面修复前的采样，两组均保留原始 JSON。

| 场景 | 修复前 | 修复后 |
| --- | ---: | ---: |
| NavigationView 页面主导航展开，动画区间帧间隔 P95 | 149.8 ms | 33.3 ms |
| NavigationView 页面主导航收起，动画区间帧间隔 P95 | 49.9 ms | 33.3 ms |
| 复杂背景 Overlay 展开，WASM 单帧中位数 | 53.1 ms | 6.1 ms |
| 复杂背景 Overlay 展开，动画区间帧间隔 P95 | 66.6 ms | 16.8 ms |
| 复杂背景 Overlay 展开，宽度采样数 | 8 | 22 |

这次采样的主导航仍有约 33 ms 的较慢帧，未将结果表述为所有场景恒定 60 FPS。当时主导航还错误地复用了 Overlay 的 350/120 ms 轨道，后续修正见下文；实际 Acrylic 背景采样及真实 Frame/Page 均保留。

上述性能样本构建通过 495 项 Rust 测试、39 项浏览器测试、30 组原生几何矩阵（363 项边界比较，最大误差约 0.724 物理像素）和 22 组公共 API/交互验证。TypeScript strict、SDK 声明、来源边界、枚举检查与 Gallery 生产构建通过。该历史样本的 WASM SHA-256 为 `b45273ab5f58ed6f8b3b48cea38f2d6dfda7454287102e811e7cd54a0f07ea17`。

## 顶部主导航按钮的时序修正

主导航在 Expanded 模式下实际使用左侧 CompactInline。此前错误复用 Overlay 的 120 ms 收起轨道及 `(0.1,0.9,0.2,1)` 曲线，16 ms 时已从 320 DIP 收到约 136 DIP；若首帧稍晚，视觉上接近瞬间关闭。

现在从固定版 `SplitView_themeresources.xaml` 直接提取每个实际状态转换的 `PaneClipRectangleTransform.TranslateX` 轨道。左侧 CompactInline 的 `ClosedCompactLeft → OpenInlineLeft` 和 `OpenInlineLeft → ClosedCompactLeft` 均为 **200 ms**，曲线为 `(0,0.35,0.15,1)`；CompactOverlay/Overlay 继续使用其自身的 350/120 ms 轨道。不能把 `OpenInlineLeft → Closed` 的 100 ms 轨道当成 CompactInline 关闭轨道。

回归直接点击首页与 NavigationView 页顶部的实际 hamburger 按钮，检查多个时刻的真实 Frame 位置、完整收起和再次点击反向。详细构建指纹、源码轨道与结果见 [顶部按钮验证记录](../references/validation/navigation-top-toggle.json)。

## 分数 DPI 下的动画重置

实际浏览器的视口为 1528×698、DPR 1.25，导航可用高度是 650 DIP，排列到物理像素后高度为 650.4 DIP。此前 Measure 把未取整的约束写入导航实际尺寸并调用自适应，随后 Arrange 又写回取整后的尺寸，导致每帧都重置 pane 动画，导航和内容直接跳到终点。此前 1440×1100 的测试没有覆盖这一尺寸条件。

Measure 现在只预测内容约束，不修改实际尺寸、自适应状态或时间线；实际大小改变只由 Arrange 处理。嵌套布局最终宽度与测量预测不同时，按最终宽度重新测量内容，保持文字约束一致。新增回归覆盖实际视口、相邻宽高、分数 DPR、嵌套 Grid 以及真正的窗口缩放。验收还要求实际浏览器记录中同时出现导航宽度和 Frame 位置的中间值，见 [分数 DPI 验证记录](../references/validation/navigation-fractional-pane.json)。

实现中没有按特定分辨率或缩放比例判断的分支。另用固定随机种子生成 32 组任意小数宽高及 0.75–4 之间的 DPR，覆盖三种左侧模式和嵌套布局；在四个动画时刻各强制重复布局三次，验证 384 次布局均不修改动画起点、终点、开始时间、时长、曲线和当前视觉采样。具体几何值仅用于可复现的测试，通用规则是“测量不能重置已开始的时间线”。
