# CheckBox 勾选动画过慢修复

日期：2026-11-07。

## 原因与修复

`AnimatedAcceptVisualSource.cpp` 只在第一次使用时调用 `CubicBezierEasingFunction_0()`，之后复用缓存字段 `_cubicBezierEasingFunction_0`。原提取器用大小写敏感的构造函数名称查找，漏掉缓存引用，错误地为大多数勾选片段选择了接近线性的另一条曲线。

修复 `tools/extract-accept.py`，同时识别构造与缓存引用，并对未知或歧义曲线直接报错。勾选片段恢复原生控制点 `[0.550000012, 0, 0, 1]`，取消片段保留原来的线性曲线。未人为压缩所有状态的时长，也未改动原生尚未完整迁移的布局合并 / 动画队列策略。

## 实际核对

新增 `AcceptTimingProbe.cs`，读取真正 CheckBox 模板中的 AnimatedIcon / AnimatedAcceptVisualSource，并由匹配 SDK 创建 IAnimatedVisual，读取真实 Duration 和 markers。SDK 与 Store Gallery 的关键 WinUI DLL 哈希一致，详见此前发行版审计。

- 原生整张动画图集为 2666.6666ms；正常勾选片段约 316.6667ms，取消片段约 67.5ms。片段完整时长与可见勾选大致完成的时间不同。
- 原生前台窗口逐帧截图中，稳定勾选字形的白色核心覆盖约在 191ms 达到 95%。旧浏览器线性曲线到 190ms 仍只有约 57%（旧调试截图的对应掩模），造成明显迟缓。
- 修复后两后端均恢复前段快速绘制、末段缓出的进度。Rust 验证 150ms 的路径长度已超过 80%，200ms 超过 90%；浏览器像素回归验证相同的前段快速进度，防止再次落回线性曲线。
- 另记录了同一调用轮次内附加状态属性连续修改的原生样本。这是播放器诊断序列，不是操作系统真实指针重放，不能据此宣布队列和布局时机完全等价。

## 验证边界

`tools/compare-accept.mjs` 在 DPR 1.25 下测量两个浏览器后端，并与原生实际前台捕获比较。两端分别从自己的稳定字形建立掩模，归一化白色核心覆盖。原生 95% 约 191ms，当前 Canvas2D 样本为 260ms、WebGL2 为 220ms；这包括字形位置、抗锯齿、阈值和原生合成呈现延迟的影响，尚未完成相同栅格下的精确时间验收。数据明确保留 `acceptedPixelParity=false` 和 `acceptedExactPresentTiming=false`，不把这次曲线修复扩大为全部动画对齐。

原始帧和记录在 `out/accept-native/`、`out/accept-timing/`、`references/validation/native-accept-timing.json`、`accept-timing-comparison.json`。构建和回归结果继续记录在阶段 6 验证报告中。

```powershell
./tools/run-native-probe.ps1 -Kind AcceptTiming
python tools/extract-accept.py
npm --prefix gallery run build
node tools/compare-accept.mjs
```
