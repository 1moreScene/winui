# Gallery Motion / Rust SDK

本轮日期：2026-11-09。使用既有固定 Gallery `7360ac322414e118eadfb0c7c2f4ecc31a218f59`、WinUI 源码 `7b12709347527238494ca28cb9fed326d513e779` 和 WinUI NuGet `2.3.10-experimental`。

## 新增能力

| Gallery 页面 | Rust SDK 行为 |
| --- | --- |
| `#transitions` | 赋值触发的 Opacity/Rotation/Scale/Translation 隐式过渡；X/Y 分量选择；背景实色交叉淡化；局部主题资源重新解析及过渡。共 6 个示例。 |
| `#theme-transitions` | Entrance、Reposition、Content、AddDelete、Popup。布局与视觉位移分开；Entrance 同批子元素错峰；删除立即使句柄失效并保留短期退出绘制；文本刷新保留旧内容的退出绘制。共 5 个示例。 |
| `#connected-animation` | 场景内的准备/启动/返回/取消；源可在准备后销毁；目标布局转换与源视觉快照；Gravity、Direct、Basic。集合、卡片、配置选择、ItemsRepeater 共 4 个示例。 |
| `#xaml-comp-interop` | 有阻尼的弹簧及速度连续的反向；反比缩放、级联位移、ActualSize 圆周布局、ActualOffset/ActualSize 相对定位。共 5 个示例。 |

已有 Easing、Frame/Page transitions 和 Parallax 继续复用原 SDK。浏览器默认 Canvas2D，WebGL2 由调用方显式选择。Gallery 不使用 CSS 动画、逐帧 JS 属性更新或 JS 动画状态机。

## 公共调用

React 可直接声明原生式隐式过渡和悬停弹簧：

```tsx
<Grid opacity={opacity} motion={{implicit:{[AnimatedProperty.Opacity]:300}}} />
<Button text="Item" motion={{hoverSpring:{period:50,dampingRatio:0.6}}} />
<StackPanel motion={{childrenTransitions:[ThemeTransition.Entrance]}}>
  {items.map(item => <Rectangle key={item.id} width={50} height={50} fill="#add8e6" />)}
</StackPanel>
```

命令式 SDK 使用同一组配置和 Rust 时间线：

```ts
const tile = scene.root.grid({width:50,height:50,
  motion:{implicit:{[AnimatedProperty.TranslationX]:300}}});
tile.update({translationX:200});

const run = tile.animate({scaleX:1.5,scaleY:1.5},
  {spring:{period:100,dampingRatio:0.4}});
run.cancel();
await run.finished;

const prepared = source.prepareConnectedAnimation('hero');
// 业务方完成布局或页面内容切换；目标可以是新建节点。
prepared.tryStart(target,ConnectedAnimationConfiguration.Gravity);
prepared.cancel();

circle.bindExpressions({
  [AnimatedProperty.ScaleX]:ScalarExpression.constant(1)
    .divide(ScalarExpression.reference(tile,ExpressionProperty.ScaleX))
});
circle.clearExpressions();
tile.dispose();
```

表达式使用类型化树，支持加减乘除、余数、sin/cos 和呈现/布局属性引用。Rust 验证场景句柄、循环引用和表达式深度，按依赖顺序在布局后求值；零除等非有限帧保留最近的有限呈现值。显式属性更新或动画替换重叠的绑定；源销毁会解绑并恢复逻辑值。绑定本身不持续申请绘制帧，只有源变化或动画才需要帧。

连接准备最多 64 个、键最长 256 字节，2000ms 后过期，启动只能消费一次。退出绘制最多保留 128 个，连接快照最多 32768 条绘制命令，超预算明确报错。取消、到达终点、减少动画策略和场景销毁释放视觉快照。取消按键作用于准备或已启动的连接；同键重新准备会替换该键的准备内容。

## 来源和参数

- `references/gallery-motion/` 保存固定 Gallery 原始示例；`tools/extract-gallery-motion.py` 按页面实际顺序提取上述三个 Motion 页面，同时保留仅有 C# 的示例。
- `references/motion-sources.json` 记录 21 个固定 ConnectedAnimation 源文件的 Git blob 和 SHA-256。
- `references/gallery-motion-native.json` 通过 `tools/capture-gallery-motion.py` 读取 Windows UxTheme 数据，沿用固定 `LayoutTransition_partial.cpp` / `ThemeGenerator.cpp` 的故事板选择。记录含机器 OS、每轨的延迟、时长、曲线、起止值和 stagger。它是本机系统主题记录，不代表所有 Windows 版本相同。
- Entrance 平移/透明度 667ms，错峰 35ms、上限 333ms；Reposition 367ms；Content 平移 500ms、透明度从 50ms 起运行 170ms、旧内容退出 50ms；Add 166ms 后缩放/淡入 333ms；Delete 100ms；Popup 367ms 平移、83ms 后淡入 83ms，退出淡出 83ms。
- 隐式标量和向量沿用已有 300ms / cubic `(0.8,0,0.2,1)`；画刷 150ms 线性交叉淡化。
- ConnectedAnimationService 默认 300ms / cubic `(0.8,0,0.2,1)`；Direct 覆盖为 200ms / `(0.1,0.9,0.2,1)`。Gravity 源配方在 0.66 进度有 80 DIP 的 Y 下沉，再返回；无尺寸缩放时增加 1.1 倍缩放，采用源中的两段缓动。
- `tools/extract-motion.py` 从匹配 SDK 提取本轮所需画刷及 SDK 文件指纹；它们进入共享 Rust 资源表，局部主题可重新解析。

## 验证与边界

专项 Rust 用例：`tests/motion_effects.rs`、既有 `tests/animation.rs` / `tests/keyframes.rs`。浏览器交互、两个渲染后端、源码展示和 SDK 生命周期用例：`gallery/tests/motion-effects.spec.ts`。类型负例：`gallery/tests/motion-types.ts`。

```powershell
cargo test --locked --test motion_effects --test animation --test keyframes
cd gallery
npm run build
npx playwright test -c playwright.motion.config.ts
```

系统主题记录和功能回归不等于发行版 Gallery 的逐帧视觉验收。目前共享渲染器仍是二维仿射场景：Z/三维投影、Gravity 的 Z=32 和 ThemeShadow、原生 Composition 的任意字符串表达式、跨 Scene/窗口连接以及原生纹理快照/剪裁形变没有实现。连接使用可释放的 Rust 绘制命令快照；不透明内容的源/目标叠化已覆盖，透明复杂图层的精确交叉淡化仍需独立合成支持。示例布局和若干数据容器是 SDK 用法示范，未宣称复刻全部原生页面细节。

本轮最终结果：400 项 Rust 回归、8 项浏览器用例（Canvas2D/WebGL2）、strict TS、枚举生成检查、WASM Release、Vite 生产构建与 SDK 声明生成通过。专项动画用例包含 11 项新增 Rust 测试和 5 项既有动画/关键帧测试。浏览器测试的 WASM 与当前开发文件及生产资产 SHA-256 一致。严格 Clippy 仍因其他控件模块的 17 项诊断失败，原始输出保存在 `out/motion-clippy.log`。

最终验证数据和所测 WASM 的 SHA-256 见 `references/validation/motion-effects.json`。
