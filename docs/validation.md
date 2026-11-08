> 最新阶段 5：38 项 Rust / 33 项浏览器回归、84 帧组合场景重放、官方 Acrylic/缓动/属性过渡/渐变对照与独立 GPU query 采样见 [动画与材质](stage-5.md)。下文为历史批次记录。

> 这是上一批 NavigationView 的历史记录。阶段 1–4 的最新验证、30 项 Rust / 21 项浏览器测试及生产采样见 [阶段记录](stages-1-4.md)。

# NavigationView 验证记录（2026-11-07）

本轮完成快速点击指示条累积拉长与焦点黑框修复，并扩大原生对照。仍未接受完整原生像素/动画等价。官方 Gallery 仓库保持不变，原生探针单独位于本项目 tools/native-navigation。

| 检查 | 本次结果 |
| --- | --- |
| 固定来源 | 17 个 WinUI 文件 SHA-256 通过；另记录 8 个 Gallery 内容页和原生探针来源/产物 |
| 范围清单 | 126 项、8 个 NavigationView 示例；其他控件未开始 |
| Rust | 19 项回归通过；fmt、Clippy -D warnings 通过 |
| TS / WASM | strict TS、合法/非法枚举类型、枚举生成一致性、Release WASM、Vite、声明文件通过 |
| 浏览器 | 13 项通过；Playwright 1.65.0 + 已安装 Chrome 156 |
| 原生探针 | 匹配 WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental 构建运行通过；2 个 SDK 实验类型生成代码警告 |

快速点击回归：Rust 横向/纵向各 5,000 次中断重定向，验证连续性、长度边界和最终位置；浏览器 Left/Top 各 70 次真实 pointer 快速点击，停止后指示条均恢复 16 DIP。另验证 Canvas/CSS 无焦点黑框且键盘焦点保留、反向/取消关闭、层级/overflow、主题/透明度策略、资源生命周期、回调中销毁和批处理回滚。

## 同条件静态对照

固定输入为 1000×500 DIP、DPR 1、Segoe UI、匹配主题与强调色、动画已结束；窄 Top 控件内部宽 360 DIP，画布仍为 1000×500。对照包含 Light/Dark、Left/Top/LeftCompact/LeftMinimal 及展开状态、footer、hierarchy、overflow、7 个 Gallery 内容页，共 22 组。原生 palette 取自同 SDK，渲染使用 RenderTargetBitmap；浏览器使用实际 SDK Canvas。

- 所有组的 ContentGrid 边界误差为 0 DIP；已比较的 Menu Item 对应 LayoutRoot 边界误差也为 0 DIP。未对每个子元素单独验收。
- 基础外壳平均通道绝对误差 0.139–1.073 / 255，最大通道差超过 8 的像素占 0.32%–1.52%。
- 含内容页的误差最大 3.672 / 255，超过 8 的像素最多 4.25%。残余集中在文字/图标栅格化、部分文本排列及材质效果。
- 这些指标是全图统计，会受大面积相同背景影响；不构成局部质量或逐像素等价保证。

结果在 references/validation/navigation-comparison.json；截图、5 倍差分图与布局数据在 out/navigation-native 和 out/navigation-browser。另用 computer-use 实际激活原生探针并点击 Menu Item3，观察指示条终态转移，证据为 out/navigation-native/live-selection.png。该现场截图为系统缩放后的窗口，不用于 DIP 像素差分。

## 动画对照限制

原生选择第 1→3 项时，按 0/50/100/160/200/260/400/600/750ms 请求截图。RenderTargetBitmap 在本机每次约 150ms，无法按这些请求时刻精确采集；已推迟 PNG 编码并保留实际采集起止时间。浏览器通过公共单调时钟接口在区间中点推进 Rust 动画，保存几何数据作诊断。不能将区间中点视为真实原生 compositor 帧时间，也没有接受逐帧等价。

数据见 references/validation/indicator-comparison.json；实际时间在 out/navigation-native/animation-times.json。快速连续切换的稳定性已通过回归，与精确原生曲线验收分开记录。

## 本机性能观察

本次 localhost Vite 开发服采样：DPR 1，1440×1000，Light。

| 项目 | 观察值 |
| --- | --- |
| WASM 初始化 | 13.4ms，不含此前 JS 模块解析 |
| navigation 到 8 个 React 控件 ready | 262.9ms |
| pointer 到选择通知 | 7.9ms |
| 同步 frame 平均 / 最大 | 1.43–1.59ms / 2.20ms |
| Release WASM / gzip | 743,422 / 168,783 bytes |
| Gallery JS / gzip | 281,858 / 84,752 bytes |

frame 包含同步 WASM、Canvas 命令提交及 DOM 投影；没有测量 GPU 完成、系统进程 CPU 或严格冷启动。完整结果在 references/validation/results.json。

## 重跑

```powershell
cargo test --locked
cargo fmt --all -- --check
cargo clippy --all-targets --locked -- -D warnings
node tools/generate-enums.mjs --check
node tools/verify-baseline.mjs
cd gallery
npm run build
$env:PW_CHANNEL='chrome'
npm test
cd ..
node tools/compare-navigation.mjs
node tools/compare-indicator.mjs
node tools/collect-validation.mjs
```

原生探针用 `dotnet build tools/native-navigation/NavigationProbe.csproj -c Release -p:Platform=x64`，运行生成的 NavigationProbe.exe 并传入截图输出目录。需 Windows 桌面可用；默认保持窗口供现场验证。最新 Playwright 下载的 Chromium 在本机报 spawn UNKNOWN，因此使用现有 Chrome，未改变系统安全设置。测试复用已有 Vite 服务；不会终止用户服务。

完整剩余差异及成本见 architecture.md，包括 AnimatedIcon、Frame 转场、完整 overflow/flyout、AutoSuggestBox 和 pane 插槽、Gallery 外层组织、辅助功能及 Composition 精确效果。
