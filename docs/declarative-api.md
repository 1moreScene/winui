# React 声明式 API 检查

检查日期：2026-11-10。检查范围为 `react.tsx` 的 117 个公共组件：挂载方式、属性与内容槽、浮层/提示/上下文菜单关联、数据模板、跨控件引用和示例源码。

## 已统一的关联与内容槽

| 场景 | 声明式写法 | 原有能力 |
| --- | --- | --- |
| Button、SplitButton、ToggleSplitButton、AppBarButton、AppBarToggleButton、DropDownButton 的浮层 | `<Control.Flyout><Flyout … /></Control.Flyout>`，也接受 `flyout={<… />}` | 仍可关联已有 SDK 对象；普通声明无需 `onReady` 保存浮层 |
| ToolTip | `toolTip={<ToolTip … />}`；常用按钮、文本、编辑器和容器还支持 `<Control.ToolTip>` | 自动关联所属控件；显式 `target` 仍可用 |
| ContextFlyout | `contextFlyout={<MenuFlyout … />}` 或 `<Control.ContextFlyout>` | 由 Rust 响应右键、Shift+F10/ContextMenu；Canvas 图形使用 Rust 命中测试 |
| Button 等内容控件 | `<Control.Content>` | 直接 `children` 用法仍可用 |
| Expander | `<Expander.Header>`、`<Expander.Content>` | 复用 Rust Header 槽与内容布局 |
| InfoBar | `<InfoBar.ActionButton>`、`<InfoBar.Content>` | 复用 Rust Action 槽，保留关闭原因及取消 |
| SplitView | `<SplitView.Pane>`、`<SplitView.Content>` | 复用 Pane/Content 槽，保留受控开关及关闭事件 |
| TeachingTip | `<TeachingTip.HeroContent>`、`<TeachingTip.Content>` | 目标、打开策略和业务操作仍可配置 |
| ItemsPresenter | `<ItemsPresenter.Header>`、`<ItemsPresenter.Footer>` | 正文仍是一个 items panel，字符串头尾保持原生属性路径 |
| RefreshContainer | `<RefreshContainer.VisualizerContent>` | 仍复用 Rust visualizer 和已有 `onRefresh`/deferral 生命周期 |
| Flyout、MenuFlyout、Popup、ToolTip | `.Content`、`.Items`、`.Child` 等对应属性元素 | 不增加渲染、命中或动画实现 |

属性元素不生成额外控件外壳。Header、Pane 等声明进入原有 Rust 槽；ToolTip/ContextFlyout 的 JSX 对象在 React 适配层消费，不进入 WASM JSON 属性。Flyout、ToolTip、ContextFlyout、Header、Pane、ActionButton 等已抽取的属性，同时用 prop 和属性元素赋值时会明确报告错误。

## 无需浮层句柄的确认按钮

```tsx
<Button text="Empty cart">
  <Button.Flyout>
    <Flyout width={260} onClosing={e => { e.cancel = cancel; }}>
      <StackPanel spacing={12}>
        <TextBlock text="All items will be removed. Continue?" wrap />
        <Button text="Confirm empty cart" closeFlyout />
      </StackPanel>
    </Flyout>
  </Button.Flyout>
</Button>
```

`closeFlyout` 是本 SDK 的便捷声明，默认 false。启用时，Rust 在按钮激活或集合项调用完成后查找最近的 Flyout/MenuFlyout/CommandBarFlyout，并发送正常的可取消关闭请求。嵌套浮层只关闭最近一层；外部没有浮层时不做操作。按钮仍可同时接收业务 `onClick`；ListView/GridView/ItemsView 的 `closeFlyout` 在 ItemClick 业务回调与选择提交后执行，被移除或禁用的条目不会触发关闭。高级操作保留浮层 render callback 和类型化控制器。

`Canvas` 只用于绝对定位。普通控件直接放在 SceneView 或布局容器中即可；Gallery 为保留示例位置使用 Button 的对齐和 margin。

## Rust 中的名称关联

同一 Scene 中的控件可通过 `name` 声明唯一名称，引用属性直接接受名称字符串。名称解析、前向引用、销毁后解绑与同名新节点重绑定均由 Rust 执行，React 和普通 TypeScript 使用同一机制。

```tsx
<StackPanel>
  <TickBar source="volume" />
  <Slider name="volume" value={40} />
</StackPanel>

<Button name="help-anchor" text="Help" onClick={() => setOpen(true)} />
<TeachingTip target="help-anchor" isOpen={open} />
```

已支持 `target`（浮层及 TeachingTip）、按钮族的 `flyout`、TickBar/ParallaxView 的 `source`、ScrollBar/AnnotatedScrollBar 的 `scrollTarget`、`labelItemSource`、`overflowContentTarget` 和控件的 `command`。普通 TS 同样可用 `root.tickBar({source:'volume'})`、`root.slider({name:'volume'})`。

名称大小写敏感，以 Scene 为作用域；这不是完整 XAML 嵌套 namescope 或通用 Binding 引擎。数据模板内重复实例的名称需自行保证唯一；重复名、目标类型错误、自己引用自己、溢出链/子命令环会报错。前向引用尚未挂载时保留声明，快照的 `unresolvedElementReferences` 提供诊断；指定名称但目标未就绪的浮层不会误当成无目标浮层弹出。已有控制器引用及显式清空 `null` 仍可用。

## 保留的业务和跨控件关系

| 控件类别 | 检查结果与保留原因 |
| --- | --- |
| 基础输入、选择、进度、图形、材质、布局控件 | 已直接接收类型化属性；不要求保存控制器才能显示或操作 |
| ListView、GridView、ItemsView、ItemsRepeater、TreeView、TabView 等 | 数据与 `renderItem`/`renderContent` 是声明式业务模板，保留类型推断和业务事件 |
| Frame、Page、NavigationView | 保留声明式页面/内容宿主；导航操作与页面业务策略继续使用类型化接口 |
| ContentDialog | WinUI 同样通过 `ShowAsync` 启动并取得业务结果；保留 `showAsync()`、结果及 deferral，不改成自动弹出 |
| TeachingTip | 显示时机和指向外部控件的关系是显式业务选择；保留 `isOpen`/`target`，HeroContent 已统一为属性元素 |
| ScrollBar/Thumb、AnnotatedScrollBar、RichTextBlock 溢出链、ParallaxView 等 | Gallery 已改用 Rust 的名称引用，不再为建立关系保存控制器；ScrollContentPresenter 的引用只保留给业务“回到顶部/底部”操作 |
| 编辑器外部格式化工具栏 | 保留对编辑器的业务引用；菜单自身的定位、打开和关闭已支持声明式关联 |

## 示例与验证

本轮遍历 Gallery 后去掉 10 处多余 Canvas（仅保留 Canvas 控件自己的定位示例）、剩余 3 处浮层 render callback，清理 TeachingTip、刻度条、滚动条、AnnotatedScrollBar、富文本溢出链、ParallaxView、UICommand 的手动关联，以及 ListView/StandardUICommand 的手动上下文菜单创建和打开；Gallery 页头的信息浮层和 Source/Documentation 菜单也使用所属控件声明。StandardUICommand 在菜单/SwipeItems 数据项中共享的命令对象、编辑器格式化、ContentDialog 结果、导航和连接动画几何引用仍服务于业务操作，继续保留。

已迁移 Flyout、ToolTip、AppBarButton、DropDownButton、SplitButton、ToggleSplitButton、InfoBar ActionButton、SplitView Pane、TeachingTip HeroContent、ItemsPresenter Header/Footer，以及 CommandBarFlyout 和 RichEditBox 菜单示例。源码面板仍从运行页面的 sample 标记提取真实代码。

验证通过 SDK/Gallery 类型检查、生产构建、100 项 Rust 名称引用、集合、浮层、紧凑控件、阅读控件、滚动原语和命令测试，以及按钮族、叶控件提示、上下文菜单、原生内容槽、Gallery 源码面板和实际示例的浏览器回归。实际页面回归还覆盖了编辑器格式化、ItemsPresenter、SplitView、TeachingTip HeroContent，以及两种渲染后端的 React/StrictMode 挂载。上述检查验证 API 与交互，不代表全部控件已完成原生视觉对齐。

本轮还逐一重新加载并检查了 87 条已实现 Gallery 路由的实际 SDK 宿主和源码区域，并专项核对 17 个迁移示例的源码面板。集合项中的被动悬停容器已由 Rust 向条目容器路由选择输入，内嵌按钮保留独立输入；集合上下文菜单使用被请求条目的坐标系。浏览器宿主补上同一帧内 RichTextBlock 焦点与 Ctrl 修饰键的转发，业务方无需添加等待。
