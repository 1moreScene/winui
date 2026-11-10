# 日期、时间与颜色控件

CalendarView、CalendarDatePicker、DatePicker、TimePicker、ColorPicker 已接入 Rust Scene、typed TS API、React 组件和 Gallery。Rust 负责控件树、布局、值、选择、输入、材质、动画与浮层生命周期；TS 的 Intl 适配只提供平台格式字符串与字段顺序。

## 固定来源

- WinUI `7b12709347527238494ca28cb9fed326d513e779` 的 98 份源文件，见 `references/picker-controls-sources.json`。
- 同 SDK `Microsoft.WindowsAppSDK.WinUI/2.3.10-experimental` 的 23 个样式、167 个画刷键、模板、部件、VSM、尺寸和日历动画时间线。
- 固定 Gallery 的 19 份示例及语言清单源文件。页面直接按固定仓库的 8 个用例展示，`.txt`、页面 XAML、代码后置和语言清单共同作为展示基准。
- 自有同 SDK 窗口采集浅色、深色共 66 个状态。Year/Decade 在模板加载后设置；DatePicker/TimePicker 的展开使用独立同 SDK Flyout。WheelPressed 是原生 VSM 状态，Rust 实际指针按下还会滚动一项，因此轮盘正文不作为该按下状态的逐像素对照。源码和二进制指纹见 `references/picker-controls-run.json`。

## 实现内容

CalendarView 支持月份、年份、十年视图，日期范围、单选/多选、禁用日期、密度颜色、分组标签、首日和周数。可见范围的选择焦点与显示锚点分开，点击已经显示的跨月日期不会自动重排整个月份。月/年/十年切换读取 SDK 的缩放、透明度和 167ms 页眉时间线；翻页沿日期索引计算行距离，复用已有 WinUI ChangeView 采样轨迹，保留固定的星期标题，并支持动画中再次翻页。

未指定 `firstDayOfWeek` 时，Rust 根据日历 `language` 决定首日：中文（`zh`、`zh-CN`、`zh-Hans`、`zh-Hant` 等）以星期一开始，其他语言保留星期日。此规则同时适用于 Gregorian/Chinese 等历法及 CalendarDatePicker 浮层，语言切换会同步更新星期标题和日期列。显式 `DayOfWeek` 优先；传入 `null` 可恢复语言默认值。单独修改 `formatLanguage` 不改变日历首日。

首日改变时，键盘焦点跟随原来的公历日期，避免列重排后回车选到另一天。复查记录见 `references/validation/calendar-week-start.json`。

CalendarDatePicker 提供可空日期、页眉、占位文字和日历浮层；同步初始选中日期不会被误认为用户提交。DatePicker、TimePicker 的轮盘通过共享集合与滚动模型显示，支持确认、取消、步长、键盘及悬停箭头。浮层归属于窗口，展开期间由 Rust 提供全局滚动输入作用域。

ColorPicker 提供 RGB/HSV、六种 Box/Ring 通道布局、Alpha、ARGB 十六进制编辑、预览/原色恢复、横纵布局与 More。光谱使用固定逻辑像素及量化端点；稳定的色板通过版本槽位保留，两后端避免每次指针移动重新上传整张位图。HueSaturation 色板保持 Value=1。

## 选择后的布局与文字修复

模板的 Arrange 只临时应用部件槽位，随后恢复原始测量约束。上次短占位文字或一位小时的宽度不会成为下一次长年份、两位小时的 Width。字段为完整字体 advance 保留物理像素上取整预算。

Gallery 的结果使用已有有界选项列和简洁文字。它不会把原始事件 JSON 放入自适应输出列并挤窄预览。原生独立测量也确认：CalendarView 自然宽 302.4 DIP，但放入 180 DIP 容器会正常缩窄；因此这次没有为 SDK 强加虚假的最小宽度来掩盖示例布局问题。

宿主隐藏或卸载时，Rust 仍处理状态和事件，但跳过零尺寸 Canvas 绘制及浮层背景采样，避免关闭动画最后一帧在 WebKit 触发无效画布异常。

## API 与验证

```tsx
<CalendarView onSelectedDatesChanged={event => console.log(event.selectedDates)} />
<CalendarDatePicker header="Pick a date" date="2026-11-08" />
<DatePicker date="2026-11-08" />
<TimePicker time={14 * 60 + 35} minuteIncrement={5} />
<ColorPicker color="#0078d7cc" isAlphaEnabled />
```

日期是无隐式时区转换的 Gregorian `YYYY-MM-DD`，时间是本地午夜后的分钟数或 null。CSS 颜色按 RGBA 传入，启用 Alpha 的原生十六进制编辑按 ARGB 显示。枚举由共享注册表生成并在 TS 运行时导出。

验证结果、实际 WASM 指纹、双浏览器和双后端的静态几何/图像误差见 `references/validation/picker-controls.json`。用户报告的翻页、选择后宽度和确认后字段裁剪另见 `references/validation/picker-reported-fixes.json`，其中记录 5173 的实际版本及复现检查。

完整图像仍包含字体、ClearType、回退字体和材质边缘误差，不据此宣称与 Store Gallery 发行版完全一致。任意 WinRT DateTimeFormatter 模式、100ns/时区 DateTime 语义、系统颜色名称 Ctrl 步进、连续虚拟化月份滚动和全部自动化模式尚未接受。原生日历逐帧动画及 DWM/Store 实际操作验收也单独保留。

## Gallery 用例展示

五页共 8 个用例，数量、顺序和标题直接从固定提交的页面 `SampleDefinition` 和 `.txt` 提取。CalendarView 的选项位于右侧，包含原始顺序的历法、语言清单和 None/Single/Multiple；历法选项现已启用，并在原清单后增加 ChineseCalendar。浏览器缺少 Intl 数据的语言仍禁用。

## CalendarIdentifier 与 Chinese 日历（2026-11-10）

CalendarView、CalendarDatePicker、DatePicker 共用 Rust `calendar` 模块，支持 Gregorian、Japanese、Julian、Korean（檀纪公历）、Taiwan、Thai、Hebrew、Hijri、UmAlQura、Persian、Chinese。ICU4X `icu_calendar = 2.4.0` 提供日期转换、月长、闰月及年号数据；Hijri 明确采用 Type II Friday 的表算法，可能与实际观月日期不同。所有公开日期、范围、选中值和事件继续使用公历 `YYYY-MM-DD`。

月份、年份、十年视图、前后翻页、键盘 PageUp/PageDown/Home/End 和 DatePicker 轮盘均按所选历法计算。Hebrew/Chinese 年份可含 13 个月；跨年保留月码并约束无对应日的日期。Japanese 用公历扩展年作为内部键，显示实际年号，避免跨年号出现年序倒退。非公历月份名称目前由 Rust 内置名称提供，未声称实现所有语言的 WinRT 格式化。

```tsx
<CalendarView calendarIdentifier={CalendarIdentifier.Chinese} />
<CalendarDatePicker calendarIdentifier={CalendarIdentifier.Chinese} date="2026-02-17" />
<DatePicker calendarIdentifier={CalendarIdentifier.Hebrew} />
```

Chinese 为项目扩展，支持公历 1901-01-01 至 2100-12-31（含边界）。默认日期范围与该范围取交集，显式范围和日期超界会报错。月份按农历组织，页眉显示干支年、闰月；单元格上行显示公历日，下行优先显示节日、其次节气、再显示农历日/月。Rust 自然测量为双行内容提供空间。辅助功能名称包含日期、农历、节日和节气，同日多事件保留在快照 `festivals` / `solarTerm` 中。

节日包括元旦、劳动节、国庆节等固定纪念日及春节、元宵、龙抬头、端午、七夕、中元、中秋、重阳、腊八、除夕、清明。除夕取农历年最后一天，兼容腊月二十九；闰月不重复月日节日。仅标注节日本日，不含放假区间、调休上班日或逐年的国务院假期安排。

二十四节气按 UTC+8 民用日期保存于 `references/chinese-solar-terms.json`，由固定版本 `lunar_python 1.4.9` 的寿星天文算法离线生成，记录源码 SHA-256、版本、许可证和来源链接。生成步骤在 `tools/extract-chinese-solar-terms.py` 中；构建和运行不需要 Python、网络或在线服务。2026 年全部 24 个日期以[香港天文台年历表](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt)独立核对，未将所有 200 年声明为官方逐日核准。历法依赖参考 [ICU4X 日期 API](https://docs.rs/icu_calendar/2.4.0/icu_calendar/struct.Date.html)，节气生成器来源为 [6tail/lunar-python](https://github.com/6tail/lunar-python)。

回归用例位于 `tests/calendar.rs`、`tests/picker_controls.rs`、`gallery/tests/calendar-identifiers.spec.ts` 和 `gallery/tests/types-calendar.tsx`。

本次构建、日期基准、浏览器后端、实际二进制与复查结果见 `references/validation/calendar-identifiers.json`；该记录与早期 66 个原生状态的静态对照独立。

CalendarDatePicker 使用 `Calendar` 页眉和 `Pick a date` 占位文字。DatePicker 第二例使用本地当前日期加两个月、当前年至五年后的范围，并在字段与轮盘中运行 `{day.integer} ({dayofweek.abbreviated})`。这一具体格式已接入 Rust，不代表任意 WinRT formatter 都已实现。TimePicker 第三例以 8 DIP 间距同时展示 12/24 小时制，二者绑定同一个当前本地时间。

ColorPicker 还原七个复选选项、Alpha 联动、Box/Ring 单选和 250×100 DIP 的矩形预览；矩形使用真实 SDK Shape 与 `TextControlBorderBrush` 渐变描边。所有用例移除原版没有的事件输出和测试选项。控件采用自然高度；外层沿用 ControlExample 的预览/选项内边距。源码面板读取正在运行的 React 示例，官方 XAML 从 `.txt` 取值并替换实时选项。

本次展示与交互检查见 `references/validation/picker-gallery.json`；该记录单独标记已验证二进制和 5173 的版本，不替代之前原生静态矩阵的版本范围。
