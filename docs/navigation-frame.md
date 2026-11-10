# NavigationView 与 Frame

2026-11-09。React 首页使用公共 NavigationView + Frame；NavigationView 控件页的八个官方示例使用同一 Rust 场景内的真实 Frame/Page。菜单布局、模板、命中、选中、滚动和动画在 Rust；Frame 的历史、页面实例身份、缓存与转场由 `src/frame.rs` 管理。基础 SDK 不依赖 React。浏览器页面内容可选择 Rust 控件树或外部业务内容宿主。

## 已接入的行为

- New / Back / Forward / Refresh 生命周期；同步 Navigating / onNavigatingFrom 允许取消，NavigationStopped 通知取消结果。取消和页面工厂失败不提交候选历史或缓存；通知事件异常报告给浏览器，不撤销已完成导航。回调内同步重入被拒绝，可在回调后排队导航。
- 新导航清空前进历史，返回/前进恢复原参数对象。`goToEntry` 用于浏览器历史跨多项跳转，跳过中间页面实例化。
- Disabled 每次重新创建；Enabled 按页面身份复用并按 LRU 淘汰，CacheSize 默认 10；Required 使用独立永久缓存。缓存键为页面类型身份，参数不是缓存键。固定版本原生 `NavigationCache::GetContent` 在新建 Required 页时也检查 CacheSize >= 1，此边界保留；已缓存 Required 页不因缩减容量而淘汰。
- Entrance、SlideFromLeft、SlideFromRight 和 Suppress。WinUI 原始时间线为 150 ms 离场、300 ms 入场；Entrance 偏移 140 DIP，水平滑动偏移 150 / 200 DIP。曲线来自固定 `ThemeTransitions.cpp`，返回使用离开页面的转场配方反向播放。快速切换保留尚未结束的旧离场页，新的离场按原生关键帧重置 opacity / slide offset；离场阶段完成即释放未缓存实例。减少动画立即结束时间线。后续原生窗口采样和修正见 [展开、材质和页面动画](navigation-motion-parity.md)。
- NavigationView 事件导出 `recommendedNavigationTransition`：左侧菜单使用 Entrance，Top 按项目顺序推荐方向，溢出入口推荐从右进入。
- React 按 Rust 实例身份保留页面；隐藏页 inert 并移出可访问性树，输入状态和页面自身滚动位置保留。SceneView 自动暂停隐藏页面的 Canvas 调度及浮层显示，重新进入后恢复。自定义业务定时器可通过 `PageNavigationContext.active` 自行管理。
- 从页面内导航时恢复缓存页面的焦点，首次进入时聚焦标题；菜单焦点不被无条件抢走。全局不绘制浏览器焦点框的项目约定继续生效。
- 首页返回/前进按钮、Alt+Left / Alt+Right、浏览器历史、标题和选中项同步；首页采用 Enabled / 10，主题与收藏使用共享应用状态。

## 材质

Rust Canvas 内容继续使用已有 Acrylic 配方与采样。`isBackdropAvailable` 是独立宿主能力，默认 true；背景为外部 DOM 时显式 false，Rust 直接绘制 WinUI brush 的 fallbackColor，不执行无效背景模糊。系统的 reducedTransparency 和 HighContrast 仍分别生效。首页和 DOM Frame 示例使用该能力标志，菜单页自身的纯 Canvas Acrylic 示例保留真实采样。

这不提供跨 DOM 的 Acrylic 背景采样，也不表示 Windows Composition 的逐像素等价。

## 普通 SDK

```ts
import { WinUI, EventKind, NavigationCacheMode } from 'winui-wasm';

const ui = await WinUI.create();
const frame = ui.frame({
  resolvePage: page => ({
    cacheMode: NavigationCacheMode.Enabled,
    create: () => document.createElement('article'),
    onNavigatingFrom: (element, event) => { event.cancel = hasUnsavedChanges(); },
    onNavigatedTo: (element, event) => showPage(element, event.parameter),
    onNavigatedFrom: element => element.remove(),
    dispose: element => element.remove(),
  }),
});
const nav = ui.navigationView(menuHost, { items });
const off = nav.on(EventKind.ItemInvoked, event => {
  if (event.itemId && frame.snapshot.current?.page !== event.itemId)
    frame.navigate(event.itemId, { transition: event.recommendedNavigationTransition });
});
frame.navigate('home', { parameter: model });
frame.goBack();
frame.goForward();
frame.configure({ cacheSize: 5 });
frame.clearHistory();
off();
ui.dispose(); // 同时释放 Frame、缓存页面和 NavigationView。
```

非 React 宿主通过 `onSnapshot` 获取 `visuals`、`pages` 和当前实例，负责把任意内容挂到自己的显示树；Frame 不把业务对象转换成 Rust JSON。完整内容工厂、生命周期、订阅与释放类型从公共入口导出。

`visuals` 是完整呈现帧，每个保留实例都有一项，包括隐藏的缓存页。宿主必须同步投影 Rust 的 `visible`、`interactive`、`zIndex`、`opacity` 和位移，不能把缺失项恢复为 opacity=1。`visible=true / opacity=0` 的入场页需要保留布局，以便 Canvas 在揭示内容前完成尺寸与绘制准备；`interactive` 决定 inert 和命中测试。层级取自 `zIndex`，不能依赖缓存实例编号或 DOM 挂载顺序。React 包装在 SDK 通知和 React layout commit 中都投影最新完整帧。详见 [页面闪回修复](frame-presentation-flicker.md)。

默认全局滚动条接管覆盖转场中的 inert 页面。NavigationView 菜单和原生 Canvas 内容使用共享 Rust ScrollState，具备滚动条绘制与交互，独立及共享 Scene 宿主均投影同一状态；见 [滚动条与 Frame 宿主接管](navigation-scrollbar-host.md)。

## React

```tsx
import { useState } from 'react';
import { WinUIProvider, NavigationView, Frame } from 'winui-wasm/react';
import { EventKind, NavigationCacheMode, type FrameController as Controller, type PageStackEntry } from 'winui-wasm';

function Pages() {
  const [frame, setFrame] = useState<Controller<PageStackEntry> | null>(null);
  return <>
    <NavigationView items={items} onEvent={event => {
      if (event.kind === EventKind.ItemInvoked && event.itemId)
        frame?.navigate(event.itemId, { transition: event.recommendedNavigationTransition });
    }} />
    <Frame page="home" cacheMode={NavigationCacheMode.Enabled} cacheSize={10}
      onReady={setFrame} renderPage={entry => <MyPage page={entry.page} />}
      onNavigating={event => { event.cancel = hasUnsavedChanges(); }} />
  </>;
}

<WinUIProvider><Pages /></WinUIProvider>
```

`page` 可省略，使用 controller 导航；若提供则是外部页面请求，改变时发起导航。`Frame` 提供 className/style，应用根据 NavigationView.onSnapshot.content 的 Rust 几何放置内容。示例页包含完整可操作的组合，包括缓存模式、转场、返回/前进和用于检查状态保留的输入框。

## 来源与验收

### NavigationView 原生组合与八个示例（2026-11-09）

`Shell` 是 Gallery 的应用组织方式，不是 NavigationView 内置或遗漏的 SDK 控件。原生应用把 NavigationView 放在 Window 中，并通常在其 Content 放置 Frame；Frame 导航到 Page。SDK 现在同样允许公共 `SceneNavigationView` 的子节点直接声明 `<Frame>`，由 Rust 放入稳定的 Content 插槽；`Frame` 在 SceneView 内自动使用场景 Frame，外部业务内容宿主用法继续可用。

`tools/extract-navigation-composition.py` 从固定 `NavigationView.xaml` 提取 57 个结构及附加 ToolTip 部件，并提取 Left/Top/Overflow 的 NavigationViewItemPresenter、NavigationViewItemHeader 和 NavigationViewItemSeparator 模板及 66 项尺寸资源，产物为 `references/navigation-composition-template.json`。`src/scene/navigation_view.rs` 实例化真实 SplitView、ScrollViewer、ItemsRepeater、Button、ContentPresenter、Rectangle、AnimatedIcon、ToolTip 等 Rust 节点。专用执行器负责模板绑定和状态，复用已有控件的布局、输入和绘制；不要求完整通用 XAML 解释器。

公开插槽为 `NavigationViewSlot.Content / Header / PaneHeader / PaneCustomContent / PaneFooter / AutoSuggestBox / ContentOverlay`。JS 用 `view.slot(...)`，React 用 `NavigationViewContent`。插槽接受一个根节点，多项内容使用面板组合；同时设置插槽模板与显式子树会在提交前报错。Left/Top 切换移动同一个实例，自定义输入、InfoBadge 和图标不会因样式切换重新创建。长菜单仅实例化当前可见的原生容器。

`NavigationItem` 支持 `iconSource`、`animatedIconSource`、`contentTemplate`、`infoBadge`、`hasUnrealizedChildren`、`tooltip`；`menuItemTemplate` 为默认项模板。`NavigationViewItem` 也可通过公共 SDK 或 React 放在 PaneFooter 等自定义区域。模板所有权由 Rust 保持，不能单独销毁或搬走内部部件。

默认 Header/Content 为 null；显式空 Header 字符串仍保留原生最小标题高度。`isBackButtonVisible` 使用原生 `NavigationViewBackButtonVisible` 三态枚举，默认 Auto；OpenPaneLength=320、CompactPaneLength=48。新增 `NavigationViewOverflowLabelMode` 和 `NavigationViewShoulderNavigationEnabled`，默认分别 MoreLabel/Never。裸字符串、布尔返回按钮策略和错误枚举均在类型测试中拒绝。

`gallery/src/NavigationGalleryExample.tsx` 包含固定 Gallery 的八个示例，包括 API in action。七个初始页面通过公共 Frame 的 `contentResource` 加载固定 SamplePage XAML；API 示例初始没有选中项或页面。菜单导航、数据绑定、页脚导航、层级导航、随宽度切换，以及 API 的搜索框、More info、真实 NavigationViewItem 页脚和选项使用同一公共 SDK。源码面板展示实际运行模块及对应官方 XAML。

```tsx
<SceneView>
  <SceneNavigationView isBackButtonVisible={NavigationViewBackButtonVisible.Auto}>
    <Frame pages={[{key: 'home', content: {
      kind: NodeKind.TextBlock, properties: {text: 'Home'}
    }}]} onReady={frame => frame.navigate('home')} />
    <NavigationViewContent slot={NavigationViewSlot.AutoSuggestBox}>
      <AutoSuggestBox queryIcon accessibleName="Search" />
    </NavigationViewContent>
  </SceneNavigationView>
</SceneView>
```

独立同 SDK 原生探针在 `tools/native-navigation-composition/`，记录 Light/Dark、五种模式及打开状态共 30 组实际模板几何（含 null/空 Header 边界）、默认值和真实 Frame 的 New/New/Back 事件顺序。精简原生数据见 `references/navigation-composition-native.json`，本轮验证范围与结果见 `references/validation/navigation-composition.json`。探针静态几何验收不代表 Store 发行版 Composition 材质及动画逐帧全面等价；原有焦点黑框禁用约定继续作为用户指定例外。

```powershell
cargo test --locked --test navigation_composition
node tools/generate-enums.mjs --check
node tools/check-control-origins.mjs --check
node tools/prepare-navigation-composition-validation.mjs
# 在另一终端启动固定快照，避免并行开发的 HMR 改写受测代码：
node gallery/node_modules/vite/bin/vite.js out/navigation-composition-dev --host 127.0.0.1 --port 5410 --strictPort
node tools/validate-navigation-composition.mjs --strict
```

本轮结果：15 项新增 Rust 组合测试通过；生产构建中的 30 组原生矩阵、363 项实际可见部件几何比较通过，最大误差 0.724 个物理像素；22 组公共 API/浏览器交互及 5 项已有导航动画、材质回归通过。浏览器覆盖 Light/Dark/HighContrast、Canvas2D/WebGL2、DPR 1/1.25/2。类型、声明、枚举漂移及来源边界检查通过。已更新 `gallery/src/wasm` 和 `gallery/dist`，其 WASM 与受测生产快照的 SHA-256 相同。

当前工作区的完整 Rust 回归为 471 通过、1 失败；独立复测仍失败的是 `table_view::frozen_column_uses_scroll_compensation_and_header_stays_fixed`，不计入 NavigationView 的通过范围。原始输出和文件指纹见验证记录。本次 WASM 验证使用 release、opt-level=1、LTO 关闭的构建配置；未把它表述为默认 LTO 优化的性能验收。系统强调色与本地化仍是平台输入，静态几何比较不代表所有像素完全相同。

固定 WinUI 提交 `7b12709347527238494ca28cb9fed326d513e779`，新增原始文件、git blob 校验及 SHA-256 在 `references/frame-sources.json`；沿用项目已有 Gallery / NuGet 版本映射和二进制不确定性。没有修改官方参考仓库。

```powershell
cargo test --locked
node tools/generate-enums.mjs --check
node tools/check-control-origins.mjs
cd gallery
npm run build
$env:FRAME_REGRESSION='1'
npx playwright test -c playwright.frame.config.ts
```

构建、测试结果及当前 WASM 指纹记录在 `references/navigation-frame-validation.json`。本轮提供 Rust 时序/缓存回归、生产浏览器交互和截图；未完成 Store 发行版窗口的 Composition 页面动画逐帧与材质逐像素验收，不能据此宣布所有 NavigationView 原生 API 和原生渲染全面等价。当前未实现跨进程导航状态序列化和完整 WinRT Frame 对象模型；没有引入相关占位 API。

## NavigationView 性能复测

导航滚动、点击和页面进入的性能修复及复测方法见 [NavigationView 性能回归](navigation-performance.md)。
