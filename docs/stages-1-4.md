# 阶段 1–4 交付与验收

日期：2026-11-07。按 implementation-roadmap.md 的阶段出口完成本批；“完成”指本批要求的可运行闭环，不代表完整 WinUI 功能、原生逐像素或逐帧等价。

| 阶段 | 已交付的出口 | 主要证据 |
| --- | --- | --- |
| 1：基准与对照 | 固定 Gallery/SDK/WinUI；22 个源码文件及 36 个本机来源/产物指纹；可重复的静态与动画采样工具 | references/baseline.json、tools/run-native-probe.ps1 |
| 2：通用控件树与 SDK | 同一场景组合 Text、Button、NavigationView；稳定身份、布局/绘制失效、原子更新、父子迁移、事件、释放；TS 和 React 共用实现 | src/scene/、gallery/src/scene.ts、gallery/src/react.tsx |
| 3：布局、文字、GPU | Measure/Arrange、最小/最大尺寸、边距、内边距、对齐、Grid/StackPanel；Unicode 换行/截断、字体测量、仿射变换、嵌套裁剪、隔离透明度；WebGL2 和 IME 宿主实测 | rendering.spec.ts、stages.spec.ts、gpu-comparison.json |
| 4：Button | 标准/强调/轻量三种样式，四种状态，真实指针/键盘、组合内容、TS/React/Gallery 示例及原生对照；NavigationView 回归保留 | ButtonPage.tsx、button-parity.spec.ts、button-comparison.json |

机器可读状态：references/stages-1-4.json。30 项 Rust、21 项浏览器回归通过；native 与 wasm32 Clippy -D warnings、fmt、枚举一致性、strict TS、Release WASM/Vite/公共声明通过。

## 运行和页面

```powershell
cd gallery
npm ci
npm run build
npm run dev
```

- NavigationView：`http://127.0.0.1:5173/`
- Button：`http://127.0.0.1:5173/#button`
- 组合、GPU 和输入宿主：`http://127.0.0.1:5173/#foundation`

已有开发服务时直接使用；测试复用它，不再占用第二个 5173。Rust 修改后执行 `npm run build:wasm`，完成标记触发 Vite 的 glue/WASM 一致重载。

## 场景与 SDK

同一个 scene 只有一个可见 Canvas。Rust 保存全部节点、父子关系、控件状态和布局；TS 保存包装对象、业务回调以及浏览器宿主资源。不同 Gallery 示例可以使用不同 scene。旧 `ui.navigationView(host, options)` 保持兼容；组合页面使用 `scene.root.navigationView(options, layout)`，内部仍调用同一个 Rust NavigationView。

```ts
import { WinUI, ButtonVariant, Orientation, PaneDisplayMode } from './src/index';

const ui = await WinUI.create();
const scene = ui.scene(host);
const panel = scene.root.stack({ padding: [16,16,16,16], spacing: 12 });
const caption = panel.text({ text: 'Ready · 中文' });
const save = panel.button({ text: 'Save', variant: ButtonVariant.Accent });
const nav = panel.navigationView({
  paneDisplayMode: PaneDisplayMode.Left,
  items: [{id:'home',text:'Home'}],
}, {height:220});
const off = save.onClick(() => scene.batch(() => {
  caption.update({text:'Saved'});
  nav.configure({header:'Saved'});
}));
// off() 取消订阅；scene.dispose() 一次释放整棵树，重复调用安全。
```

`Scene.batch` 只包含属性更新，校验失败整体回滚；创建、迁移和销毁不能放进该事务。事件在 Rust 调用返回后分发，事件内更新排队；若批次目标在回调中被销毁，该待执行批次整体丢弃。销毁后不再执行后续监听器。`SceneNode.moveTo` 检查所有权、环、深度和 Button 交互内容约束，父节点销毁会使全部子包装对象失效。

公共入口只导出控件类型与工厂；常规代码不构造内部包装器，不接触节点协议。声明生成剔除内部方法/句柄。有限取值从同一枚举定义生成，裸样式、布局、后端、ClickMode、对齐和截断字符串均有编译负例。

React 通过 `SceneView`、`Grid`、`StackPanel`、`TextBlock`、`Button`、`Image`、`SceneNavigationView` 组合。示例实际运行源位于 ButtonPage.tsx，源码面板直接读取该文件，不维护另一套示例。具体最简和高级用法见 api.md。

## 渲染与文字实测

Canvas2D 是参考路径；WebGL2 由 Rust 执行共享显示列表，包含圆角/渐变边框、形状、图像、文字纹理、仿射变换、stencil 嵌套裁剪和 framebuffer 隔离组。字体使用同一浏览器字体栈，先测量实际 run，再按当前 DPR 栅格化并上传；没有将整个 Canvas 场景作为 GPU 贴图冒充渲染。文字位置、折行与最终纹理采用同一组测量结果。纹理按实际前景色生成 RGBA，并将颜色纳入缓存键，保留彩色 Emoji；四档 DPR 同时检查彩色字形及原 Gallery 图片按钮，避免全图平均误差掩盖局部错误。字体完成加载时清缓存并重新布局。

实际 renderer 为 NVIDIA GeForce RTX 4070 Ti SUPER / ANGLE D3D11。DPR 1、1.25、1.5、2 的 Canvas/GPU 布局数据相同；截图平均通道差为 0.031–0.814/255。重叠蓝色区域的隔离组透明度为 0.5，两后端得到同样的约 (128,128,255)，并验证了仿射嵌套裁剪、尺寸变化、设备丢失/恢复后状态和交互保留。

修复了 React 增量挂载或 framebuffer 复用时的纹理反馈冲突：即使 shader 的 uniform 选择形状分支，活动 sampler 仍不能绑定当前渲染目标；绘制形状和 stencil 时明确解绑。Gallery 后端切换已作为回归，不能只用一次性静态树代替验证。

IME 使用明确命名的 `InputProbe`，它是浏览器 textarea 宿主可行性载体。Chromium CDP 触发真实 composition 事件，验证“中文”草稿不提前写入 Rust、提交后同步、焦点、可访问名称、选区和锚点矩形。真实 Windows 候选窗外观及屏幕阅读器验收尚未完成；完整 TextBox 属于阶段 6。

## Button 原生对照

固定 SDK 与原生探针相同：WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental；1000×500 DIP、DPR 1、Segoe UI，状态已稳定。3 主题 × 3 样式 × 4 状态共 36 项。原生使用加载后 VSM fixture，浏览器使用真实 pointer move/down 与 enabled 属性；另用 computer-use 实际点击原生按钮、空格激活、拖出取消，计数 1→2→3 后拖出没有增加。

36 项 Button 外框边界误差均为 0 DIP。对按钮及周围 4px 的局部区域计算，平均通道差 0.363–2.592/255，仍有字体、圆角边缘栅格化差异，未接受像素等价。该局部统计与 NavigationView 全图统计不能直接比较。

边框渐变移植了原生的 `MappingMode=Absolute`、相对反向变换和两个 stop，不能只复制颜色后按整个按钮高度拉伸。背景 BrushTransition 从固定模板提取 83ms，并从中断时当前颜色重定向。ButtonBase 的 Release/Press/Hover、拖出再进入、捕获丢失、焦点丢失、禁用切换、Enter/Space 释放激活和重复 keydown 抑制均有回归。

高对比度使用双方相同的黑/白/黄资源 fixture，未修改系统设置，也未证明全部用户自定义系统主题。焦点黑框是用户指定例外：CSS 与 Rust 均不绘制，真实焦点和键盘行为仍保留。Flyout、通用 XAML 模板和 Windows ICommand/automation peer 系统接入按后续依赖推进，不属于本阶段的 Button 闭环。

## 性能与限制

三轮生产构建、Chrome 新 context、禁用浏览器缓存的本机采样：WASM 初始化 10.3–11.7ms；组合页面 ready 119.0–256.6ms；pointer 到通知 3.3–23.6ms。GPU 场景每轮更新约 60 帧，同步 frame P95 2.4–2.6ms。Release WASM 1,118,612 bytes，Node gzip 274,127 bytes。

同步 frame 包含 WASM、绘制提交和 DOM 投影，不是 GPU 执行时间。fence 三轮均完成，轮询值只是队列完成的时间上界。没有把 JS heap 估值当作进程 RSS、WASM/GPU 内存总量；未清 OS 缓存，也未测原生精确帧耗时。源数据和边界见 production-performance.json。

原生动画采样工具保留实际起止时间。RenderTargetBitmap 单次约 150ms，不能把请求的 50ms 当成精确 compositor 帧时间，因此阶段 1 的可重跑采样出口已交付，精确逐帧等价仍未接受。GPU Acrylic 效果图、通用动画轨道和复杂 backdrop 合成属于阶段 5。

## 重跑

```powershell
./tools/run-native-probe.ps1 -Kind Both
./tools/prepare-baseline.ps1
node tools/verify-baseline.mjs --local
cargo test --locked
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
cargo clippy --target wasm32-unknown-unknown --locked -- -D warnings
node tools/generate-enums.mjs --check
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
npm test
cd ..
node tools/compare-navigation.mjs
node tools/compare-indicator.mjs
node tools/benchmark-stages.mjs
node tools/collect-validation.mjs
```

原生构建需要 Windows/.NET 10；项目仍固定同一实验 SDK。探针 runner 只关闭自己启动的进程，`-KeepWindow` 可留窗口现场检查。benchmark 只临时使用 4174，finally 关闭自己创建的 preview，不影响用户的 5173。原生快照、差分、事件和截图位于 out/；JSON 验收数据位于 references/validation/。

阶段 5 的后续交付现已记录在 [动画与材质](stage-5.md)；本文件保留阶段 1–4 当时的验收数据。这里的基础 TextBlock/Image 节点不表示阶段 6 的完整独立控件已验收；Native NavigationView 的 overflow/flyout/Frame 等剩余差异仍见 architecture.md。

技术依据：[WebGL2 规范](https://registry.khronos.org/webgl/specs/latest/2.0/)、[设备丢失扩展](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/)、[WinUI LinearGradientBrush](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.lineargradientbrush)。具体控件值仍以固定源码与本机匹配 SDK 导出为准。


## 2026-11-08 原型清理

本页 InputProbe 描述为早期验收历史。该非 WinUI 原型的公开接口、Rust 节点和专用输入协议现已移除；当前 IME 诊断使用真实 TextBox / EditorHost。历史截图与记录保留原始名称，不代表当前 SDK 仍导出该控件。
