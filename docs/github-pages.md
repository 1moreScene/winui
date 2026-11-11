# Gallery 部署到 GitHub Pages

部署的是 `gallery/` 的 React Gallery。基础 SDK、React 适配和预编译 Rust/WASM 经过发行校验后一起构建，访客无需安装 npm 包。

## 推送 main 后自动部署

`.github/workflows/pages.yml` 在每次推送到 `main` 时自动运行，也支持在 Actions 页面手动触发。流程依次执行：

1. 安装锁定版本的 Node、Python、Rust 和 wasm-bindgen。
2. 校验仓库内的 MIT 资源、许可证、枚举与 SDK 实现边界，再从 Rust 源码编译 WASM。
3. 安装 SDK/Gallery 的锁定依赖，运行手机视口下的导航触屏滚动与 TableView 编辑器交互回归。
4. 构建 `/winui/` 子路径的 Gallery，上传 Pages artifact 并部署。

仓库 Pages 的 Source 使用 **GitHub Actions**，`github-pages` 环境允许 `main` 部署。工作流使用内置 `GITHUB_TOKEN` 和 OIDC，无需额外配置个人访问令牌。构建或测试失败时不会进入部署任务；并发推送会取消较旧的工作流，优先发布最新提交。

CI 使用已提交且通过指纹校验的生成资源，不依赖维护者电脑上的 Windows SDK/NuGet 安装或外部参考仓库。更新资源时先在开发环境重新生成并提交相应固定输入与清单。

## 本地构建和预览

在仓库根目录执行：

```powershell
npm run build:pages
npm run deploy:pages -- --no-build
```

正常更新站点只需提交并推送 `main`。本地 `npm run build:pages` 用于预览构建结果。

脚本从 `origin` 读取 GitHub 仓库，推导仓库站点的 `/<repo>/` 路径；当前目标为 `1moreScene/winui`，对应 `/winui/`。构建输出位于 `gallery/dist-pages/`，包括 WASM、字体、图片、完整许可证、`.nojekyll` 和 `pages-build.json` 构建记录。

也支持指定独立的 Pages 产物仓库。先在 GitHub 创建所需仓库，再设置部署目标并构建：

```powershell
$env:GITHUB_PAGES_REPOSITORY = '1moreScene/winui-gallery'
npm run deploy:pages
```

此时资源路径自动改为 `/winui-gallery/`。以后更新站点时仍设置相同目标。移除该环境变量后恢复使用 `origin`。

`gallery/asset-base-plugin.mjs` 在构建时解析 Gallery JavaScript，把 SDK 图片选项、JSON 数据和模板字符串中的公共资源路径统一加上站点前缀；CSS、JS chunk、字体和 WASM 则由 Vite 处理。运行页面使用同一套源码，源码面板保留原始示例声明，普通根路径开发构建继续使用 `/`。

原 `tools/deploy-gallery-pages.mjs` 是首次部署时使用的分支发布工具。仓库启用 Actions 发布后，该工具会拒绝切回分支发布；以后通过 `main` 推送触发工作流即可。

## 环境与身份验证

首次安装依赖：

```powershell
npm ci --prefix packages/winui-wasm
npm ci --prefix gallery
```

脚本需要 Git、Node、Python，以及项目已编译且通过指纹校验的 WASM。Rust 源码修改后先运行 Gallery 的 `npm run build:wasm`，再构建 Pages。

Git 推送使用已有 Git Credential Manager 登录；Pages API 优先使用环境中的 `GH_TOKEN`/`GITHUB_TOKEN`，否则读取同一 Git 凭据。令牌只在进程内使用，不写入构建产物。凭据需要目标仓库的推送和 Pages 管理权限。私有仓库的 Pages 可用性取决于 GitHub 账户方案；脚本不会调整仓库可见性。

## 浏览器验证

本地预览：

```powershell
cd gallery
node node_modules/vite/bin/vite.js preview --outDir dist-pages --base /winui/ --host 127.0.0.1 --port 4174
```

另一个终端在项目根目录运行：

```powershell
node tools/verify-gallery-pages.mjs
```

部署完成后验证线上地址：

```powershell
node tools/verify-gallery-pages.mjs https://1morescene.github.io/winui/
```

验证覆盖首页、按钮、图标、SplitButton、TeachingTip、集合、视差、滚动关联、富文本、TableView、设置页，以及 Flyout 打开/关闭和源码面板，并拒绝页面运行异常、资源 HTTP 错误或遗漏站点前缀的请求。报告和截图位于 `out/github-pages/`。

参考：[Vite 静态部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages REST API](https://docs.github.com/en/rest/pages/pages)。
