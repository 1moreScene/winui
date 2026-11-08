# Rust 共享浮层性能与主命令展开

本轮修改共享 Rust 渲染路径，Canvas2D 仍为默认后端。运行时、完整数据、来源快照和验证限制见 `references/validation/overlay-performance-summary.json`；重现记录入口为 `tools/record-floating-performance.py`。当前冻结服务为 <http://127.0.0.1:5197/#command-bar>，主命令展开示例为 <http://127.0.0.1:5197/#app-bar-separator>。

## 修复内容

- Canvas2D 比较实际基础绘制列表、尺寸、DPR，仅在列表不变时复用底层画面。图像节点保守重绘；图片/字体就绪会使缓存失效，显式 WebGL2 路径继续执行其上下文恢复检查。
- Acrylic 只读取和处理有界的材质区域，保留四项、每项最多 1,048,576 像素的缓存；源像素、主题画刷、效果权重、采样变换、尺寸和 DPR 都参与失效判断。表面池归还及 Scene 销毁会释放子表面、模式和缓存。
- 整数模糊采样跳过重复双线性计算，预计算行列坐标；资源确认灰度且不透明时使用等价单通道路径，其它素材走四通道路径。固定噪声纹理预处理与平铺，不改变材质的模糊、颜色或透明度配方。
- release 改用 `opt-level=3`，保留既有 LTO。当前 WASM 从 4,839,571 增至 5,482,413 字节，gzip 从 1,003,042 增至 1,276,955 字节；其中也包含新增分隔符和主命令展开轨道，不能把全部大小差异归因于优化级别。

原生探针 `references/validation/overlay-own-shadow-sampling.json` 证实 InApp Flyout 的 Acrylic 会采到自身阴影；这与窗口化 MenuFlyout 的 HostBackdrop 不同，优化保留这一差异。没有通过取消阴影采样、降低模糊质量或自动切换后端提高帧率。

主命令展开的裁剪、宿主高度和底部命中测试修复见 [命令控件](command-controls.md)。More 本身为静态字形，动画发生在其控制的内容区域。

## 测量

同一台机器、Edge、release WASM、720×480 DIP、DPR 1.25。每个浮层配置直接执行 36 次 `scene_frame`，覆盖布局、绘制、序列化及测试端 JSON 解析；不含 DOM 投影、RAF 调度或 GPU 完成等待。15 种配置 × 两种后端 × 条纹/纯色背景，涵盖 Popup、Flyout、MenuFlyout、ToolTip、CommandBar、AutoSuggestBox、ComboBox、NumberBox、ContentDialog、TeachingTip、SplitButton、ToggleSplitButton、DropDownButton、AppBarButton 和嵌套 Flyout。

条纹背景下 Canvas2D 的 Rust 调用 p95（ms）：

| 配置 | 修改前 | 修改后 |
|---|---:|---:|
| CommandBar | 84.2 | 25.4 |
| Flyout | 44.0 | 32.0 |
| MenuFlyout | 23.9 | 14.9 |
| ToolTip | 4.2 | 2.0 |
| ComboBox | 9.8 | 6.3 |
| 嵌套 Flyout | 68.3 | 37.8 |

另对实际 Gallery CommandBar 进行五轮实时打开/关闭：Rust 帧 p95 从 50.3 降至 11.1 ms，RAF 间隔 p95 从 54.6 降至 18.2 ms。RAF 记录没有包含 GPU present 时间；本地共享机器上的单组数据不能保证所有设备稳定 60 fps。复杂或嵌套 InApp Acrylic 仍有超过 16.7 ms 的慢帧；纯色嵌套配置 p95 42.4→43.2 ms，也不能宣称每个压力配置都变快。

固定开合结束状态的像素检查中，Canvas2D 的 CommandBar、Flyout、MenuFlyout、嵌套 Flyout 与旧运行时完全相同；ToolTip/ComboBox 的重复噪声插值最大分别差 3/2 个通道级，平均约 0.34/0.32。它们是修改前后对比，不是 Windows Composition 像素一致性证明。

## 验证与构建隔离

248 项 Rust 测试、25 项浏览器回归、4 项部署后操作通过；host/WASM 严格 Clippy、TypeScript、声明输出、生产构建通过。104 个同版 SDK 静态状态对照通过几何检查，仍复用已有原生截图；没有新增 Store Gallery 逐帧采集。浏览器回归还覆盖缓存后的背景/主题/透明度/DPR变化、资源销毁、浮层阴影/位移、分隔符和展开后的标签像素、底部点击与快速反向切换。

构建期间另一个会话正在修改 picker_controls，共享根目录内容原样保留。本轮用 `out/command-menu-start-source` 源码快照排除当时未完成的 picker UI 接线，验证 WASM 为 `d91249577c1aa7af2ae86a53e516d355b40e5ef0d43b5b63ad8d9ba655d3d3db`。当前共享根目录 `cargo check --locked` 和 14 项命令控件测试也通过，但不属于同一二进制的运行时验收。源文件指纹、根目录与快照的差异列表均有记录。

5197 与测试用 5255 的 WASM、JS 胶水和应用快照一致。生产目录 `out/overlay-command-expanded-dist` 只含这一份匹配的 WASM；冻结构建也修正了胶水 fallback URL 可能混入其它会话二进制的问题。根目录 `gallery/src/wasm` 可继续由其它会话更新，不视为本轮已验收二进制。
