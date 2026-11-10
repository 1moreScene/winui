# InfoBar、PersonPicture、RatingControl、SplitButton、ToggleSplitButton

2026-11-09 更新：SplitButton 两个颜色示例与 ToggleSplitButton 列表示例已接入真实 Rust RichEditBox；下文提及 TextBlock 的内容为本批之前的历史边界。当前范围见 [RichEditBox](rich-edit-box.md)。

本批是五个控件的可运行切片，Rust 管理状态、布局、输入与绘制；TS 提供类型化控制器、事件和宿主投影；React 使用直接属性。默认 Canvas2D，WebGL2 仅显式选择。没有接受完整 WinUI、Store 发行版逐像素或逐帧等价。

## 入口与范围

| 控件 | Gallery | 已实现 |
|---|---|---|
| InfoBar | `/#info-bar`，3 个示例 | 四种 Severity、自动横向/纵向换行、图标/关闭按钮、正文和 action 插槽、CloseButtonClick、可取消 Closing、Closed、关闭原因 |
| PersonPicture | `/#person-picture`，1 个示例 | 照片等比填充圆形裁剪、姓名首字母、显式首字母、默认/群组图标、数字/字形/图片徽章、99+、图片共享与释放 |
| RatingControl | `/#rating-control`，2 个示例 | 未评分/部分评分/占位值、caption、maxRating、读写/禁用、点击与左拖清除、键盘/RTL、Font/Image 描述符及各状态回退 |
| SplitButton | `/#split-button`，2 个示例 | 主区 Click、次区 Flyout/MenuFlyout、按压/悬停/禁用/打开状态、内置 ChevronDownSmall、F4/Alt+Down、Space/Enter |
| ToggleSplitButton | `/#toggle-split-button`，1 个示例 | 仅主区切换、IsCheckedChanged 先于 Click、次区不改变选中值、官方 Flyout + 横向 SymbolIcon 按钮；另支持 MenuFlyout |

SplitButton 的嵌套 Flyout/MenuFlyout 自动绑定，无需业务代码处理原始句柄。高级用法支持 `setFlyout(surface)`、`openFlyout()`；跨 Scene 绑定被拒绝。销毁或迁移浮层会清理绑定，浮层内可以放交互控件，普通 Button 内容仍禁止嵌套交互控件。

### 浮层依赖核对与关闭按钮修复

两种 SplitButton 调用的都是另一会话实现的共享浮层：React `Flyout`/`MenuFlyout` → `scene.ts` 的 `FloatingSurface` → Rust `scene/overlays.rs` 的根级布局、呈现、关闭和焦点设施，没有另建浮层实现。

| 位置 | 官方依赖 |
|---|---|
| SplitButton 公共 Flyout 属性 | `Microsoft.UI.Xaml.Controls.Primitives.FlyoutBase`，见固定 `SplitButton.idl:20` |
| ToggleSplitButton 公共属性 | 继承 SplitButton，复用 FlyoutBase 属性；不是专门依赖 MenuFlyout |
| Gallery SplitButton 两例 | 普通 `Flyout`：第一例包含 GridView；第二例包含 VariableSizedWrapGrid |
| Gallery ToggleSplitButton 示例 | 普通 `Flyout`，包含横向 StackPanel 和两个 Button/SymbolIcon |
| 原生 Flyout 底层 | `FlyoutBase` 持有 Popup；`Flyout::CreatePresenter` 创建 FlyoutPresenter。MenuFlyout 是另一个 FlyoutBase 派生类，使用 MenuFlyoutPresenter |

此前 ToggleSplitButton 的 Gallery 示例误用了 MenuFlyout，已改成官方普通 Flyout 组合。SDK 仍可显式绑定 MenuFlyout；这是 FlyoutBase 类型允许的另一种用法。原生 SplitButton 的 OpenFlyout 用 ShowAt 的 BottomEdgeAlignedLeft 选项；已在共享浮层补充同名运行时枚举，SplitButton 打开时采用该定位、在根边界处避让。

### SplitButton 色板示例的未实现依赖

用户提供的官方截图中，第一色板是 **GridView + ItemsWrapGrid**。集合批已补齐这两个依赖并替换组合色板；现在由真实 GridView 容器提供留白、选中状态和方向键导航，内容使用官方 32 DIP 圆角色块。

第二色板已接入 **VariableSizedWrapGrid**，按官方 Horizontal / MaximumRowsOrColumns=3 布置九个颜色按钮，采用共享占位与换行算法。**RichEditBox** 仍未实现，TextBlock 不具备富文本选区、段落或颜色编辑能力，完整富文本流程尚未对齐。集合批验证与范围见 [集合控件](collections.md)。

色块遮住按钮本身是独立的绘制错误：原先边框先画、内容后画，且内容未限制在主区。已按模板将主区内容同时裁剪到主按钮矩形与外圆角，边框和分隔线在内容之后绘制；使用过大的彩色子节点验证其不能覆盖箭头或边框。当前色块恢复成原始 Border，并支持 Border `cornerRadii={[4,0,0,4]}` 的非对称背景/边框装饰。该属性不提供任意非对称子树裁剪。

InfoBar 关闭按钮消失来自未测量内部内容树；同时遗漏了模板中的 16 DIP Viewbox。现按实际 SDK 模板组合 Button → Viewbox → SymbolIcon，保留 38 DIP 按钮、Margin=5、16 DIP 图标容器以及本地 AppBarButton 画刷别名。Rust 必须测量包括内部关闭按钮在内的子树，开关/缩放后继续保留图形和命中区域。新增三档浏览器 DPR、四档 Rust DPR、关闭按钮独立区域及悬停/按下背景差分验证，证据在 `validation/infobar-close-chrome.json`；没有用整张 InfoBar 的平均误差代替图标存在和遮罩尺寸检查。

```tsx
import {InfoBar, PersonPicture, RatingControl, SplitButton, ToggleSplitButton, MenuFlyout} from './react';
import {InfoBarSeverity} from './index';

<InfoBar isOpen severity={InfoBarSeverity.Warning} title="Warning" message="Review this change."
  onClosing={e => { e.cancel = hasUnsavedChanges; }}/>
<PersonPicture displayName="Jane Doe" badgeNumber={3}/>
<RatingControl value={rating} onValueChanged={e => setRating(e.value!)}/>
<SplitButton text="Save" onClick={save}>
  <MenuFlyout menuItems={[{id:'copy', text:'Save a copy'}]} onItemInvoked={saveCopy}/>
</SplitButton>
<ToggleSplitButton text="List" isChecked={checked} onIsCheckedChanged={e => setChecked(e.isChecked === true)}/>
```

基础 SDK 对应 `scene.root.infoBar(...)`、`.personPicture(...)`、`.ratingControl(...)`、`.splitButton(...)`、`.toggleSplitButton(...)`；均支持 `properties`、`update`、`on`/取消订阅、`dispose`。InfoBar 的 `.close()` 同样经过可取消关闭；`.actionButton(...)` 创建原生模板默认尺寸的 action。公共封闭属性使用 `InfoBarSeverity`、`InfoBarCloseReason`、`RatingItemKind`、`FlowDirection` 运行时枚举；负向类型测试检查裸字符串及 `options={{...}}` 被拒绝。

## 原始依据与版本差异

- Gallery 固定 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`；本批复制并指纹记录 19 个页面/示例输入文件，运行的九个源码面板从实际 React 文件提取。
- WinUI 固定 `7b12709347527238494ca28cb9fed326d513e779`，25 个 C++/IDL/XAML 文件见 `references/compact-controls-sources.json`，下载字节与固定 Git tree 的 blob ID 独立比对。
- 原生探针使用实际解析的 Windows App SDK `2.5.4-experimental` / WinUI `2.3.10-experimental`。从该包的 `generic.xaml` 提取五个模板、默认样式、状态、资源和 70 个实测画刷（含关闭按钮的 12 个 AppBarButton 本地别名）。`compact-controls-template.json` 是本切片执行的资源描述，不是通用 XAML 执行器。
- **已证实源码/二进制差异**：固定 C++ 的 `CoercePlaceholderValueBetweenMinAndMax` 保留 0..1；该 SDK 原生实际 DP 把 0 和 0.5 归为 1。本切片采用同版 SDK 的观测值，写入 IR `observedBehavior`，保留原始输入和实际 DP，未假定发布标签等于二进制源码。
- PersonPicture 初次仅设置 Height=300 或 Width=150，实测仍是 96×96：初次 SizeChanged 取本地/默认两维的较小值；显式同时设置两维可放大，后续单维变更按 C++ SizeChanged 同步正方形。Gallery 保留原例 Height=300。
- PersonPicture/评分 caption 的 `TextLineBounds=Tight` 使用共享 cap-height 布局路径。99+ 的文字可能比徽章圆宽，按 BadgeGrid 的自然宽度重新居中圆形。
- 照片是官方 Gallery 使用的 Microsoft 文档媒体，来源和 SHA-256 在 `compact-controls-assets.json`，不把其许可冒称为 SDK 的 MIT。

## 验证与重现

```powershell
python -X utf8 tools/fetch-compact-controls.py
powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-compact-controls-probe.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-compact-controls-probe.ps1 -Details
cargo test --locked
cargo clippy --all-targets --locked -- -D warnings
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
node node_modules/@playwright/test/cli.js test --config playwright.compact.config.ts
```

主矩阵与补充矩阵分别保存到 `out/compact-controls-native`、`out/compact-details-native`。补充模式不会覆盖主矩阵的 references。两主题、125% DPI、真实控件截图、命名部件与实际 DP 均保留；浏览器每个后端重放同一批输入，检查布局和图像。`references/validation/compact-controls-*.json` 保存逐项误差，`compact-controls-status.json` 保存最终计数、工具结果与证据指纹。

SplitButton 内容裁剪修复后的记录：120 项 Rust、45 项浏览器测试通过（本批 11 项、共享回归 34 项）；严格 TS、Vite/声明构建、Clippy 和格式检查通过。112 个主矩阵加 16 个头像/关闭按钮补充案例，每个后端共 128 个；最大宽高误差 0.8001 DIP。逐项图像误差和图标/遮罩独立检查见 `compact-controls-status.json`、`validation/infobar-close-chrome.json`。125% DPI 两个主题、两个后端的悬停背景二值覆盖差分为 0；该特定采样结果不是完整像素或动画等价的判据。新增的 SplitButton 内容/定位测试不能代替尚未实现的 GridView/富文本示例验收。

浏览器测试实际验证可取消关闭、reopen、severity ARIA、action、图片解码、首字母/徽章、评分键盘/鼠标/清除/只读、Split 两分区、真实菜单、跨 Scene 拒绝、卸载和焦点黑框约定。独立 Rust 测试还覆盖三个主题绘制、自定义评分状态回退、RTL、原子更新、事件顺序和浮层迁移/销毁。

本批还修正了共享 Slider 的提示释放：依据 `Slider_Partial.cpp::PerformPointerUpAction`，释放和取消捕获时关闭，不因遗留键盘焦点立即重开；下一次键盘操作、拖动或重新进入可重新显示。回归测试分别检查拖动中显示和释放后隐藏，并新增独立 Rust 捕获取消/键盘重开验证。

## 尚未接受的范围

- RenderTargetBitmap 静态矩阵无法捕获 SplitButton 的 Composition AnimatedIcon 箭头。浏览器使用现有 Rust 内置源与状态时间线；本批静态截图/平均误差不构成箭头或发行版窗口的呈现时序验收。
- 字体栅格、分数像素、InfoBarPanel 高级布局仍有残差；大区域均值只能作为诊断，不能证明轮廓、文字或动画完全等价。评分 0 值问题就是逐张检查后发现并修正的例子。
- 评分原生 magnification 代码存在焦点参数更新边界，尚未以原生真实输入逐帧确认；不虚构放大动画。Gamepad engagement、Windows 声音与完整 UIA 未实现。
- InfoBar 自定义 IconSource/模板及 CloseButtonCommand 未实现；IconSource 原始协议输入会明确拒绝。自定义 action 用 React 插槽/SDK 控件表达。
- PersonPicture Contact/系统照片读取、系统语言的完整 Unicode 大小写和本地化无障碍字符串未完成。高对比度采用共享黑/黄 fixture，尚未对任意 Windows 高对比度配色验收。
- SplitButton 官方示例依赖的 RichEditBox 仍待实现，当前明确使用 TextBlock 预览；色板现已使用真实 GridView/ItemsWrapGrid 和 VariableSizedWrapGrid。任意模板、原生触摸/笔和 Store 动画/材质逐帧验收仍未接受。
- 本批没有重做整机 CPU/GPU、生产冷启动及输入到呈现延迟的完整基准；已有共享渲染性能记录不能推导这五个控件在所有设备上的性能保证。
