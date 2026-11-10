# 公共 SDK

基础入口 `winui-wasm`；React 入口 `winui-wasm/react`，源码统一位于 `packages/winui-wasm/src/`。Rust 的 wasm-bindgen glue 位于构建生成的 `packages/winui-wasm/src/wasm/`，属于内部边界，业务代码不需要 JSON、数字句柄或协议命令。

## 创建与初始化

```ts
const ui = await WinUI.create();
const nav = ui.navigationView(host, { items: [{ id: 'home', text: 'Home' }] });
```

一次初始化复用于多个控件。host 必须有实际尺寸；默认 React 高度 332px。高级配置使用同一个方法：

```ts
const nav = ui.navigationView(host, {
  paneDisplayMode: PaneDisplayMode.LeftCompact,
  theme: ThemeMode.Dark,
  selectedId: 'home',
  openPaneLength: 320,
  compactPaneLength: 48,
  items: [{ id: 'home', text: 'Home' }, {
    id: 'files', text: 'Files', selectsOnInvoked: false,
    children: [{ id: 'new', text: 'New file' }],
  }],
  footerItems: [{ id: 'help', text: 'Help' }],
});
```

## 读取与更新

```ts
console.log(nav.properties.theme, nav.snapshot.selectedId);
nav.update({ header: 'New header' });
nav.batch([{ theme: ThemeMode.Dark }, { paneDisplayMode: PaneDisplayMode.Left }]);
```

properties 从 Rust 读取脱离原对象的副本；snapshot 是最近绘制帧的布局、选择、焦点、展开等快照，也返回副本。属性提交后下一 RAF 绘制与通知；读取 properties 可直接观察已提交属性。整个 batch 先反序列化及校验，失败时没有部分提交；未知属性、无效枚举、重复/保留 ID、负数尺寸和不存在的 selectedId 都报告错误。

`selectedId: null` 清空选择。`isPaneOpen` 省略时按自适应布局确定；显式布尔值控制开关，`null` 恢复属性的未指定语义。`$settings` 为 SDK 保留的设置项 ID，其余 `$` 前缀不能用于业务 ID。文本和业务 ID 是开放字符串；accent 接受 `#RRGGBB`。

闭合属性只接受具名枚举：`ThemeMode.Light/Dark/HighContrast`、`PaneDisplayMode.Auto/Left/Top/LeftCompact/LeftMinimal`、`ItemKind.Item/Header/Separator`。只读 DisplayMode 和订阅 EventKind 同样导出运行时枚举。默认值和每个成员差异的 JSDoc 随生成文件提供。类型负例在 `gallery/tests/api-types.ts`。

## 事件与取消

```ts
const off = nav.on(EventKind.SelectionChanged, e => console.log(e.itemId));
nav.on(EventKind.PaneClosing, e => { e.cancel = hasUnsavedChanges; });
nav.invoke('home');
off(); // 幂等
```

ItemInvoked 是调用通知；重复调用已选中项仍触发。SelectionChanged 只在选择变化时触发。BackRequested 由应用处理导航历史。PaneClosing 是唯一可同步取消事件：Rust 先挂起请求，TS 执行监听器后提交 cancel 决定；异步修改 event.cancel 无效。其他事件中的 cancel 不生效。

回调执行在 WASM 调用返回后，没有在借用 Rust 对象时重入。回调中的属性更新排队到当前事件批次之后；回调可销毁控件，后续回调与待提交更新随即取消。监听器异常通过 reportError 报告，关闭握手仍完成。回调中的业务对象和函数只留在 JS，不复制到 Rust。

## 销毁与资源

```ts
nav.dispose(); // 释放一个控件
ui.dispose();  // 释放其余控件和 WASM runtime；均幂等
```

释放停止 RAF、断开 ResizeObserver、取消 DOM 输入监听与所有回调、丢弃时间线、删除 canvas 和 Rust 对象。销毁后的更新/订阅/读取抛出明确错误；旧 Rust handle 永不复用。业务无需安排内部释放顺序。

## React

常用内容槽支持属性元素写法，例如 `SplitButton.Flyout`、`TextBox.ToolTip`、`InfoBar.ActionButton`、`SplitView.Pane`。确认按钮可用 `closeFlyout` 关闭所属浮层，无需取得浮层句柄；Canvas 仅用于绝对定位。完整检查范围、用法与保留的高级关系见 [声明式 API 检查](declarative-api.md)。

JSX 控件、枚举、配置类型和公共工具均可从 `winui-wasm/react` 导入。`Button`、`ContentControl`、`Frame` 等无后缀控件名只由 React 入口导出；基础入口的对应命令式对象统一使用 `ButtonController`、`ContentControlController`、`FrameController` 等名称。需要标注控件对象时使用 `import type {ButtonController} from 'winui-wasm'`（React 入口也提供该类型），或让 `onReady` 自动推断类型。

此区分由 SDK 公共导出和打包后的类型声明保证，消费项目不需要添加编辑器配置。迁移时将基础入口的旧控件导入名改为对应的 `*Controller`；不保留旧名别名，否则会重新引入重复候选。`scene.root.button(...)`、`ui.frame(...)` 等工厂调用和 React 组件用法不变；枚举、配置及事件类型名称不变。

```tsx
import {WinUIProvider, SceneView, Button, ButtonVariant} from 'winui-wasm/react';
```

React 组件直接接收类型化属性，不使用 `options={{...}}` 包装。基础 TS 工厂仍接收配置对象。所有页面与 SceneView 默认 Canvas2D，WebGL2 仅通过 `backend={RendererBackend.WebGL2}` 显式选择。

```tsx
<WinUIProvider>
  <NavigationView items={[{ id: 'home', text: 'Home' }]} />
</WinUIProvider>
```

高级接口仍使用同一个 controller：

```tsx
<WinUIProvider runtime={existingRuntime}>
  <NavigationView
    theme={ThemeMode.Dark} paneDisplayMode={PaneDisplayMode.Top} items={items}
    onReady={nav => { controller.current = nav; }}
    onSelectionChanged={e => setPage(e.itemId)}
    onPaneClosing={e => { e.cancel = hasUnsavedChanges; }}
    style={{ height: 460 }}
  />
</WinUIProvider>
```

Provider 未传 runtime 时负责初始化和销毁；传入的 runtime 由调用方拥有。NavigationView 组件卸载总会销毁自己的 control。React 渲染只提交发生变化的属性，业务日志更新不会重置 Rust 的内部选择。省略先前显式设置的属性会保留原值；需要重置时传入明确默认值，或通过 React key 重新创建。

需要在导航内容区放置 DOM 时，用 `const unsubscribe = nav.onSnapshot(snapshot => positionContent(snapshot.content))` 订阅 Rust 排列后的几何。订阅立即收到当前快照，随后在已渲染帧收到独立的快照副本；`unsubscribe()` 幂等取消，销毁控件也清除订阅。React 对应直接属性为 `<NavigationView onSnapshot={snapshot => positionContent(snapshot.content)} />`。Gallery 复用此接口布局其页面，不自行计算 NavigationView 的宽度、断点和层级几何。


## 类型化内容与材质

```ts
import { ContentKind, GridUnit, HorizontalAlignment } from 'winui-wasm';

nav.update({ contentNode: ui.template('gallery/SamplePage2') });
nav.update({
  contentNode: {
    kind: ContentKind.Grid,
    columns: [{ unit: GridUnit.Pixel, value: 150 }, { unit: GridUnit.Star, value: 1 }],
    children: [{ kind: ContentKind.TextBlock, column: 1, text: 'Hello',
      horizontalAlignment: HorizontalAlignment.Center }],
  },
  expandedPaneMaterial: { tintColor: '#ffffff', tintOpacity: 0.8, fallbackColor: '#f2f2f2' },
  reducedTransparency: false,
});
nav.setExpanded('files', true);
```

内容由同一个 Rust 实现测量、排列、绘制。`contentNode: null` 恢复纯文本 `content` 槽。资源键是开放字符串；未知模板键抛错。有限的节点/单位/方向/对齐使用公共具名枚举。内容树和材质参数经过 Rust 校验，批次失败整体回滚。

`WinUI.create({ clock })` 可注入单调毫秒时钟供确定性录制；默认 `performance.now()`。布局、材质和动画仍在 Rust 执行；时钟倒退不会令时间线回退。业务通常无需配置此选项。


## Scene 与 Button：最简用法

```ts
import { WinUI } from 'winui-wasm';
const ui = await WinUI.create();
const scene = ui.scene(host);
const save = scene.root.button({ text: 'Save' });
const off = save.onClick(() => console.log('Saved'));
save.update({ text: 'Save again' });
console.log(save.properties, save.snapshot.state);
off();
scene.dispose(); // 或 ui.dispose()；均幂等
```

host 需要实际宽高。基础 SDK 不依赖 React；工厂返回类型化控件对象，不需要手写内部 JSON 或节点 ID。`scene.root` 是默认 Grid；同一 scene 的文字、Button、NavigationView、图像和容器共享坐标、输入、裁剪及 Canvas。包装器类型从公共入口导出，业务不直接构造它们。

## Scene 与 Button：组合和高级配置

```ts
import {
  WinUI, ThemeMode, RendererBackend, ButtonVariant, ClickMode,
  Orientation, HorizontalAlignment, TextTrimming, EventKind,
} from 'winui-wasm';

const ui = await WinUI.create();
const scene = ui.scene(host, { backend: RendererBackend.WebGL2 });
const panel = scene.root.stack({ padding: [16,16,16,16], spacing: 12 });
const title = panel.text({ text: '中文 / English', fontSize: 20, fontWeight: 600 });
const save = panel.button({
  text: 'Save', variant: ButtonVariant.Accent, clickMode: ClickMode.Release,
  minWidth: 100, maxWidth: 240, horizontalAlignment: HorizontalAlignment.Left,
});
save.on(EventKind.Click, () => scene.batch(() => {
  title.update({ text: 'Saved' });
  save.update({ enabled: false });
}));
scene.configure({ theme: ThemeMode.Dark, reducedMotion: true });
const other = scene.root.grid({ opacity: 0.7, clip: true });
save.moveTo(other); // 同一 owner；拒绝环、跨 scene 和非法 Button 交互子树
other.dispose();   // 连同 save 一次销毁；之后 save.update 会明确报错
scene.dispose();
```

`ButtonVariant.Standard/Accent/Subtle` 对应固定源模板。默认 ClickMode.Release 在匹配的指针/Enter/Space 释放时触发；Press 在首次按下触发，重复 keydown 不重复触发；Hover 只在指针进入时触发。拖出再进入可恢复 pressed，释放在外部、失去捕获、失焦或禁用会取消待激活状态。焦点保留但不绘制黑框。

Button 也可包含 `grid/stack/text/image` 子树，不能嵌套交互控件：

```ts
const pie = panel.button({width:50,height:50,accessibleName:'Pie'});
pie.image({source:'/official/Slices.png',accessibleName:'Slice'});
const wrapped = panel.button({maxWidth:240});
wrapped.text({text:'中文与较长内容随可用空间换行。',wrap:true});
```

Grid 支持 `GridUnit.Pixel/Auto/Star` 与跨度。所有布局尺寸使用 DIP；margin 允许负值，padding 非负。`maxWidth/Height: null` 去掉上限，`width/height: null` 恢复自动测量。`theme: null` 继承场景/祖先主题；enabled、visible 沿祖先传播。颜色接受 `#RRGGBB[AA]` 或 `{resource:'TextFillColorPrimaryBrush'}`；当前颜色属性要求可解析的 solid brush，未知或不支持的资源明确报错。

`Scene.batch(callback)` 原子提交全部节点的属性更新。回调内不能创建、移动或销毁节点；事件重入时排队提交。事件内销毁目标会取消引用该目标的待提交批次。创建和卸载分别使用父工厂与 `dispose`，无需安排内部资源顺序。`focus()` 也可在创建后立即调用，首次排列后交给实际 DOM 焦点。

## React 组合

```tsx
import { WinUIProvider, SceneView, StackPanel, TextBlock, Button } from 'winui-wasm/react';
import { ButtonVariant } from 'winui-wasm';

<WinUIProvider>
  <SceneView style={{height:180}}>
    <StackPanel padding={[16,16,16,16]} spacing={12}>
      <TextBlock text="Ready · 中文" />
      <Button text="Save" variant={ButtonVariant.Accent} onClick={() => saveDocument()} />
    </StackPanel>
  </SceneView>
</WinUIProvider>
```

`onReady` 获取同一个公共 controller 进行高级更新、订阅、focus 和迁移。`SceneNavigationView` 以 `options` 接收导航属性、`layout` 接收场景布局，复用原 NavigationView 实现；独立旧包装保持兼容。options 只提交变化的属性；省略先前设置的属性会保留其值，明确传默认值/null 或换 key 重建来重置。

WebGL2 目前支持本批几何、文字纹理、图像、仿射变换、stencil 裁剪和隔离 framebuffer。初始化失败明确抛错，不会声称已使用 GPU；阶段 5 已加入 GPU Acrylic 效果，Canvas2D 与 WebGL2 共用场景采样和配方；完整测量与限制见 stage-5.md。字体仍来自浏览器/本机；输入法验证已迁移到真实 TextBox；早期 InputProbe 原型及其专用协议已移除。实际比较与限制见 stages-1-4.md。


## 动画与 Acrylic

同一个已初始化的 scene 可以直接创建材质和动画，无需额外注册资源：

```ts
import { AnimationResult } from 'winui-wasm';
const panel = scene.root.grid({
  width: 320, height: 240,
  acrylic: { tintColor: '#ffffff', tintOpacity: 0.2, fallbackColor: '#f3f3f3' },
});
panel.text({ text: 'Acrylic / 中文' });
const animation = panel.animate({ translationX: 120, opacity: 0.7 });
if (await animation.finished === AnimationResult.Completed) console.log('Done');
```

后绘制的 panel 只采样已经绘制的下层场景。Acrylic 可设置在 Grid/StackPanel 的公共 options 上，React 使用同一 options；业务通过 `onReady` 得到的公共 controller 调用 `animate`。共享初始化仍然只执行一次。

```ts
import { AnimationEasing, ThemeMode } from 'winui-wasm';
const motion = panel.animate(
  { translationX: 200, translationY: 40, scaleX: 0.95, scaleY: 0.95, opacity: 0.6 },
  { duration: 600, delay: 80, easing: AnimationEasing.EaseOut },
);
// 再次 animate 重叠属性，从当前画面接续，也可将目标改回原值进行反向。
motion.cancel();
console.log(panel.properties.translationX); // 逻辑目标仍为 200
console.log(panel.snapshot.presentation.translationX); // 已冻结的当前呈现值
scene.configure({ theme: ThemeMode.Dark, reducedMotion: true, reducedTransparency: true });
panel.update({ acrylic: null }); // 移除材质；dispose() 则销毁整个子树
```

`AnimationEasing.Linear/EaseOut/EaseIn/Material` 是公共枚举；可选 `curve:[x1,y1,x2,y2]` 覆盖具名曲线。x 控制点必须在 [0,1]，时间非负且有限，opacity 目标位于 [0,1]。默认 duration 600ms、delay 0、EaseOut。`finished` 返回 Completed、Cancelled、Interrupted 或 Disposed，始终 resolve 而不因取消 reject。完成回调可以启动下一段动画。

一个 animate 调用是一个组，重叠会中断整个旧组；无重叠组可以并行。显式 update 对应属性也会中断，失败的事务不改变轨道。cancel 幂等、冻结画面并保留目标；要恢复目标可重新 animate。节点、祖先或场景销毁结算全部所属动画。动画创建不能放在只支持属性更新的 Scene.batch 中。

`reducedMotion/reducedTransparency` 省略时跟随宿主媒体策略，包括后续变化；显式 configure 覆盖自动策略。高对比度直接使用材质 fallback；调用方应提供适合前景对比度的 fallback 配方。减少动画会跳到目标并发送 Completed。浏览器和 Rust 均保留焦点、键盘和语义，不绘制黑色焦点框。

`acrylic` 配方包括 tintColor、tintOpacity、可选 luminosityOpacity、fallbackColor。材质/fallback 为 167ms 交叉淡化，颜色属性更新使用 500ms 原生 HSL 过渡，可从当前效果颜色连续中断。默认主题配方也可用 `acrylicResource: "AcrylicInAppFillColorDefaultBrush"`；两种属性互斥，移除时显式设 null。应用内材质不采样桌面、其他窗口或外部 DOM。GPU 设备恢复保留 Rust 状态，重建纹理和 framebuffer；scene.dispose() 统一释放。


## 缓动、关键帧和旋转

```ts
import { EasingFunction, EasingMode, AnimationEasing } from 'winui-wasm';
panel.update({ centerPoint: [25, 25] });
panel.animate({ rotation: 180 }, {
  duration: 500, easingFunction: EasingFunction.Bounce, easingMode: EasingMode.EaseOut,
});
panel.animate({ translationX: [
  { offset: 0.4, value: 200 },
  { offset: 1, value: 0, easing: AnimationEasing.Linear },
] }, { duration: 1000 });
```

`EasingFunction` 包括 Back、Bounce、Circle、Cubic、Elastic、Exponential、Power、Quadratic、Quartic、Quintic、Sine；`EasingMode` 为 EaseIn、EaseOut（默认）、EaseInOut。`easingParameters` 可选 exponent（2）、amplitude（1）、power（2）、oscillations（3）、springiness（3）、bounces（3）、bounciness（2）。参数须有限且绝对值不大于 50，函数内部采用固定 WinUI 的边界处理。cubic 的 `curve` 优先于 easingFunction，逐关键帧的 curve/easing 覆盖对应区间。

关键帧 offset 必须在 [0,1] 严格递增，最后为 1，每轨 1–256 帧。省略 offset 0 从当前呈现值接续；显式 offset 0 在 delay 后开始时应用。`AnimationEasing.Discrete` 保持前值直到对应帧。所有关键帧先完整验证，非法目标不会中断现有动画。`rotation` 单位为度，默认 0；`centerPoint` 默认 [0,0]，使用本地 DIP。

## 渐变画刷

```ts
import { GradientKind, GradientSpread, BrushMappingMode } from 'winui-wasm';
const gradient = scene.root.grid({ width: 200, height: 200, background: {
  kind: GradientKind.Radial,
  stops: [{ offset: 0, color: '#ffff00' }, { offset: 1, color: '#0000ff' }],
} });
gradient.update({ background: {
  kind: GradientKind.Radial, mappingMode: BrushMappingMode.RelativeToBoundingBox,
  spreadMethod: GradientSpread.Reflect,
  center: [0.5, 0.5], origin: [0.6, 0.5], radius: [0.25, 0.4],
  stops: [{ offset: 0, color: '#ffff00' }, { offset: 1, color: '#0000ff' }],
} });
```

当前渐变作用于 Grid/StackPanel 背景，其他不支持位置明确报错。2–32 个色标按 [0,1] 非递减排列，支持重复 offset。线性模式使用 `from/to`，建议显式设置；默认两端均 [0,0]，零长度取末色。径向 center/origin/radius 默认 [0.5,0.5]；零半径取末色。RelativeToBoundingBox 为尺寸比例，Absolute 为 DIP。Pad 延伸首末色，Reflect 镜像重复，Repeat 同向重复；画刷 opacity 默认 1。

Canvas 参考后端对径向/重复渐变缓存局部纹理，单项超过 1MP 时明确报错并提示采用 WebGL2；场景销毁统一释放缓存。GPU 直接计算，不经过整场景 Canvas 复制。Mica、桌面 Acrylic 和其他 Windows 系统材质尚需宿主适配，详见阶段 5 的范围记录。


## ToggleButton 与 CheckBox

```ts
const toggle = scene.root.toggleButton({ text: 'Pin' });
const check = scene.root.checkBox({ text: 'Option' });
const off = check.onCheckedChanged(event => console.log(event.isChecked));
check.update({ isThreeState: true, isChecked: null });
check.invoke();
console.log(check.properties.isChecked);
off();
check.dispose();
```

`isChecked` 是 boolean/null，默认 false；`isThreeState` 默认 false。三态用户循环为 false→true→null→false，程序也可直接赋 null。状态通知 Checked/Unchecked/Indeterminate 先于 Click，重复同值不通知；`event.isChecked` 是发生当时的值，适合处理同一帧的连续操作。可选 ClickMode 枚举及内容组合沿用共享 Button 基础；事务、事件重入、失效句柄与 dispose 规则相同。

CheckBox 默认用 Space 在释放时切换，Enter 不切换；二态支持数字键盘加/减。ToggleButton 的 Enter 和 Space 均可激活。程序赋值可在禁用状态下更新，用户激活在禁用状态下无效。

```tsx
<CheckBox text="Option" isThreeState={true}
  onChecked={event => console.log(event.isChecked)}
  onUnchecked={event => console.log(event.isChecked)}
  onIndeterminate={event => console.log(event.isChecked)} />
```

使用 `onReady` 获得与基础 SDK 相同的 controller；可直接订阅 `onCheckedChanged`。React 不另存控件内部状态，省略受控值时交给 Rust 维护。Checkbox 的 AnimatedIcon 路径与时序仍待实现，当前使用源模板的 FontIcon fallback，详见阶段 6.1。

## FontStyle 与 Image stretch

```ts
import { FontStyle, ImageStretch } from 'winui-wasm';
scene.root.text({ text: 'Italic', fontStyle: FontStyle.Italic });
scene.root.image({ source: '/photo.jpg', width: 100, height: 100,
  stretch: ImageStretch.UniformToFill, accessibleName: 'Photo' });
```

FontStyle.Normal 为默认值，可选 Italic/Oblique；测量与两后端共用同一个字体 CSS 和回退列表。ImageStretch 默认 Uniform；None 保留原大小，Fill 直接伸展，Uniform 完整等比显示，UniformToFill 等比铺满并裁剪。SVG 官方示例尚未接入和对照；动画播放、NineGrid 及解码大小/事件 API 尚未开放，不应据静态图片加载推断这些能力已交付。

## RadioButton、RadioButtons 与 ToggleSwitch（阶段 6.2）

```tsx
<SceneView style={{height: 200}}>
  <StackPanel spacing={12}>
    <RadioButtons header="Options" items={["One", "Two"]}
      onSelectionChanged={e => console.log(e.selectedIndex)} />
    <ToggleSwitch header="Work" isOn={working}
      onToggled={e => setWorking(e.isOn ?? false)} />
  </StackPanel>
</SceneView>
```

简单分组使用 `items`；支持字符串或 `{text, enabled}`，`selectedIndex` 默认为 -1，`maxColumns` 默认为 1。布局按列填充并平衡列长度。Rust 管理内部 RadioButton 的创建、互斥、销毁和焦点；当前不接受自定义 item template 或 React 子项。`selectedItem` 返回当前业务项；更新 `items` 导致选中索引越界时清空选择。

独立按钮用 `<RadioButton text="Light" groupName="theme" />`。未命名组限同一父节点，命名组共享同一 Scene；RadioButtons 容器隔离自己的分组。已选项再次激活保持选中。方向键跳过禁用项，组内只保留一个 Tab 入口；多列横向采用空间导航。Space 激活，Enter 忽略。没有三态用户循环。

```ts
const scene = ui.scene(host); // 默认 Canvas2D
const choices = scene.root.radioButtons({items: ['One', 'Two'], selectedIndex: 0});
const off = choices.onSelectionChanged(e => console.log(e.selectedIndex, choices.selectedItem));
choices.update({maxColumns: 2});
const work = scene.root.toggleSwitch({header: 'Work', onContent: 'Working', offContent: 'Do work'});
work.onToggled(e => console.log(e.isOn));
work.toggle();
off();
scene.dispose();
```

ToggleSwitch 默认 `isOn=false`、`On`/`Off` 文本；支持字体与布局属性。Toggled 在逻辑值变化时通知，`event.isOn` 保存当时的值，不另发 Click。拖动依据滑块位置提交；取消、禁用和失焦恢复原值。状态尺寸、透明度、颜色和位移轨道由 Rust 执行，减少动画策略立即收敛。浏览器保留 `radio`/`radiogroup`/`switch` 与 checked/disabled 语义，继续遵循全局不画焦点黑框的用户约定。

原生模板、动画与验证边界见 [阶段 6](stage-6.md)。

### TextBox、PasswordBox、ScrollViewer

```tsx
<TextBox header="Name" placeholderText="Your name" onTextChanged={e => setName(e.text ?? "")} />
<PasswordBox header="Password" passwordRevealMode={PasswordRevealMode.Peek} />
<ScrollViewer height={266} verticalScrollBarVisibility={ScrollBarVisibility.Auto}>
  <TextBlock text={longText} wrap />
</ScrollViewer>
```

基础 TS：`scene.root.textBox()`、`passwordBox()`、`scrollViewer()`；创建后统一 `update()`、事件订阅返回取消函数、`dispose()`。TextBox 提供 `select(start,length)`（UTF-16）、`selectAll()`、`undo()`、`redo()`、`canUndo/canRedo`。ScrollViewer 的 `changeView({verticalOffset:200,zoomFactor:2,disableAnimation:true})`、只读 `view` 和 `onViewChanged()` 共用 Rust 状态。React 按需受控，不传 text/password 时内部编辑不会被渲染覆盖；传入的新值清空编辑历史并取消当前组合输入。`SceneView autoHeight` 可让宿主跟随内容测量高度。详细支持范围与限制见 [文本与滚动](text-scroll.md)。

### 应用内全局滚动条

`await WinUI.create()` 就会默认接入当前文档，React Provider 也自动走同一入口，业务方无需额外调用安装方法。`WinUI.create({globalScrollbars:false})` 可关闭自动接入。`sdk.installGlobalScrollbars(documentOrElement)` 返回可释放租约，带 `refresh()` 和只读 `diagnostics`。runtime 销毁时自动释放其租约，同一文档复用一份 Rust 滚动条场景。`data-winui-scrollbars="native"` 给特定 DOM 子树保留原生外观。

平台适配可用空 ScrollViewer 的 `setHostMetrics({viewportWidth,viewportHeight,extentWidth,extentHeight,horizontalOffset,verticalOffset}, contentId?)` 同步内容，再通过 `onViewChanged` 将 Rust 请求应用到平台；宿主测量反馈不产生写回事件。宿主拥有内容时拒绝混入 Rust 子节点与 ChangeView 缩放。完整生命周期、DOM 材质 fallback 与平台限制见 [全局滚动条](global-scrollbars.md)。


### ProgressBar、ProgressRing

```tsx
<ProgressBar value={50} />
<ProgressBar isIndeterminate showPaused={paused} showError={failed} />
<ProgressRing isActive={working} />
<ProgressRing isIndeterminate={false} value={progress} />
```

基础 SDK：`scene.root.progressBar()` / `progressRing()`。两者提供 `minimum`、`maximum`、`value`、`isIndeterminate`；Ring 默认不确定进度，Bar 默认确定进度。Bar 的 `onValueChanged(e => e.value)` 可取消订阅，Ring 的 `isActive=false` 隐藏并停止时间线。其它属性更新、原子批量、销毁使用统一节点接口。默认值、原生参数与已验证范围见 [进度控件](progress.md)。


### RepeatButton、Viewbox

```tsx
<RepeatButton text="Click and hold" onClick={() => setCount(c => c + 1)} />
<Viewbox width={200} height={200} stretch={Stretch.Uniform} stretchDirection={StretchDirection.Both}>
  <Image source="/picture.png" />
</Viewbox>
```

基础 SDK：`scene.root.repeatButton()` / `viewbox()`。RepeatButton 继承公共按钮接口，默认 Press、delay=500ms、interval=33ms；Click 订阅可取消，卸载、失焦和禁用停止计时。Viewbox 接受一个内容节点，Stretch 是 ImageStretch 的公共别名；StretchDirection 为 UpOnly、DownOnly、Both，默认 Both。它缩放完整的子树并保持绘制、DOM、命中和裁剪一致。更完整用法及边界见 [RepeatButton / Viewbox](repeat-viewbox.md)。

### Border、Canvas、HyperlinkButton、Expander、InfoBadge

```tsx
<Border borderBrush="#0067c0" borderThickness={[2, 2, 2, 2]} cornerRadius={8}>
  <TextBlock text="Content" />
</Border>
<Canvas width={200} height={120}>
  <Button text="Positioned" canvasLeft={20} canvasTop={30} zIndex={1} />
</Canvas>
<HyperlinkButton text="Microsoft" navigateUri="https://www.microsoft.com" />
<Expander header="Details" expandDirection={ExpandDirection.Down}>
  <TextBox text="Edit me" />
</Expander>
<InfoBadge value={10} badgeStyle={InfoBadgeStyle.Attention} />
```

基础 SDK 的五个同名小写工厂为 `border()`、`canvas()`、`hyperlinkButton()`、`expander()`、`infoBadge()`。Border / Expander 单内容，Canvas 支持 Left / Top 与稳定 ZIndex；`ExpandDirection`、`InfoBadgeStyle` 为运行时具名枚举。高级配置和剩余边界见 [五控件记录](five-controls.md)。

### 图标

```tsx
<FontIcon glyph={"\uE790"} fontFamily="Segoe MDL2 Assets" />
<SymbolIcon symbol={Symbol.Accept} />
<PathIcon data="F1 M16,12 20,2 L20,16 1,16" />
<BitmapIcon uriSource="/image.png" width={50} showAsMonochrome />
<ImageIcon source="/image.svg" width={50} />
```

基础 SDK 工厂为 `fontIcon()`、`symbolIcon()`、`pathIcon()`、`bitmapIcon()`、`imageIcon()`，返回类型化节点。`node.properties` 读取 Rust 属性，`node.update({...})` 更新，`node.dispose()` 卸载；例如 `const icon = button.symbolIcon({symbol: Symbol.Accept}); icon.update({symbol: Symbol.Emoji});`。`Symbol` 是 197 成员的运行时枚举，裸字符串会编译失败。BitmapIcon 默认以图片透明度作为前景色遮罩，ImageIcon 保留原图；图标继承父级前景，支持 accessibleName。完整来源、布局和未实现能力见 [图标记录](icons.md)。InfoBadge 的命名图标样式现在自动应用官方 Padding，无需调用方手动补齐。

6.8 新增 `animatedIcon()`、`iconSourceElement()`、`rectangle()`、`line()`、`path()`、`polygon()`、`polyline()` 及同名 React 组件。`AnimatedIconSource` 选择七种内置源，`icon.setState('PointerOver')` 更新开放状态名，`sdk.animatedIconInfo(source)` 读取原生 marker/时长。Shape 提供 BrushValue 填充与描边、StrokeThickness、Stretch、端帽、连接和虚线；Polygon/Polyline 使用类型化 `[number, number][]` 点集。封闭参数使用 `IconSourceKind`、`FlowDirection`、`FillRule`、`PenLineCap`、`PenLineJoin`。示例和边界见 [6.8 记录](animated-icons-shapes.md)。

## 阶段 7 首批浮层和 Slider

Popup、ToolTip、Flyout、MenuFlyout、Slider 的简单/高级调用、事件取消、目标所有权、React 直接属性及验证范围见 [浮层 API](overlays.md#公共-api)。具名运行时枚举为 `OverlayPlacement`、`MenuEntryKind`，Slider 方向沿用 `Orientation`/`FlowDirection`。

## 基础控件补充批

`infoBar()`、`personPicture()`、`ratingControl()`、`splitButton()`、`toggleSplitButton()` 及同名 React 组件使用统一 Scene、直接属性、读取/更新/事件/销毁契约。`InfoBarSeverity`、`InfoBarCloseReason`、`RatingItemKind` 是公共运行时枚举。InfoBar 提供可取消 Closing 和 `.actionButton()`；评分提供 `.onValueChanged()`；SplitButton 的嵌套 Flyout/MenuFlyout 自动绑定，高级用法 `.setFlyout(surface)`；ToggleSplitButton 提供 `.onIsCheckedChanged()`。完整简单/组合示例、原生默认值和未支持能力见 [五控件 API 与验证](compact-controls.md)。

`OverlayPlacement.BottomEdgeAlignedLeft` 支持下方左边缘对齐并在根边界处避让；SplitButton 的次区打开默认采用它。Border 的 `cornerRadii={[topLeft,topRight,bottomRight,bottomLeft]}` 覆盖均匀 `cornerRadius`，仅作用于背景和边框装饰，例如原始色块的 `[4,0,0,4]`；不提供任意非对称后代裁剪。

## 集合与布局面板

`listView()` / `gridView()` 及 React `<ListView items={data}/>` / `<GridView items={data}/>` 接收字符串数组或带唯一 `id` 的业务对象。使用 `ListViewSelectionMode` 设置选择模式，`selectedKeys` / `selectedItems` 读取选择；`onSelectionChanged`、`onItemClick`、`scrollIntoView`、`changeView` 和属性批更新复用同一 Rust 场景。React `renderItem` 或基础 SDK `setItemTemplate` 使用普通 SDK 子控件，只实例化可见区与缓存区的项。

`itemsStackPanel()` / `itemsWrapGrid()` / `variableSizedWrapGrid()` 及对应 React 组件提供方向、单元尺寸、最大行列数和跨格布局；集合默认面板为 ListView→ItemsStackPanel、GridView→ItemsWrapGrid。基础/高级用法、原生默认值、所有权、资源上限和未实现范围见 [集合 API 与验证](collections.md)。

## ItemsRepeater 与下拉刷新

`itemsRepeater({items})` 默认使用 Rust StackLayout；`new StackLayout(...)` / `new UniformGridLayout(...)` 仅描述布局，位置与虚拟化由 Rust 执行。`refreshContainer()` / `refreshVisualizer()` 提供 `requestRefresh()`、`onRefresh(async () => ...)` 和 `onRefreshRequested` deferral。React 采用同名直接属性组件。完整创建、读取/更新、事件取消订阅、模板和销毁示例见 [公共 API](repeater-refresh.md)。

## 菜单与相对/流式布局

`menuBar()`、`menuBarItem()`、`commandBarFlyout()`、`relativePanel()`、`wrapPanel()` 与同名 React 组件调用 Rust 实现。最简单调用、更新、事件订阅/取消及销毁，以及高级子菜单、单选组、相对约束、Last 拉伸，见 [菜单与布局 API](menu-layout-controls.md)。

## 视图与跨平台命令

`splitView()`、`semanticZoom()`、`parallaxView()` 以及同名 React 组件调用 Rust 实现。公共 `UICommand` 实现 WinUI `XamlUICommand`，`StandardCommand` 实现 `StandardUICommand`，工厂为 `uiCommand()` / `standardCommand()`，导出、类型与组件均附有对应 JSDoc。命令绑定、取消、快捷键、属性读取/更新、订阅与销毁见 [本批 API](view-commands.md)。
