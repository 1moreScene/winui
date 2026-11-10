# NavigationView 展开、材质和页面动画

2026-11-08，延续固定 WinUI `7b12709347527238494ca28cb9fed326d513e779` / Windows App SDK `2.5.4-experimental` / WinUI `2.3.10-experimental`。本批直接运行同 SDK 原生窗口，采集真实层级变化、五组 Frame 页面转场和浅色/深色面板材质。探针与 Store 发行版分别记录，不能替代发行版 Composition 的完整验收。

## 层级展开/折叠

原实现 `NavigationViewItem::ShowHideChildren` 立即改变 ItemsRepeater.Visibility。已有项的位移来自 `NavigationView::CreateAndAttachHeaderAnimation`：Offset，200 ms，曲线 `(0, 0.35, 0.15, 1)`。没有给子菜单人为加入 Height 动画或延迟隐藏子项。

原先 SDK 只改变布局并替换箭头字符，现在：

- Rust 提交最终布局后，对已有项的相对父项 Offset 播放原生时间线。嵌套项继承祖先位移，自己的重排不会重新启动祖先时间线。
- 快速反向从当前视觉位置继续；滚动使用独立坐标，不重启展开动画；点击命中、DOM 焦点投影和指示条跟随当前视觉位置，菜单裁剪继续生效。
- 箭头改用模板中真实的 `AnimatedChevronUpDownSmallVisualSource`，不再用右/下字符替换。Normal / PointerOver / Pressed 与 On / Off 状态使用同一个已有 Rust AnimatedIcon marker player。独立箭头按钮的 PointerPressed 由原生 presenter 处理，因此保持父项 PointerOver 状态。箭头区域按模板 40 DIP，图标区域 12 DIP。
- 程序调用 `setExpanded`、鼠标、键盘、层级嵌套及首页侧栏复用同一个实现。减少动画立即到终点；移除或隐藏 chevron 时清理播放器；移除节点不留下位移轨道。
- `NavigationSnapshot.hierarchyVisuals` 暴露最终布局位置、视觉位移与 chevron marker 状态，用于诊断和确定性重放。

源码参数由 `tools/extract-navigation-motion.mjs` 提取到 `references/navigation-motion-contract.json`，WASM 构建会重新提取并校验；Rust 直接读取该契约。

## 材质

原生窗口读取到的实际 `SplitView.PaneBackground`：

| 模式 | 浅色 | 深色 |
|---|---|---|
| 展开 | SolidColor，alpha 0，RGB F3F3F3 | SolidColor，alpha 0，RGB 202020 |
| 覆盖 | tint FCFCFC，opacity 0，luminosity .85，fallback F9F9F9 | tint 2C2C2C，opacity .15，luminosity .96，fallback 2C2C2C |

共享场景现在保留展开/顶部面板的透明资源，让应用背景透出，移除了覆盖应用背景的额外灰底。独立 NavigationView surface 仍提供自身的应用背景层。覆盖面板按 NavigationViewDefaultPaneBackground 资源别名解析。

同一 Acrylic recipe 的参数更新现在复用已有 Rust `AcrylicTransition`：500 ms 效果颜色过渡，中断从当前颜色采样。主题切换使用新的主题 brush，重置该颜色轨道。背景采样能力恢复使用原生 167 ms 材质渐入；能力丢失立即采用 fallback，不采样外部 DOM。`NavigationSnapshot.paneMaterial` 公开实际 recipe、有效效果颜色和混合权重。

共享场景现在通过同一策略入口继承主题和减少透明度。此前深色场景中的 NavigationView 会先创建浅色 brush，再缓慢过渡到深色 fallback；首次挂载现在直接采用最终主题资源，后续策略变更才启动对应过渡。

生产浏览器检查实际像素：Canvas2D / WebGL2 的展开透明面板都保留了应用背景 RGB `(66, 103, 134)`。覆盖 Acrylic 配方逐项对比原生窗口读取值，颜色、fallback、TintOpacity 与 TintLuminosityOpacity 均纳入验证。

## 页面快速切换

原生 Frame 的活窗口采样显示，在前一个转场结束前发起新导航：尚未完成离场的更早页面继续显示到自己的离场结束；中间页面的新离场不透明度从原生关键帧 1 开始。Slide 离场有从 0 开始的平移关键帧，Entrance 正向离场只修改不透明度，保留其当前纵向位置。

此前实现立刻移除更早页面，并把中间页面仍为 0 的入场 opacity 带到新离场，导致过早空白。现在保留独立旧离场轨道，按原生关键帧处理新离场；未缓存页面在 150 ms 离场阶段结束后释放，不再等待整个 450 ms 转场结束。

## 证据与复查

- 原生完整采样：`references/navigation-motion-native.json`；原始 PNG 在 `out/navigation-motion-native-final/`。包括 Light/Dark expand/collapse/reverse、展开/覆盖/fallback 材质、Entrance、双向 Slide、EntranceBack 和 80 ms 间隔的 RapidEntrance。
- 原生探针：`tools/native-navigation/NavigationMotionProbe.cs`；固定项目与两个真正的 XAML Page 位于同目录。
- 汇总、源码/产物指纹、Rust/浏览器结果：`references/navigation-motion-validation.json`。
- 浏览器确定性帧与截图：`out/navigation-motion-samples/`、`out/navigation-motion-Canvas2D.png`、`out/navigation-motion-WebGL2.png`。

```powershell
node tools/extract-navigation-motion.mjs
cargo test --locked
cd gallery
npm run build
$env:NAV_MOTION_REGRESSION='1'
npx playwright test -c playwright.navigation-motion.config.ts
```

原生探针构建后运行 `NavigationProbe.exe <absolute-output-directory> --navigation-motion`。探针通过 UI Rendering 回调记录时间范围、TransformToVisual 布局和自己的窗口像素；截图读回和 UI 调度会引入相位差，记录不能当作精确 GPU present timestamp。没有使用 RenderTargetBitmap 静态图替代这些运动采样。

外部 DOM 的跨表面 Acrylic 采样、浏览器/Windows Composition 的像素和呈现时序差异仍保留为宿主边界。该记录证明本批源参数、原生可观察机制与浏览器行为的对应关系，不宣称原生发行版所有状态的逐像素、逐帧全面等价。

## 2026-11-09 模板迁移回归修复

真实模板接入后，旧的共享 Arrange 分支和新模板执行器同时调用 `adapt()`。它每帧把面板宽度轨道直接跳到目标值，导致打开/关闭看不到动画；两套主题与透明度绑定还会互相覆盖。现在只由 NavigationView 模板执行器绑定策略，只有实际视口尺寸变化才执行自适应跳转，普通重排保持当前 350 ms 打开、120 ms 关闭轨道，快速反向从当前宽度继续。

关闭期间 `IsPaneOpen=false` 是逻辑状态，面板仍有可见动画阶段。Acrylic recipe、颜色轨道和面板绘制顺序现在保持到关闭完成；页面先绘制，覆盖面板随后采样并绘制，避免半途变成平色或被 Page 遮住。减少透明度立即切换 fallback，恢复时使用已有 167 ms 材质渐入。外部 DOM 仍使用明确的 fallback。

新增 `tests/navigation_pane_scene.rs` 覆盖重复 Arrange、三种左侧模式、关闭期间 Acrylic 命令顺序、反向与透明度恢复。`gallery/tests/navigation-pane-motion.spec.ts` 在 Canvas2D/WebGL2 下采样实际宽度、验证浅色/深色的真实 Acrylic 像素，并通过 Gallery 的真实鼠标点击复查。旧层级、页面转场、材质回归一并运行。结果及当前构建指纹见 `references/validation/navigation-pane-motion.json`，原始帧和截图在 `out/navigation-pane-motion/`。

```powershell
cargo test --locked --test navigation_pane_scene --test navigation_composition --test navigation_motion --test navigation_external_content
node tools/prepare-navigation-composition-validation.mjs --production
# 启动生产快照后：
cd gallery
npx playwright test -c playwright.navigation-composition.config.ts
```
