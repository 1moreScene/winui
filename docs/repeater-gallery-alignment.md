# 集合与刷新用例对齐 WinUI Gallery

后续发现并修正了持续布局、未知模板尺寸估计和自定义颜色按钮 VSM 优先级问题；当前性能与状态验收见 [性能修正记录](repeater-performance.md)。下文原验收数字属于此前版本。

对齐基准为项目已固定的 WinUI Gallery commit `7360ac322414e118eadfb0c7c2f4ecc31a218f59`，不改动参考仓库。上一批的通用条目列表、独立刷新指示器和额外参数示例已由以下官方运行用例替换。

| 官方运行页顺序 | 本项目用例 | 主要数据和操作 |
| --- | --- | --- |
| ItemsRepeater 1 | Basic, non-interactive items laid out by ItemsRepeater | 初始长度 300/25/175；Add Item、Remove Item；纵向条、横向条、圆形网格三种模板 |
| ItemsRepeater 2 | Virtualizing, scrollable list of items laid out by ItemsRepeater | 0–499；默认 ActivityFeedLayout；切换 108×108 UniformGridLayout；奇偶项模板 |
| ItemsRepeater 3 | Virtualize a wrapping collection with FlowLayout | Item 1–500；520×320 滚动区域；方向、四种 LineAlignment、两个 0–32 间距滑块；实时已实例化数量 |
| ItemsRepeater 4 | ItemsRepeater with mixed-type collection | 原始 9 个整数/段落；200×200 单元；按类型选择模板 |
| ItemsRepeater 5 | Laying out nested ItemsRepeaters | Fruits、Vegetables、Grains、Proteins，每组原始 7 个条目；外纵内横 |
| ItemsRepeater 6 | Animated Scrolling and Content Display | 原始 20 个颜色；175×250 滚动区域；距离中心缩放；点击更新 150×150 色块；焦点居中及 Home/End |
| ItemsRepeater 7 | Virtualized, Content-Heavy Layout with Filtering and Sorting | 1000 个食谱；原始食材与补充食材生成规则；按食材过滤；按食材数量升/降序；200 DIP 宽的最低列布局 |
| PullToRefresh 1 | Basic PullToRefresh | 原始 9 个控件名；200 DIP 高、最小宽 200 的 ListView；500ms 后头插 NewControl N |
| PullToRefresh 2 | Custom Icon PullToRefresh | 原始 8 个名字；200×200 ListView；SunBlack/SunWhite 35×35 图片；800ms 后头插 New Friend N；停止图片旋转 |

以**运行页 XAML 与代码后置**为准。原仓库 `.txt` 说明存在历史差异，例如自定义刷新片段为 AddFriend，实际 C# 为 Sun 图片；编号列表说明为 Button，实际资源模板是 Border。两份来源均保留，源码面板展示运行页及依赖资源，不用另一套手写 XAML 冒充官方来源。

`StackLayout`、`UniformGridLayout` 归属官方 ItemsRepeater 页面；`RefreshVisualizer` 归属 PullToRefresh 的自定义示例。因此旧的 `#stack-layout`、`#uniform-grid-layout`、`#refresh-container`、`#refresh-visualizer` 链接保留为所属页面的兼容入口，标题和用例保持官方页面，不增加独立伪官方页面。Renderer 仅作为项目额外的宿主选择项保留，默认 Canvas2D。

## SDK 变更

- FlowLayout 的测量、逐行布局、LineAlignment 和虚拟化在 Rust；ActivityFeedLayout、VariedImageSizeLayout 从同 commit 的 `Layouts/*.cs` 移植到 Rust，作为官方示例的必要依赖。TS 布局对象仅传递参数。
- 滚动中心缩放表达式、焦点居中和 Home/End 导航由 Rust 执行。调用侧通过 `isScrollCenterScaleEnabled`、`isFocusCenteringEnabled`、`isKeyboardNavigationEnabled` 配置；无需每帧计算缩放或偏移。
- RefreshContainer 支持 `visualizerContent` 与 `visualizerOptions`，例如 `visualizerOptions={{isRotationEnabled:false}}`；自定义内容进入 Rust 所拥有的 visualizer 槽位。列表、刷新状态及变换不在 DOM/CSS 复制。
- 补齐所需旧版主题资源；ListView 的渐变 BorderBrush 复用 Rust Border 的路径画刷绘制，保留分数 DPR 的边框取整。
- Bar 的 `MaxHeight = max / 4` 和 `MaxDiameter = max / 6` 遵守 C# 整数除法，分别为 106 与 70；不是 106.25 和 70.833…。
- Gallery 的单选项宿主将 Options 列的可用宽度交给 Rust 测量，避免内联自动宽度从最小宽度开始反复收缩，使长标签被截断。文本测量和换行仍由 SDK 执行。
- ListView 的自然期望宽度与排列后的滚动视口宽度分开计算；基础刷新列表仅设置 `MinWidth=200` 即可与原生一样得到 200 DIP 宽。共享 Margin 测量按排列时的物理像素取整，避免嵌套条目的 Sweet potato / Brussels sprouts 在 125% 下被挤成两行并裁掉末词。

```tsx
<ScrollViewer height={320}>
  <ItemsRepeater items={data}
    layout={new FlowLayout({minItemSpacing: 8, lineSpacing: 8})}
    renderItem={item => <TextBlock text={item.text} />} />
</ScrollViewer>

<RefreshContainer onRefresh={reloadData}
  visualizerOptions={{isRotationEnabled: false}}
  visualizerContent={<Image source="/sun.png" width={35} height={35} />}>
  <ListView items={friends} height={200} />
</RefreshContainer>
```

可选的滚动缩放及焦点行为直接通过 ItemsRepeater 属性开启；程序滚动/聚焦使用 `repeater.scrollIntoView(index)` 和 `repeater.focusItem(index)`，无需调用方计算坐标。

## 可复查来源和验证

`tools/extract-repeater-refresh.py` 从固定 git 对象读取两个页面、代码后置、说明片段、两个自定义布局和 Sun 图片，生成 `official-repeater-refresh.json` 与来源指纹。业务随机数据沿用相同数量、候选数据和生成规则；不声称跨语言随机序列逐项一致。

`tools/native-repeater-refresh` 直接编译固定的两个 Gallery C# 布局，并以同 SDK 采集 FlowLayout、ActivityFeedLayout、VariedImageSizeLayout 模板几何与主题画刷。`TextControlBorderBrush` 的 native 类型为 LinearGradientBrush，保存其 stop、坐标模式与变换，未将它扁平化成单色。

浏览器验证检查 7+2 顺序、初始内容、模板切换、增删、FlowLayout 选项、嵌套集合、颜色点击与键盘、食谱筛选排序、两组刷新插入，以及同 SDK 的布局矩形。实际运行结果、二进制 SHA-256 和源码快照见 `references/repeater-gallery-alignment.json`。

完整 Rust 回归在冻结源码上执行，浏览器分别验证该冻结二进制和共享工作区的当前二进制；生产截图覆盖 Chromium、WebKit 的全部 9 个官方用例。报告分别记录它们的哈希与范围，其他会话后续修改不自动继承本次验收。

本次最终结果：319 项 Rust 测试通过；冻结二进制 15 项 Chromium 检查通过；Chromium / WebKit 生产版 10 项检查通过；当前工作区二进制独立复跑 15 项检查通过。类型检查、生产构建和 SDK 声明生成均通过。两个渲染后端各比较 24 组网格几何，另比较 6 组 Gallery 布局和 4 组刷新列表尺寸；最大误差约 0.8 DIP，刷新列表尺寸误差为 0。冻结二进制与当前二进制不同，分别保存验证证据，不互相替代。

这里的对齐指用例组织、输入数据规则、配置、交互和来源对应。Windows DirectManipulation 的完整阻尼/回弹、Composition 逐帧像素、完整 UIA 与 Store 发行版外观验收仍未完成。Gallery 自定义布局的不足一行尾项和未测量尺寸估算采用安全的 Rust 边界处理，不宣称保留原 C# 版本的尾项遗漏或缓存缺陷。
