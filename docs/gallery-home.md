# Gallery 首页

默认 `/`、`/#home` 和旧首页入口 `/#overview` 均打开新首页，浏览器标题为 WinUI Gallery；未识别的入口也回到首页。NavigationView 示例仅通过 `/#navigation-view` 和旧示例锚点 `/#example-N` 访问。`/#all` 和 `/#samples` 为完整目录，`/#category/<官方分类 ID>` 为分类页，`/#sample/<官方项目 ID>` 为占位页。

以项目已固定的官方 WinUI Gallery 提交 `7360ac322414e118eadfb0c7c2f4ecc31a218f59` 为准，未切换到最新 main。参考 `MainWindow.xaml`、`HomePage.xaml`、`HomePageHeader.xaml`、`Tile.xaml`、`ItemTemplates.xaml`、`GridViewItem.xaml` 和 `SelectorBar.xaml`：

- 标题栏搜索、320px 桌面导航、三个基础分类与按名称排序的控件分类。
- 官方横幅图片、六个 232×172 的横向资源卡片、32px 高的圆角强调色筛选项。
- Recent / Favorites、最近访问行、按官方新建/更新标记筛选的项目，300×96 的桌面控件卡片及窄屏布局。
- 19 个分类、126 个官方目录项的标题、描述和图片；已有 Gallery 页面接入原示例，未实现项目保留占位，仓库明确排除的项目标为“范围外（不实现）”，附官方文档链接。入口存在不表示控件功能或原生视觉已完全验收。

搜索覆盖标题、摘要和官方标签，支持 Ctrl+F / Ctrl+K。最近访问和收藏保存在浏览器本地；无可用存储时仍可浏览。增加卡片收藏按钮，便于已有示例与占位项目统一收藏。设置入口提供浅色、深色、高对比度选择。键盘焦点和 Tab / 方向键导航保留，遵循项目约定隐藏焦点黑框。

首页、目录、占位与全部已实现示例共用一个持续挂载的 Gallery 外壳。应用侧栏直接使用现有 Rust NavigationView，早期 React details/链接导航已经移除；Gallery 只提供分类数据与路由，展开、选择、滚动和自适应由原控件负责。DOM 内容位置来自 Rust 的布局快照。设置与示例的 Theme 选择使用同一份主题状态；搜索期间保留已挂载示例与其内部状态。首页资源卡片使用普通主题背景 fallback，未宣称复现 Windows Composition Acrylic、Mica 或原生动画。后续控件页工作与当前验收见 [Gallery 示例页](gallery-sample-pages.md)。

首页资源与最近访问行对应官方 `Controls/HorizontalScrollContainer.xaml(.cs)`，实际为隐藏双轴滚动条、启用横向/禁用纵向滚动的 ScrollViewer；左右按钮采用 FlipView 资源样式，并非 FlipView 的逐项选择模型。两行用 `data-winui-scrollbars="hidden"` 声明隐藏 chrome，仍由全局适配器绑定 Rust ScrollViewer。竖向鼠标滚轮在仅横向可滚动时转为横向滚动，横向触控板输入保持原方向，端点继续接收输入；无横向溢出时让外层页面接收滚轮。箭头按当前 viewport 宽度调用租约的 `changeView`，动画由 Rust 推进，支持减少动画设置。浏览器保留卡片链接、触摸和焦点滚入可见区。

## 来源与复现

`node tools/extract-gallery-home.mjs` 从本机 `../WinUI-Gallery` 提取目录与 115 个图片资产，校验固定提交；也可传参考仓库绝对路径。来源文件和资产 SHA-256 记录在 `references/home-source.json`，目录在 `gallery/src/official-home.json`，图片及上游 MIT 许可证位于 `gallery/public/official/home/`。生成文件已随项目保存，日常开发无需再次提取。

```powershell
cd gallery
npm run dev
cd ..
node tools/prepare-gallery-page-validation.mjs
cd gallery
$env:GALLERY_PRODUCTION='1'
npx playwright test -c playwright.sample-pages.config.ts
$env:GALLERY_NAVIGATION_ROOT='../out/gallery-page-dev'
npx playwright test -c playwright.home-regression.config.ts
```

首页专项验证使用独立端口 5217，检查默认路由、官方目录与图片可访问性、资源卡片滚动、搜索、占位、收藏持久化、最近访问、真实 Button / NavigationView 跳转及卸载、三种主题、窄屏菜单、键盘导航和横向溢出。逐一点击全部已实现导航项，验证同一标题栏保持挂载、只有一个新版侧栏、没有旧标题栏/侧栏、当前入口正确选中；另检查跨页主题和搜索后的示例状态。截图保存为 `out/home-light.png`、`out/home-dark.png`、`out/home-high-contrast.png`、`out/home-mobile.png` 和 `out/gallery-shared-shell.png`；结果为 `out/sample-page-results.json`。原有以 `/` 启动 NavigationView 的测试改为显式访问其新路由。

最终首页与控件页专项运行在独立生产构建上，使用端口 5217。NavigationView 回归使用源文件快照与端口 5199，并关闭热重载，避免共享工作区构建期间的自动刷新中断交互；结果在 `out/home-navigation-regression-results.json`。

2026-11-08：早期共享外壳验收记录见 `references/home-validation.json`；当前复用 Rust NavigationView 的控件页布局、实际目录覆盖及构建指纹以 `references/sample-pages-validation.json` 为准。

验证范围是官方源码布局映射及浏览器实际行为和截图检查，不代表同条件原生窗口逐像素验收。
