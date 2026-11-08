# 内容承载与页面导航批

2026-11-08 开始，2026-11-09 完成最终验证。本批实现 **ContentControl、ContentPresenter、UserControl、Page，以及共享 Scene 内的 Frame**。公开名称 `SceneFrame` 用来区分此前已有的独立 `Frame<T>`；两者复用 `src/frame.rs` 的同一份 Rust 历史、缓存与转场核心。

本批没有修改 ItemsView、AnnotatedScrollBar、PagerControl、LayoutPanel、RichTextBlock 的专属实现。共享入口按需增加分派。

## 实现边界

- Rust 负责内容所有权、单根约束、模板实例化、Measure/Arrange、命名查找、可见性、输入门控、缓存清理和 Canvas 绘制。JS/React 只绑定属性、事件和业务操作。
- ContentControl 支持字符串、一个显式子节点或 `contentTemplate`，三种来源互斥。模板替换释放旧节点；字号或换行属性变化重新测量。默认内容对齐为 Left/Top；原生默认模板不传递边框厚度。
- ContentPresenter 默认 Stretch/Stretch，按 CContentPresenter/CBorder 计算边框和 padding，再按内容对齐安排唯一子节点。分数 DPI 的边框布局采用同 SDK 探针观察值；仍有一个物理像素以内的布局差异。
- UserControl 和 Page 直接安排唯一内容根到可用矩形；它们不采用 ContentPresenter 的 padding、border 和内容对齐算法。字符串便利接口在 Rust 内创建 TextBlock。继承的 padding/border/内容对齐属性不会改变原生单根布局。
- `ContentTemplate` 是有明确范围的类型化 Scene 描述，支持常用布局、文字、输入、按钮、形状和内容宿主；并非完整 XAML/DataTemplate 运行时。未知节点、非法属性、多个根、超深或超预算模板会明确失败。
- `findName` 查找模板中的 `name` 或显式子树的 `layoutKey`，不穿透嵌套 Page/UserControl。模板内的业务按钮可通过返回的 SDK 控件对象订阅事件；调用方不处理原始节点协议。
- SceneFrame 使用注册页面类型、按需生成 Page、Enabled LRU/Required 缓存、前进/后退、刷新、清空历史和数字业务参数。页面定义在保留页面或等待导航确认时不可替换。导航通过 Rust 请求/提交两阶段执行；`onNavigating` 同步设置 `cancel` 时保留历史、缓存及当前内容。重复/过期确认不重复提交。
- Entrance、SlideFromLeft、SlideFromRight、Suppress、减少动画策略复用已存在的 Rust Frame 核心。动画期间输入按核心投影禁用；离场页不接收输入，缓存页在终态隐藏，页面绘制顺序不依赖实例分配顺序。浏览器仅提供时钟和无障碍/编辑宿主投影。

## 公共调用

```tsx
<ContentControl content="Hello" />
<ContentPresenter horizontalContentAlignment={HorizontalAlignment.Center}>
  <Button text="Save" onClick={save} />
</ContentPresenter>
<UserControl><StackPanel>{/* existing SDK controls */}</StackPanel></UserControl>
<Page title="Account"><TextBlock text="Account" /></Page>
<SceneFrame pages={pages} onReady={frame => frame.navigate('home')} />
```

```ts
const host = scene.root.contentPresenter({
  contentTemplate: { kind: NodeKind.Button, name: 'save', properties: { text: 'Save' } },
});
// After the scene's first arranged frame:
const button = host.findName('save') as Button;
const unsubscribe = button.onClick(save);
host.update({ contentTemplate: null, content: 'Saved' });
unsubscribe();
host.dispose(); // Releases the Rust subtree; repeated dispose is safe.

const frame = scene.root.sceneFrame({ pages, cacheSize: 2 });
const release = frame.onNavigating(event => { event.cancel = hasUnsavedChanges; });
frame.navigate('home', { transition: NavigationTransition.Entrance });
frame.goBack();
frame.goForward();
release();
frame.dispose();
```

Gallery 路由：`#content-control`、`#content-presenter`、`#user-control`、`#page`、`#scene-frame`。官方目录的 `CustomUserControls` 与 `PageTransition` 分别连接 `#custom-user-controls` 和 `#page-transitions`。温度转换示例保留官方业务流程，使用已实现的 NumberBox 输入；官方 CustomUserControls 的密码校验子类示例不在本批验收内。源码区显示实际运行片段。

## 来源和验证

- 固定 WinUI commit：`7b12709347527238494ca28cb9fed326d513e779`。18 个 C++/头文件及 SHA-256 见 `references/content-hosts-sources.json`。以 ContentPresenter.cpp 的唯一子元素、合并边距和内容对齐为基础；Page_Partial.cpp 的直接 Measure/Arrange 单独处理。
- 固定 Gallery commit：`7360ac322414e118eadfb0c7c2f4ecc31a218f59`。原始输入保存在 `references/gallery-input/CustomUserControls` 和 `PageTransition`；页面摘要在 `gallery/src/official-content-hosts.json`。
- 独立原生探针使用解析的 `Microsoft.WindowsAppSDK/2.5.4-experimental` / WinUI `2.3.10-experimental`。捕获浅色/深色 50 个状态；其中四个内容宿主的 **40 个状态**进入 Rust 几何比较，最大误差 **0.8000031 DIP**（125% 下约 1 物理像素）。另 10 个原生 Frame 任意内容状态仅作参考：SceneFrame 本批公开接口要求导航到 Page，未把这些状态计入通过数。
- 本批 11 项 Rust 集成测试覆盖替换/回收、所有权、批量更新原子性、取消及过期确认、命名作用域、缓存编辑状态、历史和离场输入。最终 Rust 全回归共 355 项通过。
- 浏览器用例覆盖 5 个页面、实际输入/点击、返回后编辑状态、取消、事件解绑/销毁、Canvas2D/WebGL2、三种主题和 125% DPR。本批浏览器 11 项、生产包 8 项，以及既有 Frame 集成回归 8 项使用固定源码/WASM 快照验证；最终结果和指纹见 `references/content-hosts-status.json`。快照位于 `out/content-hosts-test-snapshot`，用于避开其他会话引起的开发服热更新，生产包为 `out/content-hosts-production`。记录时两个共享 TS 文件另有菜单接口改动，已保留并在状态文件中标记源码差异；本批控件代码未被覆盖，生产包与测试 WASM 指纹一致。

可复现命令：

```powershell
python tools/fetch-content-hosts.py
pwsh tools/run-content-hosts-probe.ps1
cargo test --test content_hosts
node tools/build-wasm.mjs
cd gallery
npm run typecheck
npm run dev -- --port 5216 --strictPort
# Another terminal in gallery:
npx playwright test -c playwright.content-hosts.config.ts
```

## 尚未验收

这批不是 WinUI 的完整视觉或对象模型等价实现。完整通用 XAML 模板/绑定、任意业务对象 DataTemplateSelector、页面序列化状态、导航失败虚方法与 Page 虚方法的完整投影、系统 AppBar/窗口布局边界、跨页面自动焦点恢复、完整 UIA 和 Store 发行版 Composition 逐帧/像素对照仍未完成。当前命名接口不提供编译期名称类型推导；调用方可按返回节点的 `kind` 缩窄/转换类型。原生探针的静态图和几何矩阵不替代这些验收。
