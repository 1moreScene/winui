# CommunityToolkit Segmented

在 `SceneView` 中直接声明项目。与 XAML 的 `Content` 对应，文本可以用
`content` 属性或 JSX 文本子项。也可以在 `SegmentedItem` 内放置 SDK 内容控件。

```tsx
import {SceneView, Segmented, SegmentedItem} from 'winui-wasm/react';

<SceneView autoHeight>
  <Segmented selectedIndex={0} onSelectionChanged={e => console.log(e.selectedIndices)}>
    <SegmentedItem content="Day" icon={'\uE8BF'}/>
    <SegmentedItem>Week</SegmentedItem>
    <SegmentedItem content="Month" enabled={false}/>
  </Segmented>
</SceneView>
```

普通 TypeScript 可从任意容器调用 `segmented()`。

```ts
import {EventKind} from 'winui-wasm';

const control = scene.root.segmented({selectedIndex: 0});
control.segmentedItem({content: 'Day'});
control.segmentedItem({content: 'Week'});
const off = control.on(EventKind.SelectionChanged, event => {
  console.log(event.selectedIndex, control.selectedItems);
});

control.selectedIndex = 1;
// 卸载时取消订阅，释放控件及其子项。
off();
control.dispose();
```

数据源使用 `itemsSource={['Day', 'Week']}` 或带 `content`、`icon`、
`enabled`、`visible`、`isSelected` 和 `name` 的项描述。带 `name` 的项在
重新排序时保留容器身份和选中状态。普通 SDK 可用 `setItemsSource()` 更新源，
源容器在 Rust 布局后出现在 `items` 中。直接声明和数据源二选一。

`selectedIndex` 默认为 `-1`。用 `ListViewSelectionMode` 选择
`None`、`Single`、`Multiple` 或 `Extended`，其中 `Extended` 支持
Ctrl 切换和 Shift 范围选择。方向键默认仅移动焦点，Space 或 Enter 激活当前项。
可用 `singleSelectionFollowsFocus` 在单选时让选择随焦点移动。

`SegmentedStyle.Default` 使用等尺寸分段和选中指示条，`Pivot` 与 `Button`
按内容测量。用 `Orientation.Vertical` 切换纵向布局。图标属性接收 Segoe Fluent
Icons 字形。样式枚举对应 Toolkit 随控件提供的三套样式。WinRT 绑定、任意 XAML
`ControlTemplate` 与平台自动化对象不属于这套 Web API。

Gallery 的 `#segmented` 提供基本、样式和切换内容三个例子。浏览器验收覆盖指针、
方向键焦点、Space、禁用项、多选、数据源和选择回调。Rust 回归覆盖主题绘制、
数据源重排以及选中条按下到一半时松开、从当前宽度反向展开。

用固定提交的 C# 和 XAML 构建原生探针，输入与浏览器对照页相同。浅色和深色在
100% 缩放下测得相同的控件外框尺寸（DIP）。

| 模板 | 原生 / 浏览器 |
| --- | --- |
| 默认横向 | 272 × 32 |
| Pivot 横向，含图标 | 175 × 84 |
| Button 横向，含图标 | 243 × 41 |
| 默认纵向 | 58 × 176 |

Default 的选中边框使用 `ControlElevationBorderBrush` 填充控件内侧的环形区域。
选中条位于底边内侧，纵向按源模板变换。Pivot 的内容容器为纵向 StackPanel，
即使分段横向排列，含图标的项也按模板上下摆放。
在 100% 缩放的浅色、深色截图中，选中与未选中分段的 24 个直边和背景采样点 RGB 一致。

原生探针对 `PressedSelected` 和 `PointerOverSelected` 采样，记录选中条从 4 倍缩到
2 倍再恢复。浏览器在 100% 和 125% 缩放下用真实鼠标操作，采样到 16 → 8 → 16 DIP
及中间宽度。XAML 提供的 83 ms 背景画刷过渡和 167 ms 选中条曲线由 Rust 执行。
原生截图使用系统强调色和 Segoe 图标，浏览器使用项目强调色和便携图标字体。
原生对照在 100% 缩放下运行，125% 结果来自浏览器。测量记录见
[对照数据](../references/validation/segmented-visual.json)。

```powershell
./tools/run-segmented-native.ps1
node tools/capture-segmented-browser.mjs
```

浏览器脚本使用运行中的本地 Gallery。两组脚本分别在 `out/segmented-native/capture`
和 `out/segmented-browser` 写入截图和采样数据。

基准为 [CommunityToolkit/Windows 的固定提交](https://github.com/CommunityToolkit/Windows/tree/a2fa47ad72cb95ed81f3ff0885da627a5fd6c14e/components/Segmented)。
关键 C#、XAML、上游样例和许可证保存在 `third_party/CommunityToolkit.Segmented`。
逐文件指纹见 [来源清单](../references/segmented-source.json)，
MIT 原文见 [License.md](../third_party/CommunityToolkit.Segmented/License.md)。
Gallery 与 npm SDK 的 `THIRD_PARTY_NOTICES.txt` 均包含该许可证。
