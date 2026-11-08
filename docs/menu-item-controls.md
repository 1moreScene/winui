# 五个独立菜单子控件

本批提供 MenuFlyoutItem、ToggleMenuFlyoutItem、RadioMenuFlyoutItem、MenuFlyoutSubItem 和 MenuFlyoutSeparator。它们是独立的 Rust Scene 节点，有稳定句柄、属性读取和更新、事件订阅以及级联销毁；MenuFlyout 和 MenuBarItem 的现有数据接口继续可用。

## 本轮差异修正

菜单内联 TextBlock 的自然宽度现在先包含物理像素取整预算，再传播到 presenter。原默认样例在 125% 下的宽度由 131.2 DIP 修正为原生的 132 DIP。行高逐行累加已取整的预算，避免标题或快捷键引入半像素后，后续行再次取整产生错位。

共享 Rust presenter 按固定默认模板提取箭头字形、字号和各命名部件的状态资源。子菜单改用 E974 箭头；勾选、单选圆点、图标、快捷键和正文各自使用模板前景色，包括子菜单已打开状态。

快捷键使用 Caption 的 12 DIP 字号，统一修饰键顺序和字母大小写，并保留菜单项与 Toggle/Radio 不同的模板 Margin。文本、图标、勾选、快捷键和箭头分别占位；长标签按自己的列裁剪，文字的垂直裁剪保留子 TextBlock 的取整预算。

`MenuFlyout` 等浮层公开类型化的 `flowDirection`。Rust 镜像内部列与子菜单箭头，保留快捷键文字的正常字形顺序；键盘进入／返回方向仍由共享菜单逻辑处理。五个 Gallery 示例均可通过 Menu direction 切换。

验证扩大到 20 个固定原生状态、28 个双后端几何组合和 20 项冻结生产浏览器检查，Rust 相关回归为 76 项。默认／紧凑密度、图标与快捷键、长标签和 RTL 使用同一组数据。原生探针固定窗口位置、弹出方向和密度状态；浏览器几何与截图检查逐次验证所加载的 WASM 与冻结产物的 SHA-256 一致。截图裁剪保留完整的最后一个物理像素，不通过图像缩放或位置拟合降低误差。

本轮 28 组菜单外框和菜单行几何的最大差值约为 0.0000092 DIP，属于原生 float 记录的精度范围；该值不代表文字、材质或动画像素等价。原生与浏览器截图的物理尺寸均已一致，像素差异仍单独记录。

验收服务 `http://127.0.0.1:5351/#menu-items` 固定加载 `out/menu-item-tested-dist-v3`。共享目录中的生成 WASM 已被并行会话继续更新，因此本轮结果只绑定记录中的冻结产物指纹，不自动验收后续二进制。

## SDK 边界

`src/scene/menu_item_controls.rs` 将逻辑子控件投影到共享 Rust 菜单 presenter。文本测量、布局、命中、勾选和单选状态、快捷键、子菜单延迟、浮层和焦点恢复继续由 Rust 执行。每个投影条目关联其源节点，点击前先将状态写回源控件，再发送状态通知和 Click。TS 只转换类型化属性、保留回调并投影无障碍 DOM；React 使用相同的 SDK。

调用方可以在 MenuFlyout、MenuBarItem 或 MenuFlyoutSubItem 下添加菜单子控件。普通业务无需传菜单项 ID 或编码内部协议。一个菜单选择子控件方式后，不能再用 `menuItems` 覆盖其内部列表；不允许把业务内容面板混进菜单项树。

```ts
const menu = scene.root.menuFlyout();
const open = menu.menuFlyoutItem({text: 'Open'});
const toolbar = menu.toggleMenuFlyoutItem({text: 'Show toolbar'});
const orientation = menu.menuFlyoutSubItem({text: 'Orientation'});
orientation.radioMenuFlyoutItem({text: 'Portrait', groupName: 'orientation', isChecked: true});
orientation.radioMenuFlyoutItem({text: 'Landscape', groupName: 'orientation'});
menu.menuFlyoutSeparator();

const stop = open.onClick(() => loadDocument());
toolbar.onIsCheckedChanged(() => console.log(toolbar.properties.isChecked));
open.update({text: 'Open document'});
menu.showAt(button);
stop();
menu.dispose(); // 同时释放所有子菜单、菜单项及其回调
```

```tsx
<DropDownButton text="View">
  <MenuFlyout>
    <ToggleMenuFlyoutItem text="Show toolbar" />
    <MenuFlyoutSeparator />
    <MenuFlyoutSubItem text="Orientation">
      <RadioMenuFlyoutItem text="Portrait" groupName="orientation" isChecked />
      <RadioMenuFlyoutItem text="Landscape" groupName="orientation" />
    </MenuFlyoutSubItem>
  </MenuFlyout>
</DropDownButton>
```

Rust 也提供 `Scene::menu_flyout_item`、`toggle_menu_flyout_item`、`radio_menu_flyout_item`、`menu_flyout_sub_item` 和 `menu_flyout_separator` 工厂。更高级的属性、命令关联和原子更新使用同一 Scene API。

Toggle 默认未勾选；Radio 默认未选中，同名组在一个 Scene 内互斥，空组名也属于同一组。重复点击已选 Radio 保持选中，程序仍可主动取消。Scene 之间保持独立所有权；原生源码使用线程内选择表，本项目没有将不同 Scene 合并为同一个全局组。`areCheckStatesEnabled` 对应原生附加属性，在子菜单中显示直接 Radio 子项的选中标记。

快捷键使用公共运行时枚举 `KeyboardAcceleratorModifier`，不能传裸字符串。可以关联 `UICommand` / `StandardCommand`，继承未设置的标签、图标和快捷键，并使用已有同步 CanExecute/Execute 协商。禁用父项阻止其后代快捷键；分隔线和隐藏项不参与导航。菜单项的 `focus()` 在其 presenter 已打开时定位对应行。

## 示例与验证

开发服务中的入口：`/#menu-items`，以及 `/#menu-flyout-item`、`/#toggle-menu-flyout-item`、`/#radio-menu-flyout-item`、`/#menu-flyout-sub-item`、`/#menu-flyout-separator`。每个入口可查看五个可运行示例和对应的直接属性源码。默认 Canvas2D，WebGL2 由用户显式选择。

本批来源固定为 WinUI `7b12709347527238494ca28cb9fed326d513e779`；18 份上游文件及 Git blob / SHA-256 记录在 `references/menu-item-controls-sources.json`。单选圆点字形和字号由固定模板提取到 `references/menu-item-template.json`。基础菜单资源继续复用已有 `overlay-template.json` 和来源映射。API 对照：[Microsoft RadioMenuFlyoutItem](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.radiomenuflyoutitem)。

```powershell
python tools/fetch-menu-item-controls.py
python tools/extract-menu-item-controls.py
cargo test --locked --test menu_item_controls --test menu_layout --test overlays --test view_commands
./tools/run-menu-item-probe.ps1
cd gallery
npm run build
# 另起开发服务后，设置对应地址：
$env:WINUI_MENU_ITEMS_URL='http://127.0.0.1:5351'
npx playwright test -c playwright.menu-items.config.ts
cd ..
node tools/compare-menu-item-controls.mjs
python tools/analyze-menu-item-pixels.py
```

机器可读的最终结果、二进制指纹和当前匹配状态见 `references/menu-item-status.json`；原生记录见 `references/menu-item-native.json`、`references/menu-item-probe-run.json`，布局对照见 `references/menu-item-comparison.json`；合成截图的未缩放像素差异见 `references/menu-item-pixel-comparison.json`。

原生端为同 SDK 独立探针，采集浅色／深色的 Normal、PointerOver、Pressed、Disabled，以及图标／快捷键、RTL、长标签的默认／紧凑强制 VSM 状态；这些静态状态不代表 Store Gallery 的 Composition 材质或动画逐帧验收。RenderTargetBitmap 对窗口化菜单只能返回部分阴影，另行保留探针自身窗口的合成截图。几何检查、字形修正和浏览器交互通过不意味着逐像素一致，浏览器 Acrylic、字体栅格化和精确动画仍沿用现有差异边界。
