# 资源授权审计（2026-11-10）

当前结论：已用固定提交的 MIT 源码重新生成工程预览包派生的模板、画刷和运行时契约，`SDK-PREVIEW-001` 的来源阻断已解除。发行门禁继续校验实际输入和分发附件。此记录限定于清单列出的来源、字节和许可条件，不是所有用途的法律保证；发布仍是单独操作。

## 已核验和修正

- `third_party/resource-manifest.json` 逐文件登记 191 个媒体/字体资源的 SHA-256、来源、所属组件及许可证；包括 Gallery 缩略图、样例图片、独立 SVG、社区对照截图、原创头像、编辑器测试图片及字体。Gallery 媒体与固定 Git 树的 blob ID 比对，不以工作区同名文件作为证明。内联 GitHub 路径的来源是同一 Gallery commit 的 `WinUIGallery/App.xaml`；编辑器内联 PNG 是项目中的双色测试矩形。
- WinJS `Symbols.ttf`、两份 Fluent System Icons 字体均与固定开源提交下载的原始字节一致。WinJS 字体自身 name ID 13 声明 Apache-2.0；保留原字体、完整 Apache 条款、字体版权和修改说明，并额外保留该版本仓库的 MIT 文本。Fluent System Icons 为 MIT。生成的 WOFF 已保留组件归属和修改声明；未复制、转换或嵌入 Windows Segoe 字体轮廓。
- 已移除缺少固定媒体授权证据的 Microsoft Learn 人物照片。PersonPicture 及原生探针改为 `gallery/public/project/person-profile.png`，由项目原创圆形/椭圆几何生成，并提供 SVG 和 `tools/generate-project-avatar.py`。原图仅隔离在 Git 忽略的 `out/license-quarantine/` 中，不再由开发服务器/发行包分发。该示例不再声称与旧人物照片像素一致。
- LibreICONS 相机 SVG、Gallery、公开 WinUI、社区 WinUI.TableView 两个基准均保留对应 MIT 条款与来源。Calendar 保留 Unicode-3.0、Apache-2.0 和 lunar_python MIT 条款。香港天文台链接为比较参考，没有导入该网站数据。
- `third_party/dependency-licenses.json` 记录当前 Cargo/npm 锁定的 155 个去重依赖条目（覆盖 SDK 与 Gallery 两个 npm 锁文件）（含构建测试工具和未安装的可选平台包）；本机安装的依赖完整许可证保存在 `third_party/licenses/dependencies/`。仅构建工具 lightningcss 使用 MPL-2.0，未将其 native 二进制、node_modules 或源码作为网页/SDK 分发；若以后分发工具链本身，需要另行履行对应 MPL 源码提供要求。不能把这个判断扩展到未来新增运行时 MPL/GPL 依赖。
- 根目录 `THIRD_PARTY_NOTICES.txt` 汇总完整版权、许可条款和字体修改说明。网页及 SDK 声明包同步获得完整文本和两个来源清单，设置页提供“Third-party licenses and resource sources”入口。MIT 授权仅覆盖相应著作权，不表示微软/GitHub 背书，也不授权将其商标作为本项目自有品牌。

## 已解决：工程预览模板来源

此前提取器读取工程预览 NuGet 的 `generic.xaml`。其包许可不能自动当作 MIT。本次保留该历史审计事实，原包许可证仅留在 `third_party/windows-app-sdk-preview/` 作为本地证据，不再列为运行时组件，也不进入发行许可证包。

替换使用 `microsoft/microsoft-ui-xaml@7b12709347527238494ca28cb9fed326d513e779` 的原始核心 `generic.xaml` 和控件资源，共 122 个 XAML 输入及固定 MIT 文本。`references/mit-xaml-sources.json` 记录每个文件的上游路径、Git blob SHA-1 和 SHA-256；`references/mit-xaml-generation.json` 记录离线合并输入、作用域和输出哈希。没有安装 SDK 或 NuGet 模板回退路径，正常构建不联网。

`tools/build-mit-resource-dictionary.py` 合并核心默认值、材质、控件和 CommonStyles；CommonStyles 覆盖旧 Reveal 别名。普通主题的系统高亮映射到项目固定强调色；高对比度使用明确的系统颜色和项目浏览器配色角色，保留既有数值外观。`references/browser-theme-profile.json` 包含这些环境颜色事实及项目策略，不含从预览包复制的模板或资源表达式。

`references/mit-palette-requirements.json` 只保留所需资源名。16 份主题/启动资源字典由 MIT 字典和颜色 profile 重新生成；`references/mit-palette-generation.json` 登记输出哈希。9 份 `references/sdk/*.xaml` 已全部重新提取，文件名保留以兼容既有工具；它们现由 MIT 输入生成。旧契约、WASM 和页面截图仅在忽略的 `out/mit-migration-before/` 中用于回归比较，不进入包。原生探针测得的尺寸、时序等数值基准仍保留；它们不是模板源码授权。

生成器校验不可变源字节，发行门禁还校验已审查的生成器、profile、输入与生成产物哈希。即使清空问题列表，缺失 MIT 证据、篡改画刷或重新引入预览包读取仍会失败。迁移回归结果见 `references/validation/mit-resource-migration.json`。

## 自动检查与维护

```powershell
cd gallery
npm run check:license-files  # 离线校验媒体、版权文本、完整分发附件和锁文件
npm run check:licenses      # 发行门禁；校验固定 MIT 链和完整分发附件
```

`npm run build`、`build:wasm`、`declarations`、`preview`、npm `prepack` 和 `prepublishOnly` 都经过发行门禁。npm 包仍为 `private: true`，Cargo 保留 `publish = false`，本次没有向注册表发布。开发模式的 `--files` 不是跳过发行复核的依据。

人工审查新增来源后才可刷新清单：

```powershell
python -X utf8 tools/collect-dependency-licenses.py
python -X utf8 tools/build-resource-manifest.py
node tools/sync-license-bundle.mjs
python -X utf8 tools/check-resource-licenses.py --files
```

刷新脚本不批准未知许可；未知媒体、变更字节、缺失版权、锁文件漂移和新增未审查的依赖许可均阻止检查通过。联网取证工具 `tools/fetch-license-evidence.py` 仅用于人工审查，正常构建不联网抓资源或浮动更新许可证。还应随任何新的对外发行用途审查截图、品牌使用及第三方服务条款。

## 一手依据

- [固定 WinUI Gallery MIT](https://github.com/microsoft/WinUI-Gallery/blob/7360ac322414e118eadfb0c7c2f4ecc31a218f59/LICENSE)
- [WinJS 固定版本及字体](https://github.com/winjs/winjs/tree/b9e0b33f76c57caac941c9b1885bf69443320b1c/src/fonts)
- [Fluent System Icons 固定 MIT](https://github.com/microsoft/fluentui-system-icons/blob/e15fc0de25fab983e3e42bac8798be69a85c23bf/LICENSE)
- [LibreICONS 固定 MIT](https://github.com/DiemenDesign/LibreICONS/blob/2d2172d15e3c6ca03c018629d60050e4b99e5c55/LICENSE)
- [微软字体分发 FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq)：区分栅格图像输出与字体软件再分发，不能把截图许可当作字体转换/嵌入许可。
