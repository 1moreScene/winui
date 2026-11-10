# SDK 通用滚轮与光标行为

滚轮接收与光标/文本选择策略由 Rust Scene 决定，普通 SDK 和 React 共用同一投影，不需要修改 Gallery 示例或调用方属性。

- `ScrollViewer`、`ScrollView`、`ScrollContentPresenter` 与共用滚动状态的集合控件：相应轴有可滚动内容时，在顶端/底端继续滚动仍返回 handled，不转交父容器或浏览器。空内容、禁用轴保持向上寻找可处理者；Ctrl+滚轮只进入缩放处理，不误改普通滚动偏移。触摸操纵的 chaining 属性保留原契约。
- 到达目标偏移后继续滚动，不重复启动已有滚动动画，不产生重复的偏移变更通知。
- 全局 DOM 滚动条：`scene_scroll_host` 返回 Rust `ScrollSnapshot` 中的逐轴 `horizontalWheelContained` / `verticalWheelContained`。宿主据此投影浏览器 overscroll containment，保留原生滚动与文本选择；尺寸变化后更新，卸载后移除。规则同时注入已接管的 Shadow DOM。
- `NodeSnapshot.pointer` 统一输出控件光标和文字选择策略。普通控件、label、header 使用箭头；TextBox/PasswordBox 的真实输入区域使用 I-beam；清除/显示密码按钮使用箭头；HyperlinkButton 与富文本链接使用手形。富文本根据源控件的 `isTextSelectionEnabled` 决定 I-beam，overflow 继承源控件策略，禁用控件回到箭头。ComboBox 的 `InputBox` 模板部件还必须读取 Rust 所有者的 `isEditable`：不可编辑的选择显示区使用箭头且不允许文本拖选，可编辑输入区使用 I-beam；不能将内部只读 TextBox 直接当成普通文本编辑器。普通只读 TextBox 仍允许文本选择。
- 浏览器宿主只应用 Rust 结果，阻止透明无障碍按钮、span 或宿主页 CSS 覆盖控件语义。输入、选区、IME、键盘焦点及无障碍 DOM 保留。

固定源码依据：`references/winui/ScrollViewer_Partial.cpp` 的 `OnPointerWheelChanged` 在内容可滚动时处理事件，不以本次偏移是否发生变化作为处理条件；`references/winui/TextBlock.cpp` 的 `OnSelectionEnabledChanged` 与链接光标处理区分默认箭头、I-beam 和 Hand；`references/winui/TextBox_Partial.cpp` 为 DeleteButton 设置 Arrow。

验证：

```powershell
cargo test --locked
cd gallery
npm run typecheck
$env:PW_CHANNEL='chrome'
npx playwright test tests/input-behavior.spec.ts tests/text-scroll.spec.ts tests/global-scrollbars.spec.ts tests/composed-scroll-scope.spec.ts --grep-invert 'Text templates compare border geometry' --reporter=line
```

新增 Rust 回归覆盖两轴的顶/底边界、嵌套所有权、空内容、禁用轴、Ctrl 缩放、宿主策略、标签/输入区/链接与禁用祖先、富文本链接命中和 overflow。浏览器回归覆盖五种滚动控件、浏览器外层滚动、DOM/Shadow DOM 动态与卸载，以及光标和实际编辑行为。主题切换测试辅助方法也等待 Rust 的下一帧点击投影，避免读取旧主题后再次点击而切回原主题。

本机缺少 `out/text-scroll-native/Light-TextBox.png` 等原生参考截图，已有静态边框像素对照测试因此无法执行；上面的行为回归命令明确排除此项。此修复未重新进行原生窗口逐帧对照。

2026-11-09 首轮验证结果：Rust 全量测试通过，新增 6 项 Rust 行为回归通过；当时 WASM 包的 23 项 Chrome 浏览器回归全部通过。`npm run typecheck`、WASM release 构建、Vite 生产构建、SDK 类型声明生成及枚举一致性检查通过。当时 WASM SHA-256：`302714173b41bf0f27e3ab9102490995e6f66debdfd7c2970aac04ea1e02c5be`。

同日跟进修正 ComboBox：上一轮仅检查标签及独立编辑器，遗漏了组合控件内部的编辑器部件。新增回归先在真实 Gallery 的 Font ComboBox 文本位置通过 `elementFromPoint` 复现 `role=combobox / cursor=text`，再验证 Rust 按 `isEditable` 决定 `editorCursor` 与 `editorTextSelection`；浏览器适配直接应用这两个值。官方 `ComboBox_themeresources.xaml` 的 `EditableText` 初始为 `Visibility="Collapsed"` / `x:Load="False"`，普通选择显示由 ContentPresenter 承担，对应上述语义。

跟进验证：42 项相关 Rust 测试通过，包括新增的模式切换、普通只读编辑器与禁用祖先回归。Chrome 和 Edge 的真实 ComboBox 文本位置专项均通过；Chrome 相关回归批次 22 项通过，另有一项旧跨页 F4 测试在 Frame 仍为 inert 时提前发键，补上等待转场完成后该项单独通过。WASM release、类型检查、Vite 生产构建及 SDK 声明已重新生成。当前 WASM SHA-256：`2eed9d994b6b66e978e24cb69c82912277d411d0b6021ef588675533b8b5b21f`。
