# 发行版来源审计与 React / Canvas2D 修正

日期：2026-11-07。

此前将独立原生探针的静态结果用于支撑官方发行版对齐，证据不足。这次将来源身份与视觉验收分开登记，未宣布全面对齐。

## 实际验证的来源

- 微软 Store 安装包：`Microsoft.WinUI3ControlsGallery_3.0.4.0_x64__8wekyb3d8bbwe`，`SignatureKind=Store`，非开发模式，发布者 Microsoft Corporation。
- 实际打开的窗口身份：`Microsoft.WinUI3ControlsGallery_8wekyb3d8bbwe!App`。通过 Basic input → CheckBox，实际点击二态复选框并观察 Output。
- 安装包的 `WinUIGallery.deps.json` 解析到 Windows App SDK `2.5.4-experimental`、WinUI `2.3.10-experimental`。因此不能把 experimental 标签本身当作选错来源的证据。
- Store 包与独立探针的 `Microsoft.ui.xaml.dll`、`Microsoft.UI.Xaml.Controls.dll` 两个文件分别 SHA-256 完全一致。版本、包身份、依赖、哈希和窗口截图指纹记录在 `references/validation/release-audit.json`。
- 本地官方源码固定在 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`。以上 DLL 一致不证明 Store Gallery 本体由这个 commit 构建，也不证明已选 WinUI 源码 commit 与二进制严格对应；原有不确定性继续保留。
- 本机另有本地源码构建的 Gallery 和第三方 DevWinUI Gallery，它们没有被当作这次发行版窗口证据。

## 用户指出的图片是什么

`out/foundation-native/Light-CheckBox.png` 由本项目 `FoundationProbe.cs` 创建实际 WinUI 控件、强制设置 VSM 状态，再以 `RenderTargetBitmap` 输出。它是自建状态矩阵，不是官方 Gallery 发行版页面截图。其固定布局、强制状态和捕获方式不足以证明 Composition 动画、材质和正常交互等价。

这次发行版窗口截图为 `out/release-audit/store-checkbox-checked.png`，由 Computer Use 的 Windows.Graphics.Capture 获取。它记录页面组织、稳定状态和 Output，不构成浏览器逐像素或逐帧通过。

旧 144 个裁剪保留为诊断数据。平均通道误差预算不再用来表达发行版验收；JSON 显式标记 `acceptedReleaseParity=false`。

## 已修正

1. Rust / TS SDK 原本默认 Canvas2D，但基础控件、Acrylic、渐变和效果实验页面显式初始化 WebGL2。已统一为 Canvas2D；WebGL2 仅手动选择。
2. React 组件直接接收 SDK 的类型化属性，移除公共 `options` 包装。NavigationView、SceneView、容器、Button、CheckBox、ToggleButton、TextBlock、Image、Ellipse、InputProbe 和 SceneNavigationView 均已迁移。SceneNavigationView 的场景布局仍可独立指定 `layout`。基本 TS 工厂的配置对象接口继续保留。
3. Gallery 使用真实运行代码提取源码，面板和 API 文档已同步迁移。普通调用为：

```tsx
<TextBlock text="I am a TextBlock." />
<Button text="Standard XAML button" enabled={!disabled}
  clickMode={mode} onClick={() => setCount(c => c + 1)} />
```

4. 原浏览器 CheckBox 只使用字体 fallback，遗漏模板的 `AnimatedAcceptVisualSource`。现在从固定 WinUI C++ 提取 3 条矢量路径、39 个 marker 和 19 个片段，Rust 负责路径裁剪、时间线与状态；Canvas2D 和 WebGL2 共享同一几何。GPU 使用整条路径的距离场并集，避免半透明线段接缝反复叠加。
5. 对照固定 Gallery 的 `ControlExample.xaml`，把基础示例 Output 恢复到预览右侧，恢复预览 12px、Output 16px 的内边距和 12px 外边距、48px 源码标题行，并补回官方页面说明。两个共享 XAML 已留存在 `references/gallery-shared/`。
6. 保留三态语义、通知顺序、全局无焦点黑框、真实 Tab / ARIA、StrictMode 生命周期和显式后端切换。
7. 验证时发现旧 Vite 服务返回 `504 Outdated Optimize Dep`，已核实进程属于本项目后重启，继续使用 `127.0.0.1:5173`。

## 仍未验收

- AnimatedIcon 原生队列、fallback transition 选择及中断调度尚未完整迁移。当前用新 marker 替换正在播放的片段，不能宣称原生中断等价。
- 这次浏览器逐步勾选与减少动画测试证明矢量动画在运行，不等于发行版逐帧时间和栅格化验收。需要继续通过真实发行版捕获固定时间点。
- 其他控件完整模板、材质、字体栅格化及阶段 6 剩余控件的差异继续登记在 `docs/stage-6.md`。Mica / Desktop Acrylic 的系统合成能力仍未由浏览器提供。

可复核命令：`./tools/audit-release.ps1`、`python tools/extract-accept.py`、`node tools/verify-baseline.mjs --local`。构建、Rust / 浏览器回归的最新结果见 `references/stage-6.json` 与 `references/validation/results.json`。


2026-11-08：上述旧批次组件列表中的 InputProbe 已完整退役，当前输入法诊断迁移至真实 TextBox。历史来源和验收记录不改写。当前控件分类见 `references/control-origins.json`。
