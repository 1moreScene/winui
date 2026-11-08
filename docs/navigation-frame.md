# NavigationView 与 Frame

2026-11-08。React 首页已使用公共 NavigationView + Frame。菜单仍由现有 Rust NavigationView 布局、命中、选中、滚动和动画；Frame 的历史、页面实例身份、缓存与转场采样由 `src/frame.rs` 管理。业务对象和页面内容留在 TS / React，基础 SDK 不依赖 React。

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
import { WinUI, EventKind, NavigationCacheMode } from './src/index';

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
import { WinUIProvider, NavigationView, Frame } from './src/react';
import { EventKind, NavigationCacheMode, type Frame as Controller, type PageStackEntry } from './src/index';

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
