# 集合、分页、布局与富文本批

2026-11-09 完善 ItemsView、AnnotatedScrollBar、PagerControl、LayoutPanel、RichTextBlock。所有控件的内部状态、排版、输入、绘制、重复计时和模板部件由 Rust SDK 执行。TS 保存业务对象、回调与类型化句柄，并适配浏览器输入、剪贴板和无障碍 DOM；React 使用同一套 SDK。

## 本次补齐

| 控件 | SDK 功能 |
| --- | --- |
| ItemsView | StackLayout、UniformGridLayout、LinedFlowLayout；行高、行距、最小项距、拉伸和对齐；不同宽度项的方向导航；四种选择模式、选择/反选、调用开关；模板、回收、滚动到项、视口比例索引查询 |
| AnnotatedScrollBar | 默认标签样式、SDK 标签模板、重叠过滤、项目索引锚点；DetailLabelRequested 和 Rust ToolTip、自定义详情内容；取消与过期响应保护、长按重复、拖动、目标销毁断联 |
| PagerControl | 所有显示模式、已知/未知总页数、边界按钮、省略号；每个导航按钮和输入区独立命令、命令启用状态实时同步；按钮样式属性、键盘导航、事件和生命周期 |
| LayoutPanel | 无布局叠放，Stack/UniformGrid/Flow/Lined 和固定 Gallery FeaturedTileLayout；九个原始子项、布局切换、间距、padding、border 和自然高度传播 |
| RichTextBlock | UTF-16/grapheme 选区、指针拖选、双击词/三击段落、键盘扩展/词/行导航与复制；TextHighlighter、内联 SDK 控件、对齐/两端对齐、Unicode 双向顺序；RichTextBlockOverflow 链接、调整尺寸重排、唯一来源与环检测 |

富文本溢出链在所有容器获得最终尺寸后按链接顺序排版，支持先创建后面的容器；内联 SDK 节点随文字移动到对应列，销毁正文时一并释放。选区和高亮共用 Rust 的文字片段与裁剪范围，两个渲染后端不维护另一套逻辑。

## 调用示例

```ts
import { WinUI, ItemsViewSelectionMode, LinedFlowLayout,
  LinedFlowLayoutItemsStretch, TextAlignment, FeaturedTileLayout } from './index';
const ui = await WinUI.create();
const scene = ui.scene(host);
const items = scene.root.itemsView({
  items: data, height: 300,
  selectionMode: ItemsViewSelectionMode.Multiple,
  layout: new LinedFlowLayout({ lineHeight: 160,
    minItemSpacing: 5, itemsStretch: LinedFlowLayoutItemsStretch.Fill }),
});
items.setItemTemplate((item, slot) => slot.image({ source: item.image }));
items.select(2);
items.startBringItemIntoView(10);
const centerIndex = items.tryGetItemIndex(0.5, 0.5); // 空集合返回 null

const nextCommand = scene.root.uiCommand();
nextCommand.onExecuteRequested(() => loadNextPage());
const pager = scene.root.pagerControl({ numberOfPages: 20,
  nextButtonCommand: nextCommand, nextButtonStyle: { width: 48 } });
const off = pager.onSelectedIndexChanged(event => loadPage(event.newPageIndex));
nextCommand.update({ canExecute: false });

const last = scene.root.richTextBlockOverflow({ width: 240, height: 200 });
const rich = scene.root.richTextBlock({ width: 240, height: 200,
  overflowContentTarget: last, textAlignment: TextAlignment.Justify,
  paragraphs: [{ runs: [
    { text: 'Hello ' }, { text: '', inline: 'badge' },
    { text: ' Help', link: 'help' },
  ] }],
  textHighlighters: [{ background: '#ffff00', ranges: [{ startIndex: 0, length: 5 }] }],
});
rich.inline('badge').button({ text: 'SDK inline' });
rich.select(0, 5);
rich.onHyperlinkClick(event => navigate(event.text));

const bar = scene.root.annotatedScrollBar({ scrollTarget: items, height: 300,
  labels: [{ text: 'Start', scrollOffset: 0 }] });
const releaseLabels = bar.setLabelTemplate((label, slot) => slot.text({ text: label.text }));
bar.onDetailLabelRequested(event => { event.content = event.label; });
bar.onScrolling(event => { event.cancel = !canNavigate; });
const panel = scene.root.layoutPanel({ layout: new FeaturedTileLayout({ spacing: 8 }) });
panel.text({ text: 'Featured' });
panel.button({ text: 'Save' });

off(); releaseLabels(); scene.dispose(); ui.dispose();
```

`detailContent()` 在首帧后返回 Rust 管理的详情内容槽，可添加 SDK 控件。React 对应 `renderLabel`、`renderDetail` 和 `RichInline`。业务模板只创建内容；测量、定位、显隐、回收和命中仍在 Rust。所有封闭属性使用公共运行时枚举，类型负例覆盖裸字符串和不相关枚举。

## 官方示例和基准

Gallery 保留五条路由，恢复固定版本的全部 **12 组示例**，包括 RichTextBlock 四组示例及三个流动列。ItemsView 使用原始 13 张 LandscapeImage 图片和描述，AnnotatedScrollBar 使用原始 250 项颜色集合，LayoutPanel 使用原始九个子项。Likes 在上游是 Random，本地探针和浏览器共用冻结的数值，区别写入提取数据的 dataNotes。

- Gallery：`7360ac322414e118eadfb0c7c2f4ecc31a218f59`。
- WinUI 源码：`7b12709347527238494ca28cb9fed326d513e779`，包含 LinedFlowLayout、ItemContainer；完整源文件指纹见 `references/reading-controls-sources.json`。
- SDK：`Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental`，模板和资源从同版 generic.xaml 提取。
- Store 发行版：3.0.4.0、Store 签名；本次核对的两个关键 DLL 与独立探针完全相同，依赖指纹也与已记录安装包一致。已直接实测五个页面的双击调用、分页步进、标注跳转与预览、布局切换和富文本拖选，并采用同 DLL 原生探针对照，详见 `references/validation/reading-gallery-release-audit.json`。
- 原生探针加载完整固定 XAML，记录浅/深色 **38 个状态**；浏览器在 Canvas2D、WebGL2 各运行同一矩阵，共 **76 个状态**。另保留旧的 18 个原生/36 个浏览器基础状态回归。

```powershell
python -X utf8 tools/fetch-reading-controls.py
python -X utf8 tools/extract-reading-controls.py
python -X utf8 tools/extract-reading-gallery.py
powershell -File tools/run-reading-gallery-native.ps1
cargo test --test reading_advanced --test reading_controls --test collections --test repeater_refresh --test view_commands --test basic_next
npm --prefix gallery run build
cd gallery
node node_modules/vite/bin/vite.js build --config vite.reading.config.ts
$env:READING_PRODUCTION='1'
node node_modules/playwright/cli.js test -c playwright.reading-controls.config.ts
```

最终测试数量、原生和浏览器逐状态误差、源码及测试 WASM 指纹由 `tools/record-reading-controls.py` 从实际结果生成，见 `references/reading-controls-status.json`。该工具读取 `out/reading-rust-validation.log`，不再把前一批的测试数量写死。

## 验证范围和差异

矩阵分别记录外框、可见项几何和图像差异；原生首次图片/标签测量尚未稳定的状态不能作为确定尺寸。ItemsView 的视口外缓存布局仍可能与原生 LinedFlowLayout 的冻结行、重新平衡及估算策略不同，当前实现不能据此宣称完整原生优化器等价。

RichTextBlock 的原生 ActualWidth/Height 报告内容/ink 范围，SDK 快照报告布局分配矩形，原始差异保留。浏览器字体塑形和光栅化、复杂语言编辑级文字服务、完整 Windows UIA 文本模式，以及 Composition/AnimatedIcon 的逐帧呈现仍未达到全面原生等价。按钮 Style 支持公开类型列出的属性覆盖，不提供任意 XAML ControlTemplate 运行时。

用户指定的全局无焦点黑框约定继续保留，真实焦点、选择和键盘操作仍可用。静态截图、平均像素误差和同 DLL 不能代替发行版窗口的动画和材质逐帧验收。

本次最终验证：88 项 Rust 回归、18 项生产浏览器测试通过；类型检查、SDK 声明、枚举漂移和常规生产构建通过。38 个原生状态对应 76 次双后端验证；当前记录的可见项几何误差最大 1 DIP。测试与当前 WASM 的 SHA-256 一致，详情和未对齐范围见状态 JSON。

选区对照显式统一键盘焦点：失焦保留范围、隐藏背景，重新聚焦恢复背景。TextHighlighter 采用同 SDK 的默认前景和背景画刷，后一个范围覆盖前一个范围；半透明颜色按替换画刷绘制。算法来源为固定版本的 [TextHighlightRenderer](https://github.com/microsoft/microsoft-ui-xaml/blob/7b12709347527238494ca28cb9fed326d513e779/dxaml/xcp/components/text/TextHighlightRenderer.cpp)，原始文件和指纹已归档。

发行版交互复核还确认：LayoutPanel 切换为 StackLayout 后按自然宽度收缩，PagerControl 的示例也使用自然宽度。Gallery 通过同 SDK 的 autoWidth 挂载适配 ContentPresenter 的这一行为；宽度计算仍在 Rust。
