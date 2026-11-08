# 菜单与布局控件批

本批实现 MenuBar、MenuBarItem、CommandBarFlyout、RelativePanel、WrapPanel。用户选择命令模型以后再做，本批不新增 XamlUICommand、StandardUICommand 或跨平台命令模型。

五项都通过统一 Scene 运行。Rust 持有属性、模板子节点、Measure/Arrange、命中、焦点、浮层和绘制；TS 只转换类型化参数、投影无障碍语义及转发输入，React 只管理挂载、属性差异和业务回调。Gallery 未使用 HTML/CSS 重写这五项。

## 调用

```tsx
<MenuBar>
  <MenuBarItem title="File" items={[
    { id: 'new', text: 'New' },
    { id: 'save', text: 'Save' },
  ]} onItemInvoked={event => runAction(event.itemId)} />
</MenuBar>

<WrapPanel width={360} itemSpacing={8} lineSpacing={8}>
  <Button text="One" />
  <Button text="Two" />
</WrapPanel>

<RelativePanel width={300}>
  <Border layoutKey="first" width={50} height={50} background="#ff0000" />
  <Button text="Next" relative={{ rightOf: 'first' }} />
</RelativePanel>
```

```ts
const menu = scene.root.menuBar({ items: [
  { id: 'file', title: 'File', items: [{ id: 'save', text: 'Save' }] },
] });
const release = menu.onItemInvoked(event => save(event.itemId));
menu.update({ enabled: false });
const options = menu.properties;
release();
menu.dispose();

const target = scene.root.button({ text: 'Commands' });
const flyout = scene.root.commandBarFlyout({
  primaryCommands: [{ id: 'share', label: 'Share' }],
  secondaryCommands: [{ id: 'resize', label: 'Resize' }],
});
const releaseClick = target.on(EventKind.Click, () => flyout.showAt(target));
const releaseAction = flyout.onCommandInvoked(event => perform(event.command.id));
// Later: releaseClick(); releaseAction(); flyout.dispose(); target.dispose();
```

高级能力使用同一 API：`MenuEntryKind.Submenu` 搭配 `items`，`MenuEntryKind.Radio` 搭配 `groupName`，以及 `keyboardAccelerators`。布局使用 `Orientation`、`WrapPanelItemsStretch`；浮动命令栏使用 `FlyoutShowMode`。枚举由 `references/api-enums.json` 统一生成，裸字符串不属于公共类型。

## 行为与来源

- MenuBar 支持数据式和 MenuBarItem 组合式调用。数据项按 ID 保留节点，更新、移除或重排由 Rust 完成。打开后悬停切换、方向键、Home/End、禁用项跳过和每栏一个 Tab 入口共用真实焦点。
- MenuBarItem 复用 Rust MenuFlyout。子菜单、独立单选组、勾选项、分隔符和快捷键支持鼠标与键盘；调用后逐层回写状态，关闭根菜单并恢复焦点。快捷键执行本身不会打开菜单。
- CommandBarFlyout 复用 Rust CommandBar/AppBarButton 的稳定节点和溢出处理。普通主命令保持浮层，普通次命令关闭整个浮层；附带子 Flyout 的命令保持父浮层。支持 Standard/Transient、AlwaysExpanded、显式定位、关闭取消及生命周期。
- RelativePanel 使用兄弟 `layoutKey` 和 16 个相对约束。按固定 RPGraph/RPNode 的优先级处理边缘、中心和前后关系；依赖顺序参与测量，有限宽度内的换行在 Measure 阶段完成。自动 DesiredSize 包含右边/中心锚定链，双边锚定拉伸布局槽。未找到引用、重复名称和循环依赖明确报错，可通过属性更新恢复。
- WrapPanel 直接移植固定 C++ 的行列打包，支持横纵方向、Padding、ItemSpacing、LineSpacing、折叠子项及最终源子项 Last 拉伸；Rust 布局负责 RTL、尺寸变动和像素取整。

固定 Gallery commit `7360ac322414e118eadfb0c7c2f4ecc31a218f59`，WinUI commit `7b12709347527238494ca28cb9fed326d513e779`。菜单源指纹沿用 `references/command-menus-sources.json`，布局及 RPGraph/RPNode 见 `references/menu-layout-sources.json`，实际 Gallery 示例与指纹见 `gallery/src/official-menu-layout.json`。

`tools/extract-command-menu-templates.py` 从固定 NuGet generic.xaml 提取样式、尺寸与画刷，生成 Rust 包含的 `references/command-menu-template.json`。浮动命令栏的 60 DIP 主行、60 DIP 命令宽及 44 DIP More 来自同 SDK 正常 ShowAt 的实测模板几何；记录可区分固定源码与实际二进制差异。

## 验收边界

原生证据是独立同 SDK 探针的 24 个浅色/深色状态和模板几何，包含真正的 MenuBarItem Flyout 打开路径以及 CommandBarFlyout.ShowAt。RenderTargetBitmap 中的透明背景没有 Windows Composition 桌面采样；不能据此宣称 Store Gallery 的 Acrylic、阴影和逐帧动画完全一致。

WrapPanel 在固定 experimental SDK 中，Last 模式可能把 Padding/尾部 ItemSpacing 计入 DesiredSize，造成显式 Width/Height 外的呈现。当前 Rust 保持共享显式尺寸约束，行内末项延伸按固定打包算法处理；这种边界行为及纵向 Last 的具体像素差异仍须逐项核对，不宣称所有状态完全一致。

2026-11-08 追加完善：CommandBarFlyout 主面板与二级面板使用固定 SDK 的 SystemBackdrop，复用 Rust 的桌面背景配方与宿主不可采样时的 fallback。主面板按实际选用的 OpeningOpacityStoryboard / ClosingOpacityStoryboard 做 83ms 线性淡入淡出；More 二级区域按 250ms/167ms、ControlFastOutSlowInKeySpline 做裁剪展开/收起，并过滤拼接圆角。重入、反向、中止、减少动画及卸载均在 Rust 中处理。

子菜单增加 400ms 悬停打开/延迟关闭（可移植宿主采用 Windows 默认 MenuShowDelay）、进入后代时取消关闭、RTL 方向键及视口翻转。菜单行支持 Rust 滚轮偏移和键盘自动滚入可视区。WrapPanel 保留 Measure 分行，只有排列主轴不足时才重新分行；RelativePanel 按两个轴的依赖预算测量。

Gallery 现在按固定仓库的实际页面组织：左键图片以 Transient 打开、右键/Shift+F10 以 Standard 打开，锚定 300 DIP 高图片并使用 RightEdgeAlignedTop；输出为 `You clicked: Label`。RelativePanel 固定 300 DIP。WrapPanel 基础示例含原仓库的 10 项，Orientation 单选、三项 0–24/步长 2 的滑块；第二示例含五个 72 DIP 项及 Final item，默认 Last，并使用 SDK ToggleSwitch。MenuBarItem 单独示例明确标记为 SDK 补充示例。

AnimatedIcon 的历史 Rust 失败在本次初始源码上未复现；已收紧 Scene 的控件动画调度归属，新增 0/1/41.5/83/250/1000ms 销毁后不遗留帧请求的回归。另修复浏览器测试仍操作旧 HTML details 的问题，改为操作现有 Rust Expander 的按钮；勾选操作等待 SDK 下一帧投影的 aria-checked，避免把异步 Rust 状态投影当成原生 input 的同步更新。

仍未完成的原生验收：Store Gallery 完整 Composition 动态材质/阴影逐帧对照、子菜单斜向移动的全部缓冲区域边界、完整 UIA Provider 及极端 RelativePanel 组合的系统性差分。长菜单已有滚轮/键盘可视化滚动，触摸惯性与原生滚动条模板尚未逐帧对照。浏览器系统保留的快捷键可能被浏览器优先处理。

## 重现

```powershell
python -X utf8 tools/fetch-menu-layout-controls.py
pwsh -NoProfile -File tools/run-menu-layout-probe.ps1
python -X utf8 tools/extract-command-menu-templates.py
cargo test --locked --test menu_layout --test command_controls --test overlays
# wasm 构建支持独立 WINUI_WASM_TARGET_DIR / WINUI_WASM_OUT_DIR。
node tools/build-wasm.mjs
cd gallery
npm run typecheck
npx playwright test -c playwright.menu-layout.config.ts
```

浏览器脚本默认指向独立 5268 服务，通过 `WINUI_MENU_LAYOUT_URL` 可指定其他地址；运行时应固定对应 WASM 与 TS/React 快照。最终结果、二进制指纹和剩余边界见 `references/menu-layout-status.json`。

首版独立验收（历史）：105 项相关 Rust 回归（含新增 16 项）、26 项 Edge/WebKit SDK 检查、18 项生产页面/交互检查。四矩形同条件对照最大几何误差约 0.800002 DIP，覆盖范围不外推到全部控件/状态。本次完善结果与新二进制指纹单独记录在 `references/menu-layout-refinement-status.json`，不沿用首版通过数。

首版全量尝试在 AnimatedIcon 测试失败后停止；本次该项与新增生命周期回归均通过。共享目录持续有其他批次修改，因此本次冻结全部 Rust 源码而不排除其他控件；状态 JSON 分别记录相关检查与完整套件的结果，不能以相关检查通过替代完整套件通过。

首版预览使用 5270，不包含本次完善。

本次最终验收：完整冻结 Rust 套件 **317 项通过**（菜单/布局 23、AnimatedIcon 8），Edge/WebKit 开发运行时 **32 项通过**，同一 WASM 的生产产物 **24 项通过**。固定 TS/React 源码与绑定通过 strict 类型检查、运行时枚举负例和 SDK 声明生成；生产构建通过。完整源码快照为 `out/menu-layout-refinement-source-v4`，WASM SHA-256 为 `4dffe71b7112988085bda324dd04e7901535136675f8d8b57076811f331b451a`。共享源码后续漂移与每项日志见 `references/menu-layout-refinement-status.json`。截图发现的 Options 挤占画布问题已通过原 Gallery 列布局类修复，并增加实际画布宽度断言。

最新固定生产预览：[MenuBar](http://127.0.0.1:5302/#menu-bar)、[MenuBarItem](http://127.0.0.1:5302/#menu-bar-item)、[CommandBarFlyout](http://127.0.0.1:5302/#command-bar-flyout)、[RelativePanel](http://127.0.0.1:5302/#relative-panel)、[WrapPanel](http://127.0.0.1:5302/#wrap-panel)。重启命令：`cd gallery; npx vite preview --host 127.0.0.1 --port 5302 --strictPort --outDir ../out/menu-layout-refinement-gallery-v4`。开发验证服务为 5300，配置为 `playwright.menu-refinement.config.ts`。

### CommandBarFlyout 底部圆角阴影修正

后续修复：原先窗口边界资源缺少 CommandBarFlyout，Transient 主面板的阴影被裁到控件矩形内，只在两个透明圆角处留下灰色矩形残影。现在 Rust 浮层资源按 ThemeShadow.cpp 的 Medium 深度分配 `10,2,10,18` DIP 阴影留白，控件布局和命中尺寸不变；生成器同步加入该项。验证后端切换时也清除 Gallery 旧场景的锚点句柄。

57 项相关 Rust 检查通过；Edge/WebKit × Canvas2D/WebGL2 × 1/1.25/2 DPR × Transient/Standard 的 24 个实际像素状态通过。前后截图及新 WASM 指纹见 `references/command-shadow-validation.json`。5302 已更新为此修正版，刷新页面后生效；最新重启命令使用 `--outDir ../out/command-shadow-gallery-final`，上面的 v4 目录保留为历史验收产物。
