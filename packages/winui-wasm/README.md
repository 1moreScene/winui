# winui-wasm

Browser controls implemented in Rust/WASM. This package includes precompiled WASM,
JavaScript host adapters, TypeScript declarations, fonts and automatic host styles.
Consumers do not need Rust, wasm-bindgen, copied SDK sources, or Vite-specific SDK aliases.

```ts
import {WinUI} from 'winui-wasm';

const ui = await WinUI.create();
const host = document.getElementById('app')!;
host.style.cssText = 'width:100%;height:240px';
const scene = ui.scene(host);
scene.root.button({text: 'Hello'}).onClick(() => console.log('clicked'));
// On application teardown:
// ui.dispose();
```

React applications install React themselves and import the optional adapter:

```tsx
import {WinUIProvider, SceneView, Button, ButtonVariant} from 'winui-wasm/react';

<WinUIProvider>
  <SceneView style={{height:160}}><Button text="Hello" variant={ButtonVariant.Accent} onClick={() => console.log('clicked')} /></SceneView>
</WinUIProvider>
```

The basic `winui-wasm` entry does not import React. React is an optional peer dependency.
Button-associated flyouts open automatically on pointer or keyboard activation:

```tsx
import {Button, MenuFlyout, MenuFlyoutItem} from 'winui-wasm/react';

<Button text="Menu">
  <Button.Flyout>
    <MenuFlyout><MenuFlyoutItem text="Open" onClick={openDocument} /></MenuFlyout>
  </Button.Flyout>
</Button>
```

`flyout={<Flyout>...</Flyout>}` is equivalent, and the other button families expose
the same `.Flyout` property element. A nested `<Button text="Close" closeFlyout />`
closes its nearest owning flyout through Rust's cancellable close protocol.
Advanced content may still use a render callback for direct controller access.
`toolTip={<ToolTip ... />}` and `contextFlyout={<MenuFlyout ... />}` associate with
their owning scene control automatically; common controls also expose `.ToolTip`
and `.ContextFlyout` property elements. Content slots include `Expander.Header`,
`InfoBar.ActionButton`, `SplitView.Pane`, `TeachingTip.HeroContent` and
`ItemsPresenter.Header/Footer`. Explicit `target`
and `isOpen` remain available for controlled standalone surfaces.

The React entry also exports shared SDK enums, option types and utilities.
Unsuffixed control names (`Button`, `ContentControl`, `Frame`, etc.) are exported
only by `winui-wasm/react`. The framework-independent root entry exports the
corresponding objects as `ButtonController`, `ContentControlController`,
`FrameController`, etc. Editor configuration is not required to distinguish them.

```tsx
import {Button, ButtonVariant, type ButtonController} from 'winui-wasm/react';

<Button variant={ButtonVariant.Accent}
  onReady={(button: ButtonController) => button.update({text: 'Ready'})} />
```

Migration: root imports such as `import type {Button} from 'winui-wasm'` must become
`import type {ButtonController} from 'winui-wasm'`. Runtime class imports such as
`Frame` and `TableView` likewise become `FrameController` and `TableViewController`.
The old names are intentionally not retained as aliases, so they cannot compete
with React components in automatic import suggestions. Factory calls such as
`scene.root.button(...)` and `ui.frame(...)` are unchanged.

Icon font policy (0.1.1): Windows uses the installed Segoe Fluent Icons, then
Segoe MDL2 Assets, through SDK-owned local font aliases. Missing glyphs or blocked
local fonts fall back to the bundled open-source WinUI Portable Icons. Other
platforms use the open-source font. Native font family names are never overridden,
and Windows font files are never included in the package. Measurement, Canvas2D
and WebGL2 share this font selection. Cross-platform glyph outlines may differ.

The package targets browsers supporting WebAssembly and Canvas2D; WebGL2 is optional.
Initialization belongs in client code; use `dispose()` when the owning application unmounts.

The React `Frame` keeps control and input state for cached pages. It releases
their Canvas2D and WebGL2 raster buffers once they leave the transition and
repaints the page when it returns. The cache still holds each page's mounted
components and control tree. For a custom host, call `scene.setHostActive(false)`
when its scene is hidden, `scene.setHostActive(true)` when it is shown, and
`scene.dispose()` when it is removed.

Fixed-size scenes lay out their controls and project accessibility while
offscreen. They paint when they enter the viewport, or immediately when the
host calls `scene.render()`. Auto-sized scenes and open floating surfaces
continue to paint as their geometry changes.

This version is private and available only for local development verification.
Runtime templates and brushes are generated offline from the pinned MIT WinUI
source, verified by Git blob and SHA-256. The former `SDK-PREVIEW-001` input
chain has been replaced. See `RELEASE-STATUS.txt` and `dist/licenses/` for
review scope, source inventories and full notices. This package remains private
and has not been published to npm.

Repository development (using the already built WASM runtime):

```sh
npm install --prefix packages/winui-wasm
npm run build:local --prefix packages/winui-wasm
```

The SDK owns its compiler and audit-parser dependencies; its build does not use
Gallery's node_modules. Repository Rust sources and review tools remain at the
repository root. Installed applications need none of this build tooling.
