# 阶段 6.3：文本、密码与滚动

基准继续使用 Gallery `7360ac3`、WinUI 源码 `7b12709` 与匹配 WindowsAppSDK/WinUI DLL。默认 Canvas2D；React 直接传属性，同一 Rust 场景负责状态、布局、历史和绘制。

## 本批范围

- TextBox：普通/标题占位/只读自定义字体与 CharacterSpacing/多行四个官方示例；UTF-16 选择、方向、拖选/双击、键盘编辑、剪贴板、撤销重做、中文组合输入事务、MaxLength、清除按钮、原生派生光标闪烁和聚焦底边。
- PasswordBox：三个官方示例；自定义遮罩字符、Peek 按住显示并在释放/失焦时遮回、Hidden/Visible、PasswordChanged。事件不附带明文；密码仍通过显式 password 属性可读写。密码宿主不提供复制、剪切或公开撤销历史。
- ScrollViewer：官方 cliff 图片与六组选项；单内容布局、裁剪/变换、滚轮、方向键/Page/Home/End、拖动/箭头与轨道、程序 ChangeView、触摸平移与双指缩放、范围钳制、嵌套滚轮接收和焦点进入视口。[通用输入修正](input-behavior.md)使可滚动容器在边界继续接收滚轮，不传给父级或浏览器。缩放后的 Extent 和角落预留来自原生探针。滚动条轨道复用 Acrylic 渲染图，减少透明度时使用其原生 fallback。
- DOM 只提供实际编辑/IME/剪贴板、焦点和无障碍投影。文字、选择、光标、状态与时间线仍由 Rust 绘制。光标用定时唤醒，空闲时不常驻 RAF。编辑器卸载会释放输入和 document selectionchange 监听。

## 通用文字裁剪修复

根因：水平 StackPanel 传下 124.18 DIP 的自然宽度，Arrange 按物理像素缩成 124 DIP。CheckBox 在 Arrange 临时多换一行，而 Measure 的高度仍为 32 DIP，场景因此裁掉第二行。之前只在子节点 Arrange 向上取整，被父槽位的 min 再次压回。

现在自动 DesiredSize 在 Measure 就包含物理像素向上取整预算，并通过 Grid/StackPanel 向上传播；有限换行约束使用 Arrange 能保证的像素宽度。半像素边界使用稳定的舍入规则，防止浮点噪声让相差整数像素的两条边朝相反方向取整。Gallery 的内容高度可通过统一 `SceneView autoHeight` 跟随 Rust 测量，不为单个标签硬编码更大尺寸。测试覆盖 CheckBox、RadioButton、Button、TextBlock，DPR 1/1.25/1.5/2 和 14/19.5/28 字号。

显式 width/height、maxHeight、clip、ellipsis 仍是调用方的约束，不为隐藏裁剪而关闭裁剪或任意扩大固定尺寸。

## 原生与独立验证

`tools/run-native-probe.ps1 -Kind TextScroll` 使用匹配 SDK，记录 `references/text-scroll-metrics.json` 和 palettes。16 个 Light/Dark 强制状态测得文本框正文最小 32 DIP、标题区 27 DIP、padding 10/5/6/6、聚焦底边 2 DIP；本机 GetCaretBlinkTime 为 530 ms。滚动探针测得放大两倍时 Extent 从 1000×800 变为 2000×1600，viewport 仍为 400×266，并采集原生 ChangeView 时间样本。

浏览器证据：`gallery/tests/text-scroll.spec.ts`、`references/validation/text-scroll-comparison.json`、`references/validation/text-rounding.json`、`out/text-scroll/`。包含实际键入、粘贴/复制、键盘历史、CDP 中文组合输入（含外部更新取消）、密码按住显示、滚轮/键盘/拖动/触摸、焦点进入视口、缩放、主题、分数 DPR、两种后端和事件回调内销毁。Rust 独立测试在 `tests/text_scroll.rs`；`node tools/verify-scroll-material.mjs` 验证两个后端的实际滚动条 Acrylic 和减少透明度路径，证据为 `references/validation/scroll-material.json`。完整计数及构建检查见 `references/validation/results.json`。

这是自建探针的 forced-VSM / RenderTargetBitmap 和交互验证，不是 Store Gallery 发行版窗口逐帧验收；边框区域误差不代表正文、全部像素或合成材质相等。

## 未接受的等价性与后续依赖

- AutoSuggestBox 原生继承 ItemsControl，NumberBox 原生继承 Control，它们组合输入模板。建议列表与 Compact 步进浮出都依赖阶段 7 Popup 的根级合成、定位避让、外部点击关闭、键盘与焦点恢复。本轮暂缓这两个控件，不发布缺少浮层的半接口。
- TextBox/PasswordBox 的上下文菜单、选择浮出工具栏待同一 Popup 基础设施；Description presenter 显式报未实现。浏览器系统拼写服务/菜单与 Windows 原生外观不同。
- Unicode 组合字符不拆分，但完整 RTL、双向/连字文本的选择几何与字体 fallback 的像素等价尚未验收。候选窗锚点跟随宿主输入，Windows IME 候选窗口外观和读屏器端到端验收仍待完成。
- 触摸平移/缩放已实现；DirectManipulation 的惯性、弹性、触摸嵌套链和滚轮系统设置等价未完成。程序滚动采用本机 400 DIP ChangeView 的归一化轨迹，不能据此声称所有距离与设备的物理行为相同。
- 滚动条已执行模板的 400/500 ms 延迟、167 ms 扩缩、83 ms 淡入和 2 s 隐藏，但细部 hover/pressed 箭头缩放、角落分隔器、完整 native present-time 材质与动画尚待逐帧对照。
- 高对比度采用确定性资源，没有更改用户系统设置；完整阶段 6 仍未完成。

后续修正：内联按钮的真实平方尺寸/内部背景、分数 DPR 多行聚焦底边与全局滚动宿主已补齐，见 [全局滚动条与编辑器边框](global-scrollbars.md)。旧文中滚动条局部缺项不代表全局宿主未接入；跨 DOM Acrylic、Shadow ARIA 与原生平台自动遍历仍有明确边界。
