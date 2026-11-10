# Expander / Grid Gallery 示例对齐

依据 `references/baseline.json` 固定的官方 Gallery 提交 `7360ac322414e118eadfb0c7c2f4ecc31a218f59`，使用 Git 对象读取资料，不依赖参考仓库工作区的临时内容。`tools/extract-layout-gallery.py` 将原始页面、代码与片段复制到 `references/gallery-input/{Expander,Grid}`，并生成附 SHA-256 来源的 `gallery/src/official-layout-gallery.json`。构建脚本已接入该提取步骤。

Expander 现在展示官方页面的两个示例：

- 字符串 Header/Content，默认收起；ExpandDirection 选项切换 Down/Top 与 Up/Bottom，源码同步显示当前方向、对齐和展开状态。
- 宽 500、Padding 0、HorizontalContentAlignment Left；Header 使用居中的 TextBlock，Content 使用 Margin 4 的左对齐 TextBlock。

第二例使用真实 SDK Header 内容槽。React `Expander.header` 接受字符串或 SDK 元素；普通 SDK 的 `expander.headerContent` 返回 Rust 安排的 Header 面板。Rust 分别测量与绘制 Header/Content，收起及内容转场不会隐藏、平移或裁剪 Header；Header 和 Content 各保留一个直接槽。原有字符串 Header、内容单子节点限制及展开事件继续保留。

Grid 现已进入目录及 `#grid`，示例为 240×160 的灰色 Grid、三行三列 50 DIP 固定轨道和四个 50×50 的红/蓝/绿/黄 Rectangle。ColumnSpacing / RowSpacing 初值均为 8，范围 0–16；红块 Grid.Column / Grid.Row 范围 0–2。行方向使用反向垂直 Slider。示例、选项均复用 Rust SDK；行列定位、独立间距和跨度在共享 Rust Measure/Arrange 中执行。公共 `rowSpacing` / `columnSpacing` 默认沿用已有 `spacing`，显式 0 可覆盖。

固定仓库中两处实际页面与展示片段的差异：

| 页面 | 实际运行的 Page.xaml | 原始 .txt 展示片段 |
| --- | --- | --- |
| Expander 第二例 | Header/Content 为 TextBlock | Header 为 ToggleButton，Content 为 Button |
| Grid | Height 160，四个 Rectangle 均显式 50×50 | Height 120，省略 Rectangle 尺寸 |

当前运行示例与 Official XAML 标签使用实际页面；原片段以 `referenceXaml` 和原始文件保留，未将二者当成相同实现。

验证入口为 `tests/gallery_layout.rs`、既有 `tests/five_controls.rs` / `tests/scene.rs` 和 `gallery/tests/layout-gallery.spec.ts`。浏览器检查两个渲染后端的示例数量、目录入口、Up/Bottom、Header 可见性及居中、Content 左对齐、四个 Slider 的实时作用、实际源码和页面错误，并输出 `out/layout-gallery/` 截图。本轮未重新执行原生发行版逐像素/逐帧对照。

工作区已有动画代码引用了缺失的 `ConnectedAnimationCompleted` 事件，阻止 Rust 编译；已在统一枚举源补齐其声明并重新生成 Rust/TS 枚举，保留既有动画实现。

## Up 模式底部黑线

在 Edge / Canvas2D / DPR 1.25 下复现了稳定的 Down → Up → Down 残影：250 DIP 高的宿主实际分配 `ceil(250 × 1.25) = 313` 行物理像素，旧清理调用仅使用逻辑尺寸。末尾像素行未被完整清理，重复绘制的透明边框累积为深色线，切回 Down 后仍可残留。修复前回归在底部检测到 278 个连续深色像素。

修复位于 Rust `src/wasm.rs` 的共享 Canvas2D 场景和独立 NavigationView 绘制入口：先使用单位矩阵清理整个物理缓冲区，再恢复 DPR 绘制矩阵。保留原生边框、圆角和位置，不通过修改 Expander 尺寸、遮挡底部或增加不透明背景处理。

`gallery/tests/expander-edge.spec.ts` 覆盖 Canvas2D / WebGL2，DPR 1 / 1.25 / 1.5 / 1.75 / 2，每组连续 Down → Up → Down → Up → Down，并扫描截图底部的深色残留，证据位于 `out/expander-edge/`；修复前失败记录位于 `out/expander-edge-before/`。

2026-11-09 验证结果：10 组 Edge 像素回归全部通过，共 50 张方向切换截图，最终运行记录为 `out/expander-edge-final/.last-run.json`。另已通过 Rust 全量测试、5 项布局示例浏览器测试、既有五控件页面交互回归、类型及 SDK 边界检查、枚举一致性检查、WASM release 编译和 Gallery 生产构建。当前打包 WASM 的 SHA-256 为 `034f087997f09eacdc06f8c893168c10dc6e91327a468e1db275f08ac07236fc`。
