# NavigationView 滚动条与 Frame 宿主接管

2026-11-08。用户报告嵌套 Frame 示例导航期间露出浏览器滚动条，首页菜单只有滚轮而没有 WinUI 滚动条，并要求验证页面转场是 SDK 的通用能力。

## 根因与实现

全局接管原先排除 `[inert]` 子树。Rust Frame 在转场中禁止页面交互，宿主投影为 inert，导致全局接管删除绑定及隐藏浏览器滚动条的标记，直到结束帧才重新接管。另一个首帧窗口来自 MutationObserver 将发现新滚动面延迟到下一个 rAF：React 若在当前 rAF 提交，新滚动面可能先绘制一次原生滚动条。

`gallery/src/global-scrollbars.ts` 现在在首次取得作用域以及 MutationObserver 的绘制前阶段同步发现和标记滚动面；inert 不再解除接管。全局 Rust ScrollViewer 投影继承 DOM 祖先的透明度与交互状态，跟随 Frame 位移、裁剪和淡入淡出。inert 页面仍无法拖动滚动条。原生 DOM 保持滚动和业务内容所有权，卸载仍恢复浏览器 chrome。SDK 默认初始化和 React Provider 都使用同一机制，无需示例手动安装。

首页 NavigationView 原先只计算菜单偏移和裁剪，没有绘制或命中滚动条。因此全局 DOM hook 无法补上：Canvas 导航内部没有 DOM overflow 滚动面。

`src/navigation_scroll.rs` 把菜单和原生 Canvas 内容的两个模板滚动面接到现有 `scene::scroll::ScrollState`。共享 ScrollState 现在直接提供滚动条绘制、Thumb 命中/拖动、轨道/按钮翻页和重复请求，Scene ScrollViewer 与 NavigationView 复用这些方法；自动隐藏、展开、颜色与 Acrylic 继续使用已有原生资源和 Rust 时间线。Rust 输出 scrollbar 几何、偏移、最大值、透明度与下次唤醒时刻。独立 NavigationView 和共享 Scene 的 Canvas2D/WebGL2 共用同一绘制输出，TS 只增加透明的 ARIA/input 投影。静止时通过 Rust deadline 唤醒自动隐藏，不持续轮询。

页面动画沿用 `src/frame.rs` 的公共时间线。对此前已验证产物实际点击 Downloads，记录到入场页 140 DIP → 0 的连续位移，同时也记录到动画期间 scrollbar-width=auto。不能把动画轨道存在等同于实际页面正常，本轮对实际示例逐帧检查，并增加完全不引用 Gallery 组件/样式的独立嵌套 React Frame，用 Entrance/左右滑动分别验证中间位移、结束帧和全局接管。没有为示例添加 CSS 转场或页面专属时间线。

## 验证入口

- `tests/navigation_scrollbars.rs`：菜单溢出、共享 Thumb 绘制、hover/展开、拖动、按键、取消、模式/尺寸变化与隐藏。
- `gallery/tests/navigation-host.spec.ts`：示例逐帧动画与原生滚动条零暴露、新 inert DOM 绘制前接管、独立嵌套 Frame，以及公共 Scene NavigationView 两种后端的滚动条交互。
- `gallery/playwright.navigation-host.config.ts`：生产产物回归；`NAV_HOST_REGRESSION=1` 加入 Frame、导航材质/展开和全局滚动条原有回归。

构建和测试结果、源码与 WASM 指纹见 `references/navigation-host-validation.json`。浏览器测试运行在本机 Windows；这不等同于所有操作系统和 GPU 的实测，也不构成完整原生 WinUI 像素对齐声明。

最终产物：Chrome 28 项完整回归、Edge/WebKit 各 6 项新增检查，以及默认生产入口 5 项检查，共 45 项通过。三浏览器示例逐帧记录均为 0 次原生滚动条暴露，并记录到可见页面的中间位移。TypeScript strict、声明生成、当前工作区完整 WASM release 和两种 Vite 生产入口构建通过。SDK、独立验证产物与默认生产产物的 WASM SHA-256 一致，原有 `62145` 预览地址已切换到新产物。

Rust 回归中仍有另一项 picker 模板测试失败：`five_picker_templates_measure_paint_and_release_all_private_children` 报未知字段 `textAlignment`。明确排除此项后的 256 项回归通过；随后新增的 3 项 NavigationView 滚动条测试也通过。本轮没有修改 picker 模板来掩盖此失败，不把它计为通过。
