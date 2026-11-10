# Community TableView

基准是用户指定的 `C:\Users\weixiaoxiao\source\repos\WinUI.TableView`，固定提交
`665fea52b8ad47a64187d0f202d5281b074f616f`。原项目的 ListView 派生实现、
CollectionView、列类型、TableViewCell、列头、筛选器、粘贴代码和 XAML 模板
已经阅读并留存关键源文件。逐文件 SHA-256 见
[来源清单](../references/table-view-source.json)。官方 Windows App SDK TableView
继续排除；Gallery 中的 TableView 入口现在指向这个社区版本。

原项目 MIT 许可证原文见
[LICENSE.md](../third_party/WinUI.TableView/LICENSE.md)，归属与移植说明见
[NOTICE.md](../third_party/WinUI.TableView/NOTICE.md)。不修改原参考仓库。

原项目声明的 Windows App SDK 依赖是 `1.6.250108002`（1.6.4）。对应的 WinUI
`winui3/release/1.6.4` 标签提交为 `262a901e0975c0d6e328b981a4dcc35e7034e135`；
源码关联及逐文件指纹见 [1.6.4 清单](../references/table-view-winui-1.6/source.json)。
本项目通用编辑器仍有自身的 SDK 基准，不能仅因复用它们就认定已经与 1.6.4 完全一致。

## 已运行的原生对照

先通过已注册的 `w-ahmad.TableViewSamples_dgt6ba9781sbg!App` 启动了本机社区
SampleApp，并核对进程路径。随后在 `out/table-view-native-source` 中构建固定提交的
副本，直接运行其 MainPage、Overview、Selection、Editing、Filtering、ColumnSizing 页面。
没有修改参考仓库或使用 computer use。

副本保留原控件、XAML 和原输入处理代码，只增加程序内采样入口，调整离线构建宿主，
并为 unpackaged 宿主修正嵌套资源 URI。它是**本地源码构建的、带采样代码的 SampleApp**，
不是 Store 发行版。二进制、运行参数和明确边界见
[运行记录](../references/table-view-native-run.json)。

固定对照表为 800×320 DIP、125% DPI、Segoe UI 14、六条相同数据、Light/Dark，
浅色强调色 `#0067C0`、深色 `#4CC2FF`，使用原项目英文资源。静态图通过原生
RenderTargetBitmap 获取；弹层和动画另用同进程窗口 PrintWindow 获取，记录实际采样时间。
强制 VSM 状态单独标记，不能当作真实鼠标输入验收。

原生脚本可以重新运行：

```powershell
python tools/run-table-view-native.py
```

原生输出在 `out/table-view-native`；`native.json` 包含视觉树和布局，
`*-own-window.png` 是窗口帧，`animation-metrics.json` 是同进程 OS 动画描述。
副本需要本机缓存的 .NET/Windows App SDK 和完整 Visual Studio MSBuild。

## 本轮按源码修正的部分

| 项目 | 原生依据与当前实现 |
| --- | --- |
| 默认尺寸 | 表头最小 32 DIP，行内容 40 DIP，行头最小 16 DIP；125% 下实际首格 x=17.6、y=32.8，行步长 40.8 |
| 留白及线条 | 生成内容的 12 DIP margin，以及不可见选择边框仍占用的测量约束；网格线默认 All，直接读取社区主题 brush 别名 |
| 表头 | 半粗字体；排序图标独立位于右上，选项按钮位于右下；空白行头不显示虚构的序号 |
| 筛选弹层 | 原顺序的排序/清除命令、搜索、Select All、SelectionMode=None 的复选框列表、等宽 Ok/Cancel；恢复打开时的搜索焦点 |
| 筛选状态 | 其他列过滤条件参与候选值计算；空白合并；数字按数值排序；计数排序；搜索重建复选状态；应用后清空选择 |
| 排序 | Ctrl 多列排序；升序→降序→取消；Sorting 后再发可取消的 ClearSorting 请求；按原版清空选择 |
| 编辑导航 | TextBox SelectAll；Enter 沿行方向移动，Tab 沿列方向移动，Shift 反向、跨边界循环；成功提交后延续编辑，校验取消时停留 |
| 列拖动 | 按目标表头左右半区计算插入位置；源表头绘制命令作为预览、上下标记、32 深度阴影；右侧缩放区不覆盖选项按钮 |
| 选择与滚动 | 默认右键不强制选择；支持原右键筛选开关；Ctrl+Shift+A、Ctrl+Shift+C；拖选边缘 40 DIP 内每 16ms、最高 20 DIP 自动滚动 |
| 时间编辑器 | 社区自定义的单段时间文本和时钟图标，复用 Rust 时间 flyout；不再显示普通 TimePicker 的三段输入面板 |
| 选中指示条 | 匹配 1.6.4 presenter 的 83ms opacity、167ms scale 与贝塞尔曲线；不使用 Uno 的 not_win storyboard 分支 |
| 视图刷新 | 原生排序帧确认同时淡入并从下方进入；匹配 EntranceThemeTransition 的 28 DIP、无 stagger 和本机测得的 667ms EnterPage 曲线 |

完整保留的 XAML IR 是 [table-view-template.json](../references/table-view-template.json)。
Rust 真正读取的紧凑资源、测量与动画契约是
[table-view-runtime.json](../references/table-view-runtime.json)，由原源码和同进程采样提取，
不是仅作归属登记的文件。资源移植仍按显式子集实现，以下未验收项不计为完成。

## 调研结果与架构

已有 SDK 的 ListView、ScrollViewer、Grid、文字、NumberBox、TextBox、CheckBox、
ToggleSwitch、ComboBox、CalendarDatePicker、TimePicker、Flyout 和 MenuFlyout 可以复用。
原项目不能直接运行在 Rust/WASM：它依赖 WinRT 依赖属性、CLR 反射绑定、
CollectionView 和 XAML 模板/Style，以及 Windows 剪贴板和文件保存接口。

本次新增 Rust TableView 节点、类型化属性、数据视图、稳定 ID 选择、编辑请求事务、
列宽分配和二维可见区生成器。原生 SDK 控件承担单元格内容、编辑器、筛选弹层和滚动条；
React 仅声明业务数据、模板内容并接收事件。没有 HTML table、CSS 表格或 JS 表格状态机。
滚动帧会重新排列可见单元格，冻结列的补偿随 Rust ScrollViewer 的呈现偏移同步。
快照省略完整业务数据，只报告视图 ID、选择、列和已生成的槽，业务对象由 TS 保留。

| 原设计 | 接入方式 |
| --- | --- |
| 自动列、显式列、列可见性 | Rust 根据对象字段生成；`columns` 定义覆盖和扩展 |
| Text / Number / CheckBox / ToggleSwitch / ComboBox / Date / Time / Hyperlink / Template | 同一个列描述，`kind` 选择现有 SDK 内容和编辑器 |
| 多列排序、筛选、live source shaping | Rust 数字/布尔/文本比较、过滤条件交集、搜索；源更新后重算 |
| 自定义排序/操作绑定 | `sortMemberPath`、`operationValue`；`onSorting` 可取消，调用方可提交外部排序数据 |
| Excel 筛选 | Rust Flyout、搜索、值复选框、计数、全选、清除和 Ok/Cancel |
| CellOrRow / CellWithRow / Cell / Row | `selectionUnit`；原 ListView 四种 `selectionMode` |
| 当前格、范围、拖选、快捷键 | 稳定 `row` / `column`；Ctrl、Shift、方向键、Home/End、PageUp/Down、Ctrl+A |
| 编辑事件 | BeginningEdit、PreparingCellForEdit、CellEditEnding、CellEditEnded；请求可同步取消 |
| 自动/像素/星列宽、最小/最大宽度 | `width` 接受 DIP 或 GridTrack；`columnAutoWidthMode` 控制测量对象 |
| 列顺序、冻结列 | 拖动列头、右边缘拖宽、`reorderColumn`、`resizeColumn`、`frozenColumnCount` |
| 行重排 | `canReorderRows`、拖动行头或 `reorderRow`；有排序/筛选/搜索时不改源顺序 |
| 自定义单元格、编辑器和列头 | React `renderCell` / `renderEditor` / `renderHeader`；普通 SDK 对应 template setter |
| 行头、行详情、详情冻结 | `renderRowHeader`、`renderRowDetails`、详情可见模式、`areRowDetailsFrozen` |
| 条件样式、交替行、网格线、紧凑行 | `cellStyle`、交替行 brush、分隔线 brush/thickness、`rowHeight={32}` |
| 行/格上下文菜单、角按钮 | `rowContextMenu` / `cellContextMenu`、ContextRequested、`cornerButtonMode` |
| ClipboardContentBinding、CSV | `clipboardValue` / `clipboardMemberPath`、copy/paste、`exportCsv` |
| 大数据、分页 | 二维可见区生成；`pageSize` / `pageIndex`；Gallery 使用 10,000 条源数据 |

## React API

组件使用已有 `SceneView` 宿主；WASM 初始化沿用现有 Provider，无需逐表初始化。

```tsx
<SceneView style={{ height: 320 }}>
  <TableView items={employees} />
</SceneView>
```

显式列、受控源和业务校验：

```tsx
<TableView
  items={employees}
  autoGenerateColumns={false}
  columns={[
    { field: 'name', header: 'Name', width: 200 },
    { field: 'age', header: 'Age', kind: TableViewColumnKind.Number },
  ]}
  onItemsChanged={setEmployees}
  onCellEditEnding={e => {
    if (e.table.cell?.column === 'age' && Number(e.table.value) < 18)
      e.cancel = true;
  }}
/>
```

默认使用行的 `id`，没有 `id` 时按业务对象身份自动分配稳定键，无需额外包装。需要跨服务端刷新/新对象保留选择时传入 `getRowKey`；`keyForItem(item)` 可读取键。自动列保持对象字段的声明顺序，并默认省略作为身份键的 `id`；需要显示时添加 `{ field: 'id' }` 即可与其余自动列并用。列 `field` 对业务类型检查；嵌套属性
使用 `path`，不绑定字段的模板列提供 `key`。业务值必须可 JSON 序列化；JS Date 应由
调用方转换成日期字符串，Time 列使用当天的分钟数。

修改后会给出新业务对象数组，不直接修改调用方对象。`format`、`operationValue`、
`clipboardValue` 和条件样式在提交业务源时计算，不逐帧调用。
模板回调返回 SDK React 控件，不能把 DOM 元素作为 Canvas 单元格内容。

编辑器模板的 `context.commit(value)` 和 `context.cancel()` 仍进入相同 Rust 编辑事务。
`onCellEditEnding` 可以修正 `e.table.value` 或取消。排序、开始编辑、结束编辑、列重排、
复制、导出和上下文请求均在回调返回后由 Rust 继续；通知事件的 `cancel` 不撤销已提交状态。复制/粘贴/导出请求完成后的结果事件带 `table.ready=true`，导出也可直接使用返回文本的 Promise。

## 普通 TypeScript SDK

```ts
host.style.height = '320px';
const scene = sdk.scene(host);
const table = scene.root.tableView({ items: employees });
const unsubscribe = table.onTableEvent(e => console.log(e.kind, e.table));
table.update({ frozenColumnCount: 1 });
table.sort('age', TableViewSortDirection.Descending);
table.filter({ column: 'department', values: ['Engineering'] });
table.beginEdit({ row: 'person-0', column: 'age' });
table.commitEdit(35);
const csv = await table.exportCsv();
unsubscribe();
table.dispose();
scene.dispose();
```

初始化、宿主尺寸与实际 `sdk.scene` 参数沿用项目其余控件文档。`exportCsv` 返回文本；
下载/文件保存属于调用方宿主。`copy` 使用浏览器 Clipboard API；`paste(text)` 可不读系统剪贴板，
无参数 `paste()` 需要浏览器允许读取。Ctrl+V 的文本输入由宿主转发，单元格修改由 Rust 执行。

## 明确差异

这些差异不是本项目已有基础控件能自动解决的部分，不把它们记成原生完全等价：

- 不执行任意 XAML、CLR 反射、WinRT Binding/Converter、Style、AutomationPeer 或
  `IColumnFilterHandler` 对象；相应业务表达使用上述类型化描述、回调、模板和外部数据源。
- 自动列依据 JSON 值类型推断，不能从字符串恢复 CLR DateTime/TimeSpan 类型；日期和时间列
  需要显式指定。排序当前使用确定性的数字/布尔/小写文本比较，未移植 .NET culture comparer。
- 表体使用统一行高，详情槽使用显式 `rowDetailsHeight`；尚无原项目任意可变行高和详情内容
  自然测量。模板内容仍正常由 Rust Measure/Arrange，超过槽尺寸按约束裁剪。
- 当前数据提交通道是 React/TS 的数组替换，视图刷新走已移植的 Entrance 过渡。
  原生 `ObservableCollection` 单条增删所触发的 AddDelete 分支尚未完整移植；
  不能把一次数组刷新当作原生增删行过渡。Content/Reorder 的完整生命周期和中断分支也未完成。
- 内置筛选值列表复用 Rust ListView 虚拟化，支持高基数值。鼠标拖选已加入源码的边缘自动滚动；触摸使用 Rust 滚动，并在未发生拖动的抬手时选择/双击编辑。触摸列头 resize/reorder 尚未建立原生输入对照。
- 筛选 CheckBox 的 Checked／Unchecked／Indeterminate 事件更新 Rust 草稿，Ok 提交，Cancel 丢弃；列表容器采用源码的 36 DIP 行高和 12 DIP 左右内边距。命中浮层后，指针路由在浮层边界终止，底层表格和滚动容器不再同时进入 hover。
- 浮层外部按下在 Rust 模板事件之前处理，先请求可取消的 light dismiss，消费该次按下；点击底层单元格、列头或表格空白处均关闭筛选器。ListView 等集合滚动宿主进入与 ScrollViewer 相同的滑块捕获路径，可在移出浮层后继续拖动，并在释放时结束。
- Rust TableView 按布局版本、尺寸、DPR、水平偏移和实际可见行范围复用排列结果；在同一行范围内的连续滚动只推进滚动变换，不重新测量单元格。行偏移和命中结果也复用，未缩短或禁用动画。表格文字先按布局位置栅格化，再由滚动变换移动，避免每帧重新取整基线造成跳动；冻结列保留独立的水平补偿。
- Rust Canvas2D 对相同的纯矢量命令、颜色、变换和物理像素相位复用栅格；开关等重复控件共用结果。缓存上限为 64 项／1,048,576 像素，卸载时释放。Backdrop、外部图像、文字等不进入这个缓存；DPR、主题、动画几何或颜色改变会使用新的结果。浏览器回归同时检查命中缓存及开关像素不变。
- 左上角菜单沿用 `TableViewHeaderRow.xaml` 的九个命令、分隔线、快捷键及控件状态条件。Select All、Deselect All、Copy、Paste 使用源码 Symbol，两个 CSV 导出使用 EDE1；源码未设置图标的命令保留空白图标列。`showExportOptions=false` 隐藏导出组。剪贴板读取只通过共享 TS 宿主进入同一 Rust 粘贴事务；浏览器剪贴板的文本可用性和权限在点击 Paste 时实际读取，不能同步复刻原生 Clipboard.GetContent 的类型查询。
- 粘贴支持带引号/多行 TSV 与 CSV、数字/布尔/ISO 日期/分钟或 HH:mm 时间转换和原子校验；只读格不被覆盖。`onPaste` 可同步取消或替换输入文本，`paste()` 的 Promise 在提交完成后解决，解析/类型错误时拒绝且不改源。任意 CLR ConverterBack 对象仍需通过业务层适配，SDK 不执行 CLR 代码。
- 无障碍投影提供 grid / gridcell / rowheader、选择、行列计数和真实焦点；不等同 Windows UIA
  Grid/Table/Selection/ScrollItem 等所有原生自动化 pattern。
- 尚未完成的原生验收包括：动态增删行逐帧矩阵、冻结/拖动/详情的完整状态矩阵、弹层 Acrylic/Composition、完整触摸列操作、高对比度系统模式和各编辑器的 1.6.4 像素矩阵。当前静态和程序触发的动画采样不能替代这些项目。
- 本项目按用户明确要求隐藏黑色焦点及当前格描边；保留焦点、选择和键盘导航。这是有意登记的原生外观例外，静态差异报告保留原始差异，不能据此声称完全像素一致。

## 验证与示例

Gallery 路由 `#table-view` 包含九组真实 SDK 示例，第一组可在默认、选格、选行、编辑、排序
状态之间切换，展示相同参数下的 Rust 实例与原生参考图。其余示例覆盖自动列、全部列类型、
编辑校验、数据视图、全部选择模式、列宽/冻结、模板/详情可见模式、剪贴板/重排和大数据。
源码面板直接提取页面中的 sample 标记。
默认 Canvas2D，可显式切换 WebGL2。所有有限取值的公开属性使用生成的 Rust/TS 枚举。

```powershell
cargo test --test table_view
cd gallery
npm run typecheck
npm run build
npx playwright test -c playwright.table-view.config.ts
```

测试覆盖数据视图、CSV 转义、选择及清除语义、可取消排序与编辑、粘贴原子性、源替换、
冻结列、大数据节点上界和销毁，以及实际浏览器的输入、筛选弹层、模板、导出、滚轮与键盘。
结果和截图位于 `out/table-view-*`。`table-view-visual-differences.json` 分区域记录浅/深主题
静态差异；它明确标记 `acceptedAsFullParity=false`，没有用平均像素误差或功能通过率
自动宣布整体还原完成。原生与浏览器的实际帧采样时间也不能视为同一条 presentation 时钟。

浏览器检查默认访问用户实际使用的 `http://127.0.0.1:5173/#table-view`，复用已有服务。
需要检查独立生产预览时可设置 `WINUI_TABLE_VIEW_BASE_URL=http://127.0.0.1:5407`。
新增回归直接点击筛选复选框、按空格、全选、取消和应用，并比较浮层外露表格的实际像素；菜单检查六个图标列的绘制像素。
回归还覆盖表格内部 light dismiss、筛选列表滑块拖出边界后的捕获／释放、行范围不变时的测量复用，以及连续滚动时不变的文字基线／栅格相位。所有这些行为由 Rust SDK 实现，Gallery 和 React 未加入替代事件处理或动画。
单元格的 CheckBox 和 ToggleSwitch 复用 SDK 控件自身的按下、捕获、移出／移回和释放流程，
不在表格 PointerDown 中直接翻转数据。有效释放或空格键释放后，Rust 将生成控件的状态事件
同步到列绑定；编辑中的可取消提交和调用方模板内的复选框仍使用各自原有的数据契约。
只读布尔列按社区源码保留启用外观并关闭命中。浏览器检查同时核对勾选／未勾选状态的
实际 Pressed 像素、移出释放不切换、键盘释放写回和 React 调用方接收更新。
过滤浮层的整个窗口区域由共享 Rust 命中测试持有，包括禁用命令、分隔线、外层 Padding、
内容 Margin 和按钮间隙；没有命中子控件时仍命中浮层本身。该边界与 SDK 已有 popup window
边界一致，避免这些区域把悬停／按下转交给下层表格。浮层外的正常行悬停仍保留。
Rust/WASM 还按各浮层的窗口矩形投影透明的输入接收区域，置于各自控件子树之下，
覆盖浮层伸到其他 Scene 上方时的空隙。区域不绘制控件，关闭／销毁后释放；减少动画时
也在当前投影完成后安装，不依赖后续动画帧。React/TS 产品代码无需添加事件补丁。
内部筛选项的 CheckBox 在集合容器测量前同步生成，使减少动画的首帧也包含所有可见选项，
不再依赖后续 RealizationChanged 或动画帧补齐模板。
性能采样脚本为 `node tools/benchmark-table-view.mjs before`／`after`，同一 5173 页面、Canvas2D、125% DPI 和 release WASM 下记录悬停、排序及滚动的 WASM／整帧耗时、RAF 间隔、长任务和产物指纹。结果在 `out/table-view-performance`；采样开启 CPU profiler，不能把测试机的单次帧率视为所有设备的恒定保证。

此前 60Hz 环境采样的表格绘制耗时 P95（含宿主投影）如下；原始分布和独立 RAF 间隔见[历史性能记录](../references/validation/table-view-performance.json)。该记录绑定旧产物，不代表当前 SDK 的高刷验收。

| 场景 | 修复前 | 修复后 |
| --- | ---: | ---: |
| 编辑示例悬停 | 20.5 ms | 8.5 ms |
| 编辑示例滚动 | 25.2 ms | 15.6 ms |
| 万行示例排序动画 | 16.7 ms | 9.5 ms |
| 万行示例滚动 | 18.3 ms | 9.9 ms |
原生 SampleApp 同时记录 Light/Dark 筛选浮层和左上角菜单视觉树。原生 MenuFlyout 使用独立窗口，主窗口 PrintWindow 不包含它，不能把该主窗口帧当作菜单像素对照；图标与几何依据原菜单视觉树和源码。

当前功能结果、原生来源、产物指纹、静态差异和未完成项目分别登记在
[分项验证记录](../references/validation/table-view.json)。可在完整浏览器检查结束后运行
`python tools/record-table-view-validation.py --rust-passed 129 --rust-command "cargo test --locked --test table_view --test overlays --test composed --test picker_controls --test input_behavior --test table_view_check_press --test table_view_frozen_edit --test collections"` 更新本次已观察到的结果；
该参数是本次 Rust 命令的通过数，脚本不会把测试数量当作原生还原结论。

## 120Hz 专项复核

本轮渲染、缓存、布局和动画修复都在 Rust SDK。Gallery/React 业务层没有添加交互、
样式或调度补丁，公开 React API 无需增加高刷开关。时间线继续按实际毫秒采样，
没有将 667ms 表体进入、83ms 指示条透明度、167ms 指示条缩放改短或按 60Hz 取整。

Canvas2D 为互相隔离的可见行保留原始 DPR 栅格，将连续滚动与表体进入保留为组合变换。
缓存限制为 128 项、4,194,304 个物理像素；Glyph 使用共享 LRU，纯矢量缓存由行和透明度层共享。
纯内容透明度层不再复制无用的背景表面，外部图像和材质仍按原依赖绘制。
WebGL2 展开相同绘制命令，保持后端语义一致。

垂直虚拟化只测量、排列新进入的行，保留仍可见的单元格。未变化的静态行还可以共享
显示列表；编辑器、不在静态集合内的控件、活动视觉状态和材质动画都继续逐帧采样。
数据、布局、主题、指针状态或版本变化使缓存失效。详情和自定义行头保留原来的排列与绘制顺序。
修复同时移除了表格 ToggleSwitch 上错误继承的 On/Off 文本，遵循社区列的 null 默认值。
内置编辑器按单元格约束横向填充，NumberBox 的编辑焦点进入现有 InputBox 模板部件并选中
数值，复用 SDK 的输入、清除按钮和聚焦底边，修复此前编辑器窄小且没有真实输入焦点的问题。

冻结列编辑的修复同样位于 Rust：焦点滚入视图等到 Canvas 子节点最终坐标刷新后执行，
非冻结单元格的可见区域扣除冻结列，键盘切换使用排列后的物理像素列宽，避免横向滚动回跳。
模板编辑内容异步挂载时只自动聚焦一次，随后保留输入框与模板按钮之间的正常焦点切换。
ComboBox 使用现有集合属性传入选项，并在初始化时同步选中项文字；下拉内容继续由 SDK 浮层绘制。
浏览器回归实际拖动横向滑块到最右端、双击 Notes 编辑，并检查 Department 已选文字、
表格边界外选项的绘制像素、选择与 Enter 换行后的滚动位置。对应截图为
`out/table-view-frozen-right-editor.png` 和 `out/table-view-frozen-combo-popup.png`。

高刷脚本在同一个 Chromium Headless Shell 进程内按旧、新、新、旧的顺序运行，
固定 release WASM、125% DPI、Canvas2D 和 8.33ms 预算，保留全部四轮数据。
统计分别列出 CPU 绘制、WASM 阶段、输入耗时、最慢帧、实际 RAF 间隔和超预算帧；
两轮的原始帧合并统计，RAF 间隔不跨页面时钟拼接。Vite 热更新仅在验收会话中冻结，
防止其他开发中的页面替换正在采样的节点。

原生对照重新运行固定社区源码的 SampleApp，使用相同业务数据、Light 主题、#0067C0
强调色、776.8×360 DIP、125% DPI、40 DIP 行高、32 DIP 列头和冻结列参数。
场景包含 24 行九列的编辑表、万行四列表、排序、0→300 DIP 滚动，以及 Age 编辑器
保持打开时的 0→180 DIP 滚动。RTB、独立窗口读回和 Rendering 回调分开采样，
避免把截图读回开销记成原生帧耗时。整个流程通过 CLI 和应用内采样完成，未使用 computer use。

当前机器的原生 Rendering 回调约为 60Hz。受控 120Hz 采样和 CPU 预算可用于排查慢帧，
不能证明物理高刷屏上的 120Hz 呈现。原生排序的 ListView 锚定、部分编辑器及开关几何、
文字与矢量栅格差异仍单独记录；隐藏黑色焦点框仍是用户指定的外观例外。
万行数据中有相同年龄；原生与 Rust 对这些等值行的排列不同。排序后滚动图的原始像素误差
因此包含不同业务内容，该场景明确标为不能用于纯渲染验收，不把它混作文字栅格误差。
静态差异、动画时序、CPU 预算和功能检查没有合并成一个“还原完成”的通过结论。

最新分布、逐轮结果、原生差异和产物指纹见
[120Hz 验证记录](../references/validation/table-view-120.json)。
复查命令：

```powershell
node tools/export-table-view-performance-fixture.mjs
python tools/run-table-view-native.py --performance
node tools/benchmark-table-view-120.mjs pair
node tools/capture-table-view-native-performance.mjs
node tools/compare-table-view-raster.mjs out/table-view-sdk-final out/table-view-120-final
python tools/compare-table-view-native-performance.py
python tools/record-table-view-120.py
```

两份 WASM 基线在 `out/table-view-sdk-final` 和 `out/table-view-120-final` 中固定保存。
原始帧分布在 `out/table-view-120/paired-*.json`；原生和 Rust 的编辑/滚动截图与几何
在 `out/table-view-native-performance`，四种 DPR 的实际 Canvas 像素差异在
`out/table-view-raster-comparison`。MIT 原文继续随 SDK 声明和 Gallery 生产资源分发。

## 按列分组（社区正式版 1.5.1）

用户授权后，分组采用正式 NuGet `WinUI.TableView 1.5.1`，源码标签提交
`6de5f1cf388747e7ed046d5180815ca28c59f525`。原有 `665fea5` 源码输入继续保留，
新增完整来源补充在 `references/table-view-1.5.1`；包、实际加载 DLL、WinUI 1.8.260528001
依赖及源码指纹见 `references/table-view-grouping-release.json`。新版本 MIT 原文随
Gallery 和 SDK 声明复制到 `licenses/WinUI.TableView/v1.5.1/LICENSE.md`。

```tsx
<TableView items={employees} groups={['department', 'active']}
  defaultGroupState={TableViewGroupState.Expanded}
  areStickyGroupHeadersEnabled />
```

数组顺序就是层级。高级描述允许 `direction`、`sortMode`、业务 `value(item)` 和
`compare(a,b)`。例如按年龄段分组：

```tsx
<TableView items={employees} groups={[{
  column: 'age', value: row => Math.floor(row.age / 10) * 10,
  sortMode: TableViewGroupSortMode.Count,
  direction: TableViewSortDirection.Descending,
}]} />
```

业务函数只在数据/描述变化时求值并传递键与比较秩；分组、计数、排序方向、展开状态、
可见行、布局、命中、绘制、虚拟化和吸顶均由 Rust 持有。组头不是业务数据行。
`renderGroupHeader(group)` / 基础 SDK `setGroupHeaderTemplate` 只提交普通 SDK 子控件到
Rust 创建的原生内容槽。组头参数包含 key、count、level、path、isExpanded 和稳定 id。

列菜单提供 Group/Ungroup、Sort Groups by Count/Value；左上角菜单提供 Ungroup All。
`canGroupColumns`、列 `canGroup` 默认 true。Grouping 事件可同步设置 `event.cancel=true`。
默认组状态为 Collapsed，按钮隐藏时仍保留缩进。Count 排序数量相同时始终按键升序。

基础 SDK 与 React onReady 返回的控制器相同：`group(column)`、`ungroup(column)`、
`ungroupAll()`、`toggleGroup(groupOrPath)`、`expandGroup`、`collapseGroup`、
`expandAllGroups()`、`collapseAllGroups()` 和 `sortGroups(column, mode, direction?)`。
例如 `table.collapseGroup(['Engineering', true])`。无需调用方管理内部节点或伪造组 id。

Gallery 新增 `table-grouping` 完整示例，包含多级、吸顶、数量排序、自定义模板和万行切换。
`tools/run-table-view-grouping-native.py` 在隔离源码目录运行社区 SampleApp，并引用未经修改的
正式 NuGet DLL；先打开原始 GroupingPage，再记录相同数据、尺寸、125% DPI 下的浅/深色
折叠、展开、滚动、两级、折叠一级和数量排序共 12 个状态。对照夹具按 Age 升序，确保同组行
有确定顺序。静态 RenderTargetBitmap 不是发行窗口 Composition 或物理 120Hz 验收，
完整原生一致性与高刷新率接受状态仍单独记录，不以功能测试通过替代。


分组模板与输入的补充边界：组头使用 `groupHeaderHeight` 指定统一高度（默认 36 DIP），
不承诺任意模板自然测量的逐组可变高度。原生对照目前在 125% DPI 的固定尺寸下仍有组头
右边界 0.8 DIP（一个物理像素）宽度差异，文字抗锯齿也有残余差异。功能与静态对照证据
分别记录，不能据此标记全部材质、系统高对比度或物理 120Hz 已验收。


本轮分组验收结果见 `references/validation/table-view-grouping.json`：实际页面包通过
140 项相关 Rust 检查和 26 项浏览器检查，并保留正式 DLL 的 12 个静态状态对照。
单独运行的 120Hz CDP 采样中，滚动绘制耗时 P95 为编辑 8.8ms、活动编辑器 8.0ms、
万行表 7.1ms、万行分组表 8.5ms（分组惯性滚动 9.4ms）。120Hz 每帧预算为 8.33ms，
因此所有路径稳定 120fps 与物理显示器呈现仍未通过验收。该结果与并行测试时的负载采样
分开保存；不可把请求频率、CPU 绘制耗时或功能通过数解释为实际显示帧率。


### 分组箭头的实际变换回归

后续截图反馈发现，旧实现只给 FontIcon 的 `props.rotation` 赋值，实际绘制读取的
`Presentation.rotation` 仍为 0，因此数据已折叠，箭头却继续朝下。现在组头通过 Rust
`Scene::update` 的属性提交链路同步旋转和绘制失效；展开为 0°、折叠为 -90°，与 1.5.1
模板的 VisualState setter 一致。这里没有修改 React/Gallery 的控件行为。

新增检查先在旧包的实际像素上复现，再检查单组折叠、重新展开、全部折叠，覆盖
Canvas2D/WebGL2、浅/深色。WebGL2 在同一绘制任务中读取像素，避免已丢弃的交换缓冲区
造成空白采样。验证同时检查字形的实际方向和世界变换，并独立读取原生折叠箭头像素。
前一轮只验证组状态、几何与整块像素误差，未单独限制箭头方向；本次补上该验收缺口。
详细结果见 `references/validation/table-view-chevron.json`。
