# Frame 页面闪回与共享呈现契约

2026-11-08。问题是缓存页面在导航完成后短暂重新显示，不是业务页面主动刷新。

旧 Rust 输出只包含当前动画轨道。在结束帧中旧缓存页消失于 `visuals`，而 React 宿主将缺失项回退为 opacity=1，等下一次异步 React commit 才隐藏它。按 Home → Button → Home → Settings → Button → Home 切换，旧产物捕获到 5 次这种帧状态不一致。

修复位于 `src/frame.rs`：对全部保留页输出完整呈现状态，隐藏缓存页持续输出 `visible=false / opacity=0 / interactive=false / zIndex=0`；可见层按时间线排序，返回早期缓存实例时不会受实例编号影响。`animating` 和交互状态由 Rust 时钟边界计算。转场配方、时间与缓存策略沿用现有原生来源。

TS/React 只投影这些字段。缺失或已释放项同步隐藏；React 每次 layout commit 重新读取 SDK 最新状态，避免主题更新、业务 rerender 或页面挂载用过时的 React snapshot 覆盖当前帧。透明入场页仍保留布局，支持 Canvas 在首次显现前初始化。没有添加浏览器专属时间线或延迟隐藏补丁。

`tests/frame_presentation.rs` 覆盖 Enabled/Required、Entrance/左右滑动/Suppress、150/450 ms 边界、缓存返回、快速导航、减少动画和 Disabled 页释放。浏览器测试 `gallery/tests/frame-flicker.spec.ts` 直接检查 SDK 通知时的 DOM 呈现状态，并用真实 React Frame + SceneView 在 Canvas2D/WebGL2 中验证缓存页最终像素、返回/前进、父组件 rerender、快速导航与减少动画。

构建入口为 `gallery/vite.frame-flicker.config.ts`，可用 `FRAME_FLICKER_WASM` 指向隔离的 wasm-bindgen 输出。浏览器入口为 `gallery/playwright.frame-flicker.config.ts`；`FRAME_FLICKER_ROOT` 选择生产产物，`PW_CHANNEL` 可选 chrome/msedge，`PW_BROWSER` 可选 webkit/firefox。结果及源码、WASM 指纹记录在 `references/frame-flicker-validation.json`。

Rust 核心契约不分平台与渲染后端。浏览器验证发生在本机 Windows；它不代表已在 macOS/Linux 或所有 GPU 驱动上实测。

本轮结果：旧产物 5 次闪回；修复产物 Chrome 328、Edge 314、WebKit 51 个 SDK 通知样本均为 0 次。三者各 3 个测试通过，覆盖两种渲染后端；原有导航/展开/材质回归 13 项通过。修复 WASM 已安装到默认 `gallery/src/wasm`，默认生产首页也再次通过闪回检查，TypeScript strict 和 Vite 生产构建通过。Firefox 安装了所需版本后仍因本机 `spawn UNKNOWN` 无法启动，不计为通过。

工作区同时进行的 picker 模板尚缺 paint/input 模块和方法，阻塞当前目录全量 Rust 构建。本轮保留这些改动，在 `out/frame-flicker-source` 冻结可编译的源快照，覆盖当前真实 `src/frame.rs`，249 个 Rust 测试全部通过，并用此源码构建和验证 WASM；没有用桩替代 Frame。该隔离验证不代表未完成 picker 模板通过验收。完整来源、排除范围和 WASM SHA-256 见验证 JSON。
