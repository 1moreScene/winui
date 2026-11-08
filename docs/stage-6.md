# 阶段 6：基础控件与选择控件

日期：2026-11-07。阶段 6 已开始，当前推进到 6.7；尚未完成整个阶段。Rust SDK 位于根目录，Gallery 继续使用 React + strict TypeScript + Vite，并复用同一公共 SDK。

6.3 增加 TextBox、PasswordBox、ScrollViewer 以及共享文字测量取整修复。具体行为、原生探针、宿主边界和浮层延期理由见 [文本与滚动记录](text-scroll.md)。

## 可运行范围

| 页面 | 本批实现 | 未完成部分 |
| --- | --- | --- |
| [ToggleButton](http://127.0.0.1:5173/#toggle-button) | 官方 1 个示例、禁用选项与 Output；二态/三态、checked 通知、ClickMode、内容组合 | 完整通用模板覆盖仍按控件验收 |
| [CheckBox](http://127.0.0.1:5173/#checkbox) | 官方全部 3 个示例：二态、三态、Select all；浅色/深色/确定性高对比度资源、真实键盘与指针 | 已迁移源矢量路径与 marker 片段；AnimatedIcon 队列/中断策略及发行版逐帧对照未完成 |
| [TextBlock](http://127.0.0.1:5173/#textblock) | 官方前 2 个示例；类型化 FontStyle、共享测量/绘制、可访问文本 | CharacterSpacing、Run/Span/Bold/Underline 等内联结构、文本选择及其余示例 |
| [Image](http://127.0.0.1:5173/#image) | 官方本地图片、Stretch 示例；None/Fill/Uniform/UniformToFill、图像区域裁剪、可访问名称 | DecodePixelHeight API、NineGrid、SVG 官方示例/对照、GIF 播放及加载/失败事件 API；缩放解码/滤波质量差异仍存在 |

| [RadioButton / RadioButtons](http://127.0.0.1:5173/#radio-button) | 6.2：官方两个示例、独立命名组/同父组互斥、列优先分组布局、方向键、单个 Tab 入口、不可变 selectedIndex 通知 | 自定义 item template、任意 React 子项、完整原生 UIA 与逐帧动画验收 |
| [ToggleSwitch](http://127.0.0.1:5173/#toggle-switch) | 6.2：简单与自定义 header/content 示例、Toggled、Space、滑块拖动、取消与禁用、三主题和减少动画 | 6.4 已补齐第二示例的 ProgressRing；完整 Composition 中断与逐帧验收 |

源码面板从运行中的标记范围提取，官方 XAML 从固定提交提取。导航首页及公共侧栏均加入入口，正常开发继续复用 5173。

## CheckBox 动画速度修正

修复曲线提取器将 `_cubicBezierEasingFunction_0` 缓存引用误识别为线性的错误；勾选恢复原生缓出曲线，取消保持原曲线。SDK 实际 Duration / markers、原生前台逐帧采样与浏览器回归见 [动画时序记录](checkbox-animation-timing.md)。精确呈现时序与像素仍未验收。

## 本次接口与渲染修正

Gallery 全部页面默认 Canvas2D；WebGL2 为显式可选项。React 控件使用直接属性，例如 `<TextBlock text="Hello" />` 和 `<Button text="Save" onClick={save} />`；源码面板从迁移后的真实代码提取。CheckBox 现在复用 `AnimatedAcceptVisualSource.cpp` 的矢量路径和 marker 片段，取代纯字体图标。发行版完整外观、材质、动画仍未验收，详细来源与限制见 [release-audit.md](release-audit.md)。

## Rust lint 诊断

用户贴出的 E0308 均涉及 `vec!`、`format!`、`matches!` 等宏表达式被分析成 `()`。原工程在 Rust 1.89 下通过 `cargo check --all-targets --locked`，但本机 VS Code 的 rust-analyzer 0.3.3073 对同一工程报告宏解析及类型推断错误；使用本机已安装的 Rust 1.95.0 后，同一 analyzer 扫描通过。

新增 `rust-toolchain.toml`，在仓库固定 1.95.0、rust-src、Clippy、rustfmt 与 wasm32 目标，统一编辑器、构建和测试环境。没有改动用户的全局默认工具链，没有关闭 E0308 或用 allow 隐藏错误。当前 `rust-analyzer diagnostics . --severity error` 退出码为 0。脚本和结果：`tools/check-rust-analyzer.ps1`、`references/validation/rust-analyzer.json`、`out/lint/rust-analyzer-fixed.log`。

若 VS Code 仍显示旧进程的诊断，执行一次 **Rust Analyzer: Restart server**，使其重新读取仓库工具链。

## 状态、事件及生命周期

- ToggleButton/CheckBox 的 `isChecked` 为 `boolean | null`，默认 false；`isThreeState` 默认 false。开启后，用户操作依次为 false → true → null → false。显式赋 null 在二态模式也有效，下一次操作回到 false。
- 状态由 Rust 持有。Checked/Unchecked/Indeterminate 在 Click 之前通知；程序更新也产生状态通知，重复同值不通知。`event.isChecked` 保存事件发生时的值，连续多次输入合并到一帧时不会读成最后一次状态。
- 复用 Button 的命中测试、指针捕获、拖出取消、Space 按键释放、重复键抑制、禁用/失焦取消及销毁机制。ToggleButton 接受 Enter；CheckBox 默认忽略 Enter，二态时支持数字键盘 Add/Subtract 设置 true/false。
- 事务先验证再提交，非法批次不会更改 checked 状态或发送通知。内容可以组合 Grid/TextBlock/Image；交互控件不能嵌套到按钮内容中。React StrictMode、后端重挂载与 Select all 的旧 controller 引用已实际验证。
- 同时修复减少透明度策略更新的时钟锚点：在配置变更时启动材质轨道，避免等到下一帧才启动；通过“中间不绘制、时钟直接跳进”的 Rust 和浏览器回归。
- 保留真实焦点和无障碍语义：CheckBox 投影 `role=checkbox`、`aria-checked=mixed`，ToggleButton 使用 `aria-pressed`。全局焦点黑框例外继续有效。

## 字体与图片

自动宽度按物理像素向上取整，避免把自然文本宽度缩短成两行后裁掉；已覆盖分数字宽的 Rust 回归和实际浏览器自动宽度检查。

测量、Canvas 和 GPU 使用相同的 FontStyle 与字体回退列表。Canvas 小字号的 font-box 指标存在整数化，现通过放大同一文字、保留相同 fallback 字形再归一化，恢复分数基线；字符宽度仍使用目标字号测量，不以放大的宽度代替实际字距。固定原生探针的 Segoe UI/Comic Sans MS 14px 样本，字宽与基线误差均小于 0.02 DIP。字形栅格化尚未等价，不能将指标通过算作像素通过。

Image 的 None 模式保留原始大小、按本批原生示例从左上角裁剪；Uniform 等比完整显示，UniformToFill 等比铺满并裁掉中心两侧多余区域，Fill 直接伸展。裁剪在 Rust 显示列表中执行，两后端共享。解码仍由浏览器宿主提供，Rust 保存资源尺寸并执行布局、绘制及图像资源使用关系。

## 实测与证据

完整回归为 **82 项 Rust、89 项浏览器测试**；strict TS（含错误枚举/布尔值负例）、宿主及 WASM Clippy `-D warnings`、fmt、枚举检查、WASM/Vite/SDK 声明构建和 rust-analyzer 扫描均通过。原阶段 1–5 的回归继续保留。

发行版来源审计见 [release-audit.md](release-audit.md)。Store Gallery 3.0.4 的两个关键 WinUI DLL 与探针完全相同；独立探针矩阵不是发行版页面截图，不证明 Composition 或动画等价。

原生探针使用固定 Windows App SDK 2.5.4-experimental / WinUI 2.3.10-experimental。控制状态通过真实模板 VSM 采样，浏览器通过真实指针/键盘驱动；二者统一 1000×500 DIP、DPR 1 和主题。高对比度使用显式黑/白/黄资源 fixture，不修改系统设置。

- 2 个选择控件 × 3 个主题 × 3 个 checked 值 × 4 个交互状态，共 72 个原生状态，在两后端形成 144 个裁剪比较。使用整控件平均 RGB 通道差预算 4/255，glyph 区域另行记录，仅作探针差异诊断，不接受发行版或原生像素等价。
- 原生 AutomationPeer 验证三态顺序与状态通知先于 Click；Rust 回归直接使用独立的原生结果。浏览器验证 Enter/Space、禁用、Select all、三态及后端切换。
- 4 个 Image stretch、2 个字体样本在两个后端比较。None 像素误差约 0–0.044/255；缩放 JPEG 约 5.66–7.20/255，斜体字形仍有不同程度的栅格化偏差。保留实际差异，不把滤波、字体和 AnimatedIcon 纳入像素等价验收。
- 最新精确数值、环境和文件指纹见 `references/stage-6.json` 与下列 JSON；性能数据为本机生产构建测量，不代表跨设备保证。

| 内容 | 位置 |
| --- | --- |
| 固定 Gallery 25 个源文件（含共享示例容器） | `references/gallery-foundation/`、`references/gallery-shared/`、`gallery/src/official-foundation.json` |
| 选中控件 C++ / XAML | `references/winui/ToggleButton_Partial.cpp`、`CheckBox_Partial.cpp`、两个 `_themeresources.xaml` |
| 字体、图像源实现 | `references/winui/TextBlock.cpp`、`imagebase.cpp`、`imagebrush.cpp` |
| 24 个视觉状态、资源和原生画刷 | `references/selection-template.json`、`foundation-palettes.json`、`tools/extract-foundation.py` |
| Native 行为与静态对照 | `references/validation/native-selection-behavior.json`、`selection-comparison.json`、`image-text-comparison.json` |
| 原始探针与截图 | `out/foundation-native/`、`out/foundation/`、`tools/native-navigation/FoundationProbe.cs` |
| 公共 API / 实际运行示例 | `gallery/src/scene.ts`、`react.tsx`、`BasicControlsPage.tsx` |

```powershell
./tools/run-native-probe.ps1 -Kind Foundation
# 更新画刷 fixture 后运行提取器；不修改官方参考仓库。
Copy-Item out/foundation-native/foundation-palettes.json references/foundation-palettes.json
python tools/extract-foundation.py
./tools/prepare-baseline.ps1
node tools/verify-baseline.mjs --local
./tools/check-rust-analyzer.ps1
cargo test --locked
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
node node_modules/playwright/cli.js test
cd ..
node tools/benchmark-effects.mjs
node tools/collect-validation.mjs
node tools/record-stage-6.mjs
```

原生 runner 只关闭自己创建的进程。当前启动并保留的开发服务为 5173，性能工具只使用自己管理的 4175 preview。

## 下一批依赖和成本

阶段 6.3 已加入 TextBox、PasswordBox、ScrollViewer 的可运行与独立验证切片。早期 InputProbe 宿主原型已在 2026-11-08 清理，诊断改用真实 TextBox。AutoSuggestBox、NumberBox 暂缓到阶段 7 Popup 基础设施之后；原生逐帧、复杂文字选择与 DirectManipulation 惯性等未完成范围见 [文本与滚动记录](text-scroll.md)。CheckBox 的 AnimatedIcon 调度、TextBlock/Image 其余高级能力继续登记为未完成。

## 6.2 的样式修正与原生对照

核对了 Store 签名的官方 Gallery 3.0.4.0 的 RadioButton、ToggleSwitch 页面；窗口身份与截图单独记录在 `references/validation/selection-input-release.json`。与既有审计一致，匹配 SDK 探针用于资源和静态状态诊断，发行版实际页面用于示例组织与可观察样式复查，两者没有混作同一种证据。

本次修正：

- Canvas2D 公共圆角路径改为真正圆弧。原先二次贝塞尔角在半径达到半宽时仍画出偏方的圆，影响 RadioButton、ToggleSwitch 轨道与滑块。填充按原生 Shape 的描边中心线内缩，避免重复边缘覆盖导致蓝环变厚、中心白圆偏大。
- RadioButton 外圆 20 DIP、默认中心圆 12 DIP；悬停、按下与禁用分别使用模板尺寸，中心圆描边读取原生渐变画刷。未选中按下的小圆独立执行模板轨道。
- RadioButtons 取回默认 120 DIP 最小项宽；本机匹配 SDK 实测列距 7、行距 8、单行标题区 27 DIP。自然宽度按 DPR 向上取整，避免标签换行被裁切。多列不等长时按实际列位置导航。
- ToggleSwitch 轨道 40×20、默认滑块 12×12；按下滑块拉宽及其锚点与模板分离。颜色、透明度、尺寸和位置轨道分别执行，反向切换从当前呈现值继续。
- 原生资源实测 Faster/Fast/Normal 为 83/167/250 ms，曲线 `[0,0,0,1]`；Reposition 通过原生 AnimationMetrics 读取本机 367 ms 与曲线 `[0.1,0.9,0.2,1]`，不以任意常量替代。该参数核对不代表呈现时间等价。
- RadioButton 运行示例的列间距、输出文本、初始绿色及输出区域随分组自然宽度收敛；源码面板读取正在运行的直接 React 属性示例。

32 个原生静态状态在 Canvas2D/WebGL2 上形成 64 项比较，输出 `references/validation/selection-input-comparison.json`。除整控件预算外，单独检查非空白 glyph 区域；浅色默认选中圆另比较每行蓝环覆盖，防止大面积背景稀释圆角错误。当前 Canvas2D 行轮廓最多差 1 像素，WebGL2 最多 2 像素，保留实际字形和抗锯齿差异。所有像素/发行版完全等价标志仍为 false。

新增 Rust 回归覆盖：组互斥与通知顺序、跨父命名分组、方向键与重排、禁用项、分组项替换/释放、批次容量原子性、Space/Enter 策略、拖动取消、连续反向时的呈现连续性及减少动画。浏览器实际验证焦点、ARIA、受控属性、后端重挂载和运行源码。

```powershell
./tools/run-native-probe.ps1 -Kind SelectionInput
Copy-Item out/selection-input-native/input-palettes.json references/input-palettes.json
# timing/easing/reposition/group-metrics 同样来自对应探针输出并保留在 references/。
python tools/extract-input-controls.py
./tools/test-rust.ps1
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
node node_modules/playwright/cli.js test
```

## 6.2 抗锯齿修正

小型圆环、开关轨道与滑块改为局部 4× 矢量采样，并按实际物理像素边界缩小合成；文字仍直接按显示 DPR 绘制。Raster 使用可复用的小型局部表面，单次最多 1,048,576 个采样像素，超预算退回直接矢量绘制。没有把整个页面放大再缩小，也没有改动控件尺寸、主题或动画时长。

宿主适配改用 ResizeObserver 的小数尺寸，避免 clientWidth/clientHeight 提前取整。Canvas 的 CSS 尺寸与 backing/DPR 对应，消除 ceil 分配后又缩放到原 CSS 大小的二次拉伸。Scene、独立 NavigationView 和显式 WebGL2 使用同一尺寸约定；GPU 投影与合成也按实际 backing 范围计算。增加物理尺寸与 resolution 媒体监听，并在释放时解绑。

独立测试使用自建 Chrome 上下文，覆盖 DPR 1、1.25、1.5、2、带小数的宿主宽高、分数位移、点击、动态 viewport/DPR 与释放。32×32 数值积分计算理想圆的像素覆盖，检查圆环和开关白色滑块，既不复用 Canvas path 作为期望值，也不把整图空白平均误差作为圆弧质量指标。125% 缩放的圆环平均覆盖误差由 10.67% 降至约 2.01%。这项数学参考诊断不等于原生像素或动画呈现验收。

CDP 仅修改 deviceScaleFactor 时，本机 Chrome 会更新计算值，但不发送真实的 resolution change 事件；动态切换测试同时模拟相应 viewport 变化。实际用户窗口的跨屏视觉效果仍未直接验收。完整报告见 [抗锯齿验证](antialias.md)。

## 6.3 宿主增补

已修正 TextBox/PasswordBox 内联按钮的平方命中区与内部背景遮罩，以及多行输入在 125% DPR 的聚焦底条变细。全局滚动条默认随 SDK 应用初始化接入；DOM 内容由原宿主管理，滚动条几何/输入/动画/遮挡裁剪复用 Rust ScrollViewer。原生 24 组对照、宿主 API、应用范围与材质 fallback 限制见 [全局滚动条记录](global-scrollbars.md)。


## 6.4 进度控件

新增 [ProgressBar](http://127.0.0.1:5173/#progress-bar)、[ProgressRing](http://127.0.0.1:5173/#progress-ring)：共享 Rust 范围属性、主题资源、源时间线、双后端圆弧、四个实际 React 示例和只读 ARIA。ToggleSwitch 的 Working 示例现在使用真实 ProgressRing。控件细节、116 个原生冻结区域对照和验收边界见 [进度控件](progress.md)。确定进度示例暂用宿主数值输入，NumberBox 仍依赖阶段 7 Popup；阶段 6 整体尚未完成。

全局滚动条默认随 `WinUI.create()` 自动接入，React Provider 自动复用，业务方无需额外安装。显式安装方法只用于额外作用域、租约管理或关闭默认接入后的手动启用。


阶段 6.5 新增 [RepeatButton](http://127.0.0.1:5173/#repeat-button) 和 [Viewbox](http://127.0.0.1:5173/#viewbox)，包含 Rust 计时、缩放与布局裁剪、两个 React 示例及原生对照。实现范围和剩余差异见 [RepeatButton / Viewbox](repeat-viewbox.md)。阶段 6 整体尚未完成。

阶段 6.6 新增 Border、Canvas、HyperlinkButton、Expander、InfoBadge，并修复 ProgressBar 端点和细条采样。运行入口、对照方法与剩余差异见 [五控件记录](five-controls.md)。


6.7 修正 InfoBadge 官方组合的图标留白、Symbol 来源与 Dot 对齐，并加入 FontIcon、SymbolIcon、PathIcon、BitmapIcon、ImageIcon 五个切片与六个官方 IconElement 示例。来源、原生矩阵、API 和剩余范围见 [图标记录](icons.md)。

6.8 扩展图标源、局部镜像、官方 BitmapIcon 初始状态和 SVG 素材；新增七种 AnimatedIcon 内置源、Rust 状态队列和 NavigationView 集成；下一批五个切片为 Rectangle、Line、Path、Polygon、Polyline。独立 Composition 冻结帧、Shape 显式尺寸矩阵和未验收范围见 [6.8 记录](animated-icons-shapes.md)。
