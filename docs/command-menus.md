# 命令菜单扩展批

本批选定 AppBarSeparator、MenuBar、CommandBarFlyout、XamlUICommand、StandardUICommand；Pivot 仍不实现，另一会话负责的日期/颜色控件不纳入本批。

AppBarSeparator 已接入 Rust 模板、公共 TS 工厂、React 平铺属性和 `#app-bar-separator` 页面。独立分隔符不参与焦点和点击，主命令中为垂直线，溢出后保留同一节点并切换水平线。Padding、前景色、紧凑状态和布局来自同版 SDK 模板；CommandBar 的分隔符数据现在生成真实 AppBarSeparator，替代临时 Border。

该页面使用固定 Gallery 的一个官方示例及 XAML。Rust 控制 CommandBar 主命令展开/收起的裁剪进度，250/167 ms、可中断反向切换；逻辑高度保持模板的 48 DIP，自动高度宿主预留完整标签区域，不再被源码栏裁住。更多说明见 [命令控件](command-controls.md)。

MenuBar 与 CommandBarFlyout 现已随后续批接入 Rust、TS/React 和 Gallery，另包含 MenuBarItem、RelativePanel 与 WrapPanel，见 [菜单与布局批](menu-layout-controls.md)。XamlUICommand、StandardUICommand 不纳入该五控件批；用户选择命令模型以后再做。固定来源仍保留在 `references/command-menus-sources.json` 与 `gallery/src/official-command-menus.json`，不把来源准备算作实现。

AppBarSeparator 的验证覆盖两种后端公共工厂、不可聚焦语义、溢出重挂接、真实标签像素、完整呈现高度、底部点击和动画中途反向切换。当前测试运行时和验收边界统一记录在 `references/validation/overlay-performance-summary.json`；同版 SDK 静态对照不代表 Store Gallery 的逐帧动画验收。
