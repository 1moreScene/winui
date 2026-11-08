# 圆环与开关抗锯齿修正

日期：2026-11-07。默认仍为 Canvas2D，React 公共用法不变。

## 原因与修改

宿主原先通过 clientWidth/clientHeight 取得整数尺寸，再将按 DPR 向上取整的 backing 拉伸回 CSS 尺寸，导致小数布局下二次采样。现使用 ResizeObserver 小数尺寸；Canvas CSS 尺寸等于 backing / DPR，额外不足一物理像素由宿主裁剪。GPU 的投影、图层和最终合成同步采用真实 backing 范围。

圆环和滑块原先在显示分辨率逐条绘制填充/描边，小圆的边界覆盖在非整数 DPR 下出现明显误差。新增 Rust VectorLayer：仅对 20×20 圆环、40×20 轨道与滑块组使用局部 4× 采样，保留当前变换与分数相位，并对齐目标物理像素后高质量缩小。文字留在组外，继续按显示 DPR 绘制。池复用局部表面，最多分配 1,048,576 个采样像素，单边不超过 8192；超预算退回直接矢量绘制。

SurfaceMetrics 同时服务共享 Scene 与独立 NavigationView。监听 content/device-pixel 尺寸、resolution 和 resize，释放时解绑；不添加持续空闲轮询。

## 独立测量

期望值由每个 backing 像素 32×32 数值积分得到，不复用 Canvas path。误差仅统计圆边界的部分覆盖像素；蓝环、白色滑块分开统计。以下为平均覆盖率绝对误差：

| DPR | 圆环修正前 | 圆环修正后 | 滑块修正后 |
| --- | ---: | ---: | ---: |
| 1 | 2.73% | 1.66% | 1.80% |
| 1.25 | 10.67% | 2.01% | 1.81% |
| 1.5 | 5.55% | 1.59% | 0.74% |
| 2 | 5.98% | 1.32% | 0.95% |

数学参考诊断用于检查覆盖和重采样质量，不能替代同版本原生 Gallery 的像素或呈现时序验收。`references/validation/antialias.json` 保留分数位移、几何误差、尺寸、帧耗时和源指纹；`antialias-before.json` 保存修正前数据。

## 检查与边界

新增浏览器回归覆盖：小数宽高、两个 Canvas 宿主与可选 WebGL2、四个 DPR、点击选择、模拟 viewport/缩放切换、释放。Rust 回归防止文字被放入超采样组。既有 32 状态原生选择控件矩阵继续在两后端检查。

当前无法检查用户正在使用的浏览器窗口。本轮测试全部在独立 localhost Chrome 上运行。CDP 只改 deviceScaleFactor 不会在本机发送真实 resolution 事件，动态切换测试同时模拟对应 CSS viewport 变化；实际跨屏呈现仍未直接验收。局部帧耗时包含 WASM、Canvas 提交和 DOM 投影，不包含 compositor-present，也不构成跨设备性能保证。

```powershell
node tools/diagnose-antialias.mjs current
node tools/diagnose-antialias.mjs fractional --fractional-transform
cd gallery
$env:PW_CHANNEL='chrome'
node node_modules/playwright/cli.js test tests/antialias.spec.ts
```
