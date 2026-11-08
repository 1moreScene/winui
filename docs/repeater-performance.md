# 集合用例性能与按钮状态修正

上一轮的用例检查覆盖了数据、节点类型、点击和布局矩形，没有覆盖静止停帧、远距离往返滚动及自定义颜色按钮的实际 VSM 画面。它不能作为本次问题的验收结果。

## 修正

1. Rust ItemsRepeater 的 Measure/Arrange 在横向嵌套布局里得到不同的交叉轴约束，旧代码反复清空尺寸缓存，导致静止时持续布局。现在排列保留测量结果；Grid 的 Star 列在一次布局中先按全宽、再按列宽测量时，也保留离屏尺寸估计，实际实例化项仍按当前约束重新测量。
2. 旧代码把尚无模板内容的槽位记作 80×32，食谱的尺寸估计随之塌缩，造成大量创建、销毁和滚动跳动。Rust 现在先取得一个真实模板的尺寸，再展开未知尺寸布局的虚拟化范围；空模板不进入尺寸缓存。已知单元尺寸的网格不必等待。调用方继续使用相同的 `renderItem` / `setItemTemplate`。
3. React 适配只在一批 `RealizationChanged` 后同步模板成员，逐项事件照常通知；使用容器对象的稳定身份作为 React key，避免为 key 克隆节点快照，回收后重新出现的同名条目仍会正确挂载。
4. Animated Scrolling and Content Display 使用真正的 Rust Button。Normal 状态绑定调用方的 Background/Foreground；PointerOver、Pressed、Disabled 由原生 ContentPresenter 的 VSM 画刷覆盖，背景变化沿用 Button 的过渡。此前本地颜色无条件覆盖所有状态，按钮因而像静态色条。该修正位于共享 Rust Button 绘制链路。
5. 用例容器复用统一的 `basic-live`、`basic-preview` 和 `options`，遵循固定 Gallery `ControlExample.xaml` 的预览 Padding=12、Options Padding=16。移除本页独有的 32 DIP 内边距、220 DIP Options 列和 1100 px 提前折行规则；源码页签状态也与其他页面一致。

## 验证方式

- `tools/run-repeater-style-probe.ps1` 使用相同 Microsoft.WindowsAppSDK 2.5.4-experimental / WinUI 2.3.10-experimental，采集浅色、深色的八组 Button 状态画刷与两组实际按钮模板矩形。没有以 RenderTargetBitmap 宣称 Composition 缩放完全一致。
- Rust 回归检查自然尺寸停帧、首次模板握手、Star 列重复测量下的 1000 项往返滚动，以及本地颜色与八组原生状态画刷的优先级。
- 浏览器先等待字体与模板挂载完成，再检查静止期间帧数和布局次数不再增加；另检查 500 项列表、1000 项食谱的往返滚动及筛选恢复。浅/深色样例验证 Button 几何、Canvas 实际 Normal/PointerOver/Pressed 像素，以及统一预览/Options 间距。生产构建同时在 Chromium、WebKit 执行。

本机相同诊断流程中，嵌套用例在 1.6 秒静止采样内由 83 个空转帧降为 0；所有七个用例均停帧。食谱初始化及一次颜色按钮点击采样的场景帧耗时 P95 从约 56.7 ms 降为约 22.2 ms。这个帧样本很小，保留完整 CPU profile 和 long-task 记录，不将其作为跨设备帧率保证；整页启动仍有长任务。

可复查结果、准确测试数量、源码快照及二进制 SHA-256 见 [验证记录](../references/repeater-performance-validation.json)。性能诊断可在 Gallery 服务启动后执行：`cd gallery; node repeater-profile.mjs label http://127.0.0.1:PORT`。Canvas2D 仍为默认后端；布局、虚拟化、缩放与按钮状态仍由 Rust 执行。

最终验收：冻结源码全部 333 项 Rust 测试、19 项 Chromium 检查、18 项 Chromium/WebKit 生产检查通过。当前工作区二进制独立复跑 4 项性能与按钮检查通过，且 SHA-256 与冻结验证二进制一致。类型检查、生产构建和 SDK 声明生成均通过。
