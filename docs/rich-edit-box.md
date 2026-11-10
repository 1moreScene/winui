# RichEditBox

入口：`/#rich-edit-box`。Rust 实现位于 `src/scene/rich_edit.rs`，共享编辑链路位于 `src/scene/text_edit.rs`。普通 TS SDK 和 React 都调用同一个 Rust Scene；透明 textarea 只负责浏览器输入、IME、剪贴板数据传输和无障碍投影，文字、选区、光标、格式、换行、命中和历史由 Rust 执行。

当前提供 RTF 导入/导出、PNG/JPEG 嵌入图片、Presentation MathML 公式及可编辑文档、粗体、斜体、下划线、删除线、字号、字体、颜色、段落对齐、项目符号、十进制和大写罗马编号。选区使用 UTF-16；左右导航按字素移动，上下/Home/End/Page 导航采用 Rust 的富文本行几何。折叠选区的格式用于后续输入，已有内容保持原格式。编辑与格式共用 100 步撤销/重做，输入法草稿在提交前不改写文档。程序设置 text/document 会清空旧历史；事务中的非法文档不会部分提交。

普通 SDK：

```ts
import {WinUI, RichEditListStyle} from 'winui-wasm';

const ui = await WinUI.create();
const scene = ui.scene(host);
const editor = scene.root.richEditBox({
  header: 'Document', height: 200,
  document: {runs: [{text: 'Hello '}, {text: 'world', format: {bold: true}}]},
});
editor.select(6, 5);
editor.formatSelection({foreground: '#ff0000', underline: true});
editor.formatParagraph({listStyle: RichEditListStyle.Bullet});
const unsubscribe = editor.onTextChanged(event => console.log(event.text));
const saved = editor.document; // 独立的可序列化快照
editor.replaceSelection('Rust');
editor.undo();
editor.setDocument(saved);
unsubscribe();
editor.dispose(); // 也可以统一 ui.dispose()
```

React 直接接受同一组属性：

```tsx
<SceneView autoHeight>
  <RichEditBox height={200} text="Hello" onReady={editor => editor.selectAll()}/>
</SceneView>
```

Rust 调用使用类型化 `Input::RichEdit` 和 `scene::rich_edit::{RichEditCommand, CharacterFormat}`，例如 `RichEditCommand::Format { format: CharacterFormat { bold: Some(true), ..Default::default() } }`。`NodeProperties.document` 是同一份 `RichEditDocument`；不在 TS 保存另一份编辑状态。

文档 schema 为 `{runs: [{text, format?, image?, mathml?}], paragraphs?: [{alignment?, listStyle?}]}`。LF 分隔段落，不隐含 WinRT TOM 的文末回车；`text` 是 Rust 从 runs 导出的纯文本视图，内嵌对象在此视图中占一个 U+FFFC。一次创建/更新选择 text、document、rtf、mathML 中的一项；冲突报错。formatSelection/formatParagraph 仅修改显式传入的字段。颜色使用 `#RRGGBB` / `#RRGGBBAA`；高对比度和禁用状态优先采用主题前景。不同字号参与行高、选区和光标计算，窗口和 DPR 改变后重新布局。连续选区按可视片段合并填充，避免分数字符边缘的细缝；高对比度选中文字使用系统 HighlightText 资源。

Gallery 的基本输入、格式菜单、自定义编辑器继续使用同一 Rust 控件；另有 RTF/图片示例、分数/根式/矩阵示例及可编辑 MathML 源码示例。源码面板对应实际运行的 SDK 调用。文件选择器与系统 Share 不在范围内，没有用浏览器替代实现。

## RTF、图片与 MathML

```ts
const editor = scene.root.richEditBox({rtf: initialRtf, height: 240});
editor.loadRtf(rtfString);                 // 或原始 Uint8Array 文件字节
editor.insertRtf(fragmentRtf);             // 替换当前选区
editor.insertImage({source: pngDataUrl, width: 96, altText: 'Diagram'});
editor.insertMathML('<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>');
const savedRtf = editor.getRtf();
const selected = editor.getSelectedDocument();
editor.replaceSelectedDocument(selected);
editor.undo();
```

React 支持直接初始化：`<RichEditBox rtf={rtf} />` 或 `<RichEditBox mathML={xml} />`。一次更新只选择 text、document、rtf、mathML 中的一项，冲突或非法输入整体报错。命令式导入保留一个完整撤销步骤；受控属性更新清空旧历史。导入、图片插入与粘贴均遵守只读/禁用状态，异步图片粘贴会校验 Rust 文档代次，避免覆盖已替换的文档。

文档 run 可包含 `image: {source, width, height, altText?}` 或 `mathml: string`，此时 text 必须为一个 U+FFFC。每个对象占一个 UTF-16 位置，参与 Rust 行高、基线、换行、命中、选区、删除、IME 草稿和历史，不会在正文编辑时被转成普通占位文字。图片调用接口省略宽高时读取编码尺寸，省略一个维度时保持纵横比。颜色和公式背景在高对比度选区中使用系统资源；原始图片保持像素内容。

RTF 解析器支持嵌套组、Unicode/surrogate 与 fallback、字体/颜色表、粗体/斜体/单下划线/删除线、字体字号、段落对齐、扁平列表、PNG/JPEG 图片的 hex 或 bin 数据，以及常见 OfficeMath 分数、根式、上下标、上下限、括号和矩阵。原始字节导入支持 125x、936/GBK、950/Big5、932/Shift-JIS、949、874 和 UTF-8。字号在 half-point 与 DIP 间转换，图片目标尺寸在 twip 与 DIP 间转换；TOM 导出末尾的 NUL 也可读取。

RTF 不支持的可见格式或内容会报错，包括 OLE、WMF/EMF、表格、定位对象、字段/超链接、复杂修订、嵌套列表及非 MathML 的 super/sub。OfficeMath 导出具有明确结构范围；不能表达的 MathML 布局（例如 mpadded）会报告错误，调用方可以保存 MathML 或 SDK 文档。SDK 在标准 OfficeMath 数据旁使用可忽略的 winuiMathML 元数据保留原始 MathML；其他 RTF 阅读器是否保留此扩展由其自身决定。

MathML 支持 mi/mn/mo/mtext/ms、mrow、mfrac、msqrt/mroot、msub/msup/msubsup、munder/mover/munderover、mfenced、mtable/mtr/mtd、mstyle、mspace、mphantom、mpadded、部分 menclose、merror 和 semantics。支持常见数学实体、命名空间前缀、数学颜色/字号/变体及样式继承。XML 不加载 DTD 或外部实体，未实现的元素和属性报错。`setMathML` 替换整篇，`insertMathML` 替换选区；`getMathML` 导出完整公式和 mtext 正文，存在栅格图片时会明确要求改用 RTF/文档导出。

公式采用 Rust 排版和 Cambria Math 字体，由同一显示列表在 Canvas2D/WebGL2 绘制，不依赖 DOM MathML、截图或前端公式状态机。公式内部通过 MathML 编辑，外层按整式对象选择、替换和撤销；**原生 MathOnly 的实时 UnicodeMath 转换、二维公式内部光标/编辑、完整 OpenType MATH 排版和全部 MathML 3 元素尚未实现**。这是支持范围，不是原生数学引擎等价声明。

剪贴板桥传输 `text/rtf`、SDK 富文档 JSON MIME 和纯文本；纯文本包含图片替代说明及公式线性表达。可以接收 RTF、SDK 文档及 PNG/JPEG 文件粘贴。浏览器/操作系统是否提供这些 MIME 由宿主决定；提供的富格式始终由 Rust 解析、验证和修改，不在 TS 另建文档模型。

资源限制：每个图片编码不超过 8 MiB、8192 边长/3200 万像素；文档嵌入负载和 RTF 输入/输出不超过 24 MiB；MathML 每式不超过 128 KiB、4096 节点、48 层及单 token 256 字符。PNG 验证块结构和 CRC，JPEG 验证帧/尺寸；实际图像解码复用浏览器宿主和 SDK 图片资源链。

## 来源与验证

固定版本继续使用 Gallery `7360ac322414e118eadfb0c7c2f4ecc31a218f59`、WinUI `7b12709347527238494ca28cb9fed326d513e779`、NuGet WinUI `2.3.10-experimental`。`tools/extract-rich-edit.py` 与 `references/rich-edit-template.json` 保留 SDK 模板、源码指纹及五个官方示例。RTF 互操作样本来自本机同版本 WinUI 的真实导出；Rust 示例 `examples/rich_edit_formats.rs` 生成自包含图片/公式 RTF。

MathML 语义参考 [W3C MathML 3 Presentation Markup](https://www.w3.org/TR/MathML3/chapter3.html)，代码页转换使用已锁定的 [encoding_rs 0.8.35](https://docs.rs/encoding_rs/0.8.35/encoding_rs/)。原生数学模式的差异参考 [SetMathMode](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.text.richedittextdocument.setmathmode?view=windows-app-sdk-2.0)。

```powershell
cargo test --locked
cargo run --locked --example rich_edit_formats
./tools/run-rich-edit-probe.ps1
cd gallery
npm run typecheck
npm run build
$env:PW_CHANNEL='chrome'
npx playwright test -c playwright.rich-edit-formats.config.ts
```

原生探针已修复同一控件重复挂载时未解除旧父节点的问题，现在可完成浅/深色的 18 个样例，包括 RTF、图片、MathML 和 RTF 数学模式。此前 0x800F1000 记录为历史失败，不再据此标记本批原生验证受阻。**原生默认 NoMath 模式会移除 RTF 中的数学区；公式 RTF 必须在 MathOnly 模式验证**，这与 SDK 可在同一文档混排文字/图片/公式的模型不同。探针、截图和真实导出记录位于 `references/rich-edit-native.json`、`references/rich-edit/native-*.rtf` 与 `out/rich-edit-native/`。

当前仍未接受原生逐像素/动画等价、大型图片文档的全面性能等价、自动选择菜单、内部滚动条完整模板、触摸选区手柄与全部 TOM API。核心旧批验证记录见 `references/validation/rich-edit.json`；本次格式扩展的命令、结果、产物指纹和对照边界记录在 `references/validation/rich-edit-formats.json`。

完成上述验证后，可用 `python -X utf8 tools/record-rich-edit-formats.py` 汇总现有日志和产物；脚本不会代替或运行测试。
