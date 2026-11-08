import {selectGalleryOption} from './gallery-control-helper';
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import type { Scene, ToggleButton, WinUI } from "../src/index";
declare global {
  interface Window {
    selectionFixture: { scene: Scene; controls: ToggleButton[] };
    acceptFixture: {
      clock: { value: number };
      sdk: WinUI;
      scene: Scene;
      check: ToggleButton;
    };
  }
}
test("official selection examples: three-state, select all, keyboard and disable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#checkbox");
  const two = page.getByRole("checkbox", { name: "Two-state", exact: true });
  await expect(two).toBeVisible();
  const firstExample = page.locator(".basic-example").first();
  const preview = (await firstExample.locator(".basic-preview").boundingBox())!;
  const output = (await firstExample.locator(".basic-output").boundingBox())!;
  expect(output.x).toBeGreaterThanOrEqual(preview.x + preview.width - 1);
  expect((await firstExample.locator(".basic-live").boundingBox())!.height).toBe(96);
  const intrinsic = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("2d")!;
    c.font = "14px Segoe UI";
    return c.measureText("Two-state CheckBox").width + 28;
  });
  expect((await two.boundingBox())!.width).toBeGreaterThanOrEqual(intrinsic);
  await expect(two).toHaveAttribute("aria-checked", "false");
  await two.click();
  await expect(two).toHaveAttribute("aria-checked", "true");
  await two.press("Enter");
  await expect(two).toHaveAttribute("aria-checked", "true");
  await two.press("Space");
  await expect(two).toHaveAttribute("aria-checked", "false");
  const three = page.getByRole("checkbox", {
    name: "Three-state",
    exact: true,
  });
  for (const value of ["true", "mixed", "false"]) {
    await three.click();
    await expect(three).toHaveAttribute("aria-checked", value);
  }
  const all = page.getByRole("checkbox", { name: "Select all", exact: true });
  await expect(all).toHaveAttribute("aria-checked", "mixed");
  await all.click();
  for (let i = 1; i <= 3; i++)
    await expect(
      page.getByRole("checkbox", { name: `Option ${i}`, exact: true }),
    ).toHaveAttribute("aria-checked", "false");
  await all.click();
  for (let i = 1; i <= 3; i++)
    await expect(
      page.getByRole("checkbox", { name: `Option ${i}`, exact: true }),
    ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("checkbox", { name: "Option 1", exact: true }).click();
  await expect(all).toHaveAttribute("aria-checked", "mixed");
  await selectGalleryOption(page.getByLabel("Basic renderer"),"Canvas2D");
  await expect(
    page.getByRole("checkbox", { name: "Two-state", exact: true }),
  ).toBeVisible();
  await page
    .locator("main")
    .screenshot({ path: "../out/foundation/checkbox-gallery.png" });
  await page.goto("/#toggle-button");
  const toggle = page.getByRole("button", {
    name: "ToggleButton",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("checkbox", { name: "Disable ToggleButton" }).check();
  await expect(toggle).toBeDisabled();
  await page.getByRole("checkbox", { name: "Disable ToggleButton" }).uncheck();
  await toggle.focus();
  expect(await toggle.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe(
    "none",
  );
  expect(errors).toEqual([]);
});
test("TextBlock style and all image stretch options render through both backends", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#textblock");
  await expect(
    page.getByText("I am a styled TextBlock.", { exact: true }),
  ).toBeAttached();
  await page
    .locator("main")
    .screenshot({ path: "../out/foundation/textblock-gallery.png" });
  await page.goto("/#image");
  await expect(
    page.getByRole("img", { name: "Valley", exact: true }),
  ).toBeAttached();
  for (const backend of ["Canvas2D", "WebGL2"]) {
    await selectGalleryOption(page.getByLabel("Basic renderer"),backend);
    for (const mode of ["None", "Fill", "Uniform", "UniformToFill"])
      await page.getByRole("radio", { name: mode, exact: true }).check();
  }
  await page
    .locator("main")
    .screenshot({ path: "../out/foundation/image-gallery.png" });
  expect(errors).toEqual([]);
});
test("selection forced-state probe crops are measured on Canvas and GPU", async ({
  page,
}) => {
  test.setTimeout(120000);
  mkdirSync("../out/foundation", { recursive: true });
  const native = JSON.parse(
    readFileSync("../out/foundation-native/foundation-metrics.json", "utf8"),
  );
  const comparisons: any[] = [];
  for (const backend of ["Canvas2D", "WebGL2"])
    for (const theme of ["Light", "Dark", "HighContrast"])
      for (const kind of ["ToggleButton", "CheckBox"]) {
        await page.goto(`/?selection=${backend}-${theme}-${kind}#button`);
        await expect(
          page.getByRole("button", { name: "Standard XAML", exact: true }),
        ).toBeVisible();
        await page.evaluate(
          async ({ backend, theme, kind }) => {
            const path = "/src/index.ts";
            const a = (await import(path)) as typeof import("../src/index");
            const host = document.createElement("div");
            host.style.cssText =
              "position:fixed;top:0;left:0;width:1000px;height:500px;z-index:99999";
            document.body.append(host);
            const scene = window.gallery.sdk.scene(host, {
              theme: a.ThemeMode[theme as keyof typeof a.ThemeMode],
              backend:
                a.RendererBackend[backend as keyof typeof a.RendererBackend],
              reducedMotion: true,
            });
            const controls: ToggleButton[] = [];
            for (let column = 0; column < 3; column++)
              for (let row = 0; row < 4; row++) {
                const props = {
                  text: kind,
                  accessibleName: `fixture-${column}-${row}`,
                  width: 220,
                  height: kind === "CheckBox" ? 32 : 36,
                  isChecked: column === 0 ? false : column === 1 ? true : null,
                  isThreeState: true,
                  enabled: row !== 3,
                  margin: [24 + column * 320, 24 + row * 100, 0, 0] as [
                    number,
                    number,
                    number,
                    number,
                  ],
                  horizontalAlignment: a.HorizontalAlignment.Left,
                  verticalAlignment: a.VerticalAlignment.Top,
                };
                controls.push(
                  kind === "CheckBox"
                    ? scene.root.checkBox(props)
                    : scene.root.toggleButton(props),
                );
              }
            window.selectionFixture = { scene, controls };
          },
          { backend, theme, kind },
        );
        const expected = PNG.sync.read(
          readFileSync(`../out/foundation-native/${theme}-${kind}.png`),
        );
        for (let column = 0; column < 3; column++)
          for (let row = 0; row < 4; row++) {
            const x = 24 + column * 320,
              y = 24 + row * 100,
              height = kind === "CheckBox" ? 32 : 36;
            if (row === 1 || row === 2) await page.mouse.move(x + 50, y + 16);
            else await page.mouse.move(990, 490);
            if (row === 2) await page.mouse.down();
            const actual = PNG.sync.read(
              await page.screenshot({
                clip: { x, y, width: 220, height },
                path: `../out/foundation/${backend}-${theme}-${kind}-${column}-${row}.png`,
              }),
            );
            let sum = 0,
              glyph = 0;
            for (let py = 0; py < height; py++)
              for (let px = 0; px < 220; px++)
                for (let c = 0; c < 3; c++) {
                  const d = Math.abs(
                    actual.data[(py * 220 + px) * 4 + c] -
                      expected.data[((y + py) * 1000 + x + px) * 4 + c],
                  );
                  sum += d;
                  if (px < 20) glyph += d;
                }
            comparisons.push({
              backend,
              theme,
              kind,
              column,
              row,
              mean: sum / (220 * height * 3),
              glyphRegionMean:
                kind === "CheckBox" ? glyph / (20 * height * 3) : null,
            });
            if (row === 2) {
              await page.mouse.move(990, 490);
              await page.mouse.up();
            }
          }
      }
  writeFileSync(
    "../references/validation/selection-comparison.json",
    JSON.stringify(
      {
        nativeDpr: native.dpi,
        comparisons,
        acceptedReleaseParity: false,
        referenceKind:
          "Custom forced-VSM RenderTargetBitmap matrix; not a Gallery release screenshot",
        boundary:
          "Whole-control average error is a diagnostic budget only. Browser now uses source vector/marker playback; native Composition frames, AnimatedIcon interruption queues and glyph-path parity require separate release validation.",
      },
      null,
      2,
    ),
  );
  expect(Math.max(...comparisons.map((c) => c.mean))).toBeLessThan(4);
});
test("native image crops and styled text match both renderers", async ({
  page,
}) => {
  const native = JSON.parse(
    readFileSync("../out/foundation-native/foundation-metrics.json", "utf8"),
  );
  const expected = PNG.sync.read(
    readFileSync("../out/foundation-native/image-and-text.png"),
  );
  const results: { backend: string; sample: string; mean: number }[] = [];
  for (const backend of ["Canvas2D", "WebGL2"]) {
    await page.goto(`/?images=${backend}#button`);
    await expect(
      page.getByRole("button", { name: "Standard XAML", exact: true }),
    ).toBeVisible();
    await page.evaluate(
      async ({ backend, native }) => {
        const path = "/src/index.ts";
        const a = (await import(path)) as typeof import("../src/index");
        const host = document.createElement("div");
        host.id = "image-parity";
        host.style.cssText =
          "position:fixed;left:0;top:0;width:1000px;height:500px;z-index:99999";
        document.body.append(host);
        const scene = window.gallery.sdk.scene(host, {
          backend: a.RendererBackend[backend as keyof typeof a.RendererBackend],
          reducedMotion: true,
        });
        const canvas = scene.root.canvas();
        for (const image of native.images)
          canvas.image({
            width: 100,
            height: 100,
            source: "/official/valley.jpg",
            stretch: a.ImageStretch[image.mode as keyof typeof a.ImageStretch],
            canvasLeft: image.x, canvasTop: image.y,
          });
        for (const text of native.texts)
          canvas.text({
            text: text.text,
            fontFamily: text.italic ? "Comic Sans MS" : "Segoe UI",
            fontStyle: text.italic ? a.FontStyle.Italic : a.FontStyle.Normal,
            canvasLeft: 24, canvasTop: text.y,
          });
        window.selectionFixture = { scene, controls: [] };
      },
      { backend, native },
    );
    await expect.poll(() => page.evaluate(() => window.selectionFixture.scene.snapshot.nodes.length)).toBe(2 + native.images.length + native.texts.length);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.selectionFixture.scene.snapshot.imageRequests.length,
        ),
      )
      .toBe(0);
    const nativeFonts = JSON.parse(
      readFileSync("../out/foundation-native/font-details.json", "utf8"),
    );
    const browserFonts = await page.evaluate(() =>
      window.selectionFixture.scene.snapshot.nodes
        .filter((n) => n.props.text)
        .map((n) => ({
          text: n.props.text,
          width: n.text.lines[0].width,
          baseline: n.text.lines[0].baseline,
          lineHeight: n.text.line_height,
        })),
    );
    for (const font of nativeFonts) {
      const actual = browserFonts.find((f) => f.text === font.text)!;
      expect(Math.abs(actual.width - font.bounds.width)).toBeLessThan(0.02);
      expect(Math.abs(actual.baseline - font.baseline)).toBeLessThan(0.02);
    }
    const actual = PNG.sync.read(
      await page
        .locator("#image-parity canvas")
        .screenshot({ path: `../out/foundation/images-text-${backend}.png` }),
    );
    const samples = [
      ...native.images.map((r: any) => ({ ...r, name: r.mode })),
      ...native.texts.map((r: any) => ({
        x: 24,
        y: r.y,
        width: 300,
        height: 30,
        name: r.italic ? "Italic" : "Normal",
      })),
    ];
    for (const sample of samples) {
      let sum = 0;
      for (let y = sample.y; y < sample.y + sample.height; y++)
        for (let x = sample.x; x < sample.x + sample.width; x++)
          for (let c = 0; c < 3; c++) {
            const i = (y * 1000 + x) * 4 + c;
            sum += Math.abs(actual.data[i] - expected.data[i]);
          }
      results.push({
        backend,
        sample: sample.name,
        mean: sum / (sample.width * sample.height * 3),
      });
    }
  }
  writeFileSync(
    "../references/validation/image-text-comparison.json",
    JSON.stringify(
      {
        nativeDpr: native.dpi,
        acceptedPixelParity: false,
        remaining:
          "Scaled JPEG decode/filter differences and italic glyph rasterization; baseline and width are checked against native within 0.02 DIP.",
        results,
      },
      null,
      2,
    ),
  );
  for (const r of results)
    expect(r.mean).toBeLessThan(
      r.sample === "None"
        ? 0.1
        : r.sample === "Normal"
          ? 2
          : r.sample === "Italic"
            ? 10
            : 8,
    );
  // Pixel budgets record the remaining decoder/filter/glyph raster differences,
  // while the native baseline and layout widths are independently constrained.
});

test("Gallery defaults to Canvas2D and shows direct React properties", async ({
  page,
}) => {
  for (const route of [
    "button",
    "checkbox",
    "toggle-button",
    "textblock",
    "image",
    "foundation",
    "acrylic",
    "gradients",
    "effects-lab",
  ]) {
    await page.goto(`/#${route}`);
    await expect(page.locator(".winui-scene").first()).toBeVisible();
    expect(
      await page
        .locator(".winui-scene")
        .evaluateAll((nodes) =>
          nodes.map((n) => (n as HTMLElement).dataset.backend),
        ),
    ).not.toContain("WebGL2");
    expect(
      await page
        .locator(".winui-scene canvas")
        .first()
        .evaluate((c) => !!(c as HTMLCanvasElement).getContext("2d")),
    ).toBe(true);
  }
  await page.goto("/#textblock");
  await page.locator("details.source").first().locator("[aria-label=\"Source code\"][aria-expanded]").click();
  const code = page.locator("details.source").first().locator("code");
  await expect(code).toContainText('<TextBlock text="I am a TextBlock."');
  await expect(code).not.toContainText("options=");
  await page.goto("/#button");
  await page.locator("#button-standard details.source [aria-label=\"Source code\"][aria-expanded]").first().click();
  await expect(
    page.locator("#button-standard details.source code").first(),
  ).toContainText('text="Standard XAML button"');
  await expect(
    page.locator("#button-standard details.source code").first(),
  ).not.toContainText("options=");
});

test("source vector CheckBox draws progressively on both backends and settles under reduced motion", async ({
  page,
}) => {
  await page.goto("/#button");
  await expect(
    page.getByRole("button", { name: "Standard XAML", exact: true }),
  ).toBeVisible();
  for (const backend of ["Canvas2D", "WebGL2"]) {
    await page.evaluate(async (backend) => {
      const api = (await import(
        "/src/index.ts" as string
      )) as typeof import("../src/index");
      const host = document.createElement("div");
      host.id = "accept-fixture";
      host.style.cssText =
        "position:fixed;top:0;left:0;width:220px;height:32px;z-index:99999";
      document.body.append(host);
      const clock = { value: 0 };
      const sdk = await api.WinUI.create({ clock: () => clock.value });
      const scene = sdk.scene(host, {
        backend:
          api.RendererBackend[backend as keyof typeof api.RendererBackend],
        reducedMotion: false,
      });
      const check = scene.root.checkBox({
        height: 32,
        width: 220,
        accessibleName: "vector",
      });
      window.acceptFixture = { clock, sdk, scene, check };
    }, backend);
    await expect(
      page.locator("#accept-fixture [role=checkbox]"),
    ).toBeAttached();
    await page.evaluate(() => {
      const f = window.acceptFixture;
      f.clock.value = 10;
      f.check.update({ isChecked: true });
    });
    const samples: number[] = [];
    for (const time of [10, 90, 160, 210, 400]) {
      await page.evaluate((time) => {
        window.acceptFixture.clock.value = time;
      }, time);
      await expect
        .poll(() =>
          page.evaluate(() => window.acceptFixture.scene.snapshot.time),
        )
        .toBe(time);
      const bytes = await page.locator("#accept-fixture").screenshot();
      mkdirSync("../out/accept", { recursive: true });
      writeFileSync(`../out/accept/${backend}-${time}.png`, bytes);
      const png = PNG.sync.read(bytes);
      let white = 0;
      for (let y = 8; y < 24; y++)
        for (let x = 2; x < 18; x++) {
          const i = (y * png.width + x) * 4;
          white += png.data[i];
        }
      samples.push(white);
    }
    expect(samples[1], `${backend}: ${samples}`).toBeGreaterThan(samples[0]);
    expect(samples[4], `${backend}: ${samples}`).toBeGreaterThan(samples[1]);
    const coverage = (index: number) => (samples[index] - samples[0]) / (samples[4] - samples[0]);
    // Native ease-out paints most of the glyph early; the old accidental
    // linear curve only reached about half the path at 150ms.
    expect(coverage(2)).toBeGreaterThan(0.7);
    expect(coverage(3)).toBeGreaterThan(0.88);
    await page.evaluate(() => {
      const f = window.acceptFixture;
      f.clock.value = 410;
      f.check.update({ isChecked: false });
      f.scene.configure({ reducedMotion: true });
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.acceptFixture.scene.snapshot.animating),
      )
      .toBe(false);
    await page.evaluate(() => {
      const f = window.acceptFixture;
      f.sdk.dispose();
      document.getElementById("accept-fixture")!.remove();
    });
  }
});
