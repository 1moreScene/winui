import {selectGalleryOption} from './gallery-control-helper';
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import type { WinUI, Scene, Panel } from "../src/index";
declare global {
  interface Window {
    tintClock: number;
    tintFixture: { ui: WinUI; scene: Scene; panel: Panel };
  }
}

test("official Acrylic and Easing pages expose the actual examples", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#acrylic");
  await expect(page.locator("#acrylic-2 .winui-surface > canvas")).toBeVisible();
  await expect(page.locator("main h2")).toHaveText([
    "Default in-app acrylic brush.",
    "Custom acrylic in-app brush.",
    "Luminosity with in-app Acrylic.",
  ]);
  await selectGalleryOption(page.getByLabel("Tint color", { exact: true }),"#ff0000");
  await page
    .locator("#acrylic-1 > .example-card > .source")
    .first()
    .locator("[aria-label=\"Source code\"][aria-expanded]")
    .click();
  await expect(page.locator("#acrylic-1 pre").first()).toContainText(
    "tintOpacity",
  );
  await selectGalleryOption(page.locator("#theme"),"Dark");
  await page.locator("main").screenshot({
    path: "../out/materials/acrylic-gallery.png",
    animations: "disabled",
  });
  await page.goto("/#easing");
  await expect(page.locator("main .example")).toHaveCount(6);
  await expect(page.getByLabel("Easing type")).toHaveValue("Back");
  expect(await page.getByLabel("Easing type").locator("option").count()).toBe(
    11,
  );
  await page
    .getByRole("button", { name: "Animate easing 0", exact: true })
    .click();
  await selectGalleryOption(page.getByLabel("Easing type"),"Elastic");
  await page
    .getByRole("button", { name: "Animate easing 3", exact: true })
    .click();
  await page
    .locator("main")
    .screenshot({ path: "../out/materials/easing-gallery.png" });
  expect(errors).toEqual([]);
});

test("500ms tint updates follow native HSL path through interruption", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const native = JSON.parse(
    readFileSync("../out/materials-native/materials.json", "utf8"),
  );
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: native.dpi,
  });
  const page = await context.newPage();
  await page.goto("/#button");
  await expect(
    page.getByRole("button", { name: "Standard XAML", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const path = "/src/index.ts";
    const a = (await import(path)) as typeof import("../src/index");
    window.tintClock = 0;
    const ui = await a.WinUI.create({ clock: () => window.tintClock });
    const host = document.createElement("div");
    host.id = "tint-fixture";
    host.style.cssText =
      "position:fixed;left:0;top:0;width:652px;height:252px;z-index:999999";
    document.body.append(host);
    const scene = ui.scene(host, {
      backend: a.RendererBackend.WebGL2,
      root: { background: "#f3f3f3" },
    });
    const grid = scene.root.grid({
      columns: [
        { unit: a.GridUnit.Star },
        { unit: a.GridUnit.Pixel, value: 252 },
      ],
    });
    const bg = grid.grid();
    bg.grid({
      width: 100,
      height: 200,
      horizontalAlignment: a.HorizontalAlignment.Left,
      verticalAlignment: a.VerticalAlignment.Top,
      background: "#00ffff",
    });
    bg.ellipse({
      width: 152,
      height: 152,
      horizontalAlignment: a.HorizontalAlignment.Center,
      verticalAlignment: a.VerticalAlignment.Center,
      background: "#ff00ff",
    });
    bg.grid({
      width: 80,
      height: 100,
      horizontalAlignment: a.HorizontalAlignment.Right,
      verticalAlignment: a.VerticalAlignment.Bottom,
      background: "#ffff00",
    });
    const panel = grid.grid({
      margin: [12, 12, 12, 12],
      acrylic: {
        tintColor: "#000000",
        tintOpacity: 0.8,
        fallbackColor: "#008000",
      },
    });
    window.tintFixture = { ui, scene, panel };
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.tintFixture.scene.snapshot.nodes.length),
    )
    .toBe(7);
  const frames = [];
  let actionIndex = 0;
  for (const frame of native.colorFrames) {
    while (
      actionIndex < native.colorActions.length &&
      native.colorActions[actionIndex].timeMs <= frame.timeMs
    ) {
      await page.evaluate((action) => {
        window.tintClock = action.timeMs;
        window.tintFixture.panel.update({
          acrylic: {
            tintColor: action.tint,
            tintOpacity: 0.8,
            fallbackColor: "#008000",
          },
        });
      }, native.colorActions[actionIndex++]);
    }
    await page.evaluate((time) => {
      window.tintClock = time;
      window.tintFixture.scene.configure({});
    }, frame.timeMs);
    await expect
      .poll(() => page.evaluate(() => window.tintFixture.scene.snapshot.time))
      .toBe(frame.timeMs);
    const actual = PNG.sync.read(
      await page.locator("#tint-fixture > .winui-surface > canvas").screenshot(),
    );
    const expected = PNG.sync.read(
      readFileSync(`../out/materials-native/${frame.name}.png`),
    );
    let sum = 0,
      count = 0;
    for (
      let y = Math.ceil(15 * native.dpi);
      y < Math.floor(235 * native.dpi);
      y++
    )
      for (
        let x = Math.ceil(15 * native.dpi);
        x < Math.floor(385 * native.dpi);
        x++
      ) {
        const i = (y * actual.width + x) * 4;
        for (let c = 0; c < 3; c++) {
          sum += Math.abs(actual.data[i + c] - expected.data[i + c]);
          count++;
        }
      }
    frames.push({ name: frame.name, timeMs: frame.timeMs, mean: sum / count });
  }
  const errors = frames.map((f) => f.mean).sort((a, b) => a - b);
  const p95 = errors[Math.floor(errors.length * 0.95)];
  writeFileSync(
    "../references/validation/tint-animation-comparison.json",
    JSON.stringify(
      {
        colorSpace: "Hsl",
        durationMs: 500,
        frames,
        p95,
        max: Math.max(...errors),
      },
      null,
      2,
    ),
  );
  const fixed = [];
  for (const [pairIndex, pair] of ["black-red", "red-blue"].entries()) {
    const base = 2000 + pairIndex * 1000;
    await page.evaluate(
      ({ base, from }) => {
        window.tintClock = base;
        window.tintFixture.scene.configure({ reducedMotion: true });
        window.tintFixture.panel.update({
          acrylic: {
            tintColor: from,
            tintOpacity: 0.8,
            fallbackColor: "#008000",
          },
        });
      },
      { base, from: pairIndex ? "#ff0000" : "#000000" },
    );
    await expect
      .poll(() => page.evaluate(() => window.tintFixture.scene.snapshot.time))
      .toBe(base);
    await page.evaluate(
      (to) => {
        window.tintFixture.scene.configure({ reducedMotion: false });
        window.tintFixture.panel.update({
          acrylic: {
            tintColor: to,
            tintOpacity: 0.8,
            fallbackColor: "#008000",
          },
        });
      },
      pairIndex ? "#0000ff" : "#ff0000",
    );
    await expect
      .poll(() =>
        page.evaluate(() => window.tintFixture.scene.snapshot.animating),
      )
      .toBe(true);
    for (const sample of native.tintFixed.filter(
      (s: { pair: string }) => s.pair === pair,
    )) {
      const at = base + 500 * sample.progress;
      await page.evaluate((at) => {
        window.tintClock = at;
        window.tintFixture.scene.configure({});
      }, at);
      await expect
        .poll(() => page.evaluate(() => window.tintFixture.scene.snapshot.time))
        .toBe(at);
      const actual = PNG.sync.read(
        await page.locator("#tint-fixture > .winui-surface > canvas").screenshot(),
      );
      const expected = PNG.sync.read(
        readFileSync(`../out/materials-native/${sample.name}.png`),
      );
      let sum = 0,
        count = 0;
      for (
        let y = Math.ceil(15 * native.dpi);
        y < Math.floor(235 * native.dpi);
        y++
      )
        for (
          let x = Math.ceil(15 * native.dpi);
          x < Math.floor(385 * native.dpi);
          x++
        ) {
          const i = (y * actual.width + x) * 4;
          for (let c = 0; c < 3; c++) {
            sum += Math.abs(actual.data[i + c] - expected.data[i + c]);
            count++;
          }
        }
      fixed.push({ ...sample, mean: sum / count });
    }
  }
  const fixedErrors = fixed.map((f) => f.mean).sort((a, b) => a - b);
  const fixedP95 = fixedErrors[Math.floor(fixedErrors.length * 0.95)];
  writeFileSync(
    "../references/validation/tint-animation-comparison.json",
    JSON.stringify(
      {
        colorSpace: "Hsl",
        durationMs: 500,
        wallClock: {
          frames,
          p95,
          max: Math.max(...errors),
          boundary:
            "UI and compositor captures have different present latency; no clock fitting applied.",
        },
        fixedProgress: {
          frames: fixed,
          p95: fixedP95,
          max: Math.max(...fixedErrors),
          boundary:
            "Native protected effect controllers are paused only by the probe. Browser uses public SDK and the same normalized animation progress.",
        },
      },
      null,
      2,
    ),
  );
  expect(fixedP95).toBeLessThan(2);
  await context.close();
});

test("property transitions, gradient options and focus policies remain interactive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#transitions");
  await expect(page.locator("main .example")).toHaveCount(6);
  for (const [property, value] of [
    ["Opacity", "1"],
    ["Rotation", "180"],
    ["Scale", "2"],
    ["Translation", "100"],
  ]) {
    await page.getByLabel(`${property} target`, { exact: true }).fill(value);
    await page.getByLabel(`${property} target`, { exact: true }).press("Enter");
  }
  await page
    .getByRole("button", { name: "Set Translation to (0, 0)", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.propertyScenes.slice(0,4).map((scene) => {
          const n = scene.snapshot.nodes.find(
            (node) => node.props.width === 50,
          )!;
          return [
            n.presentation.opacity,
            n.presentation.rotation,
            n.presentation.scaleX,
            n.presentation.translationX,
          ];
        }),
      ),
    )
    .toEqual([
      [1, 0, 1, 0],
      [1, 180, 1, 0],
      [1, 0, 2, 0],
      [1, 0, 1, 0],
    ]);
  await page
    .getByRole("button", { name: "Set Translation to (200, 200)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Set Translation to (0, 0)", exact: true })
    .click();
  await page
    .locator("main")
    .screenshot({ path: "../out/materials/transitions-gallery.png" });
  await page.goto("/#gradients");
  await expect(page.locator("#radial-gradient .winui-surface > canvas")).toBeVisible();
  await selectGalleryOption(page
    .getByLabel("MappingMode", { exact: true }),"Absolute");
  await expect(page.getByLabel("RadiusX", { exact: true })).toHaveValue("100");
  await page.getByLabel("RadiusX", { exact: true }).fill("0");
  await selectGalleryOption(page
    .getByLabel("SpreadMethod", { exact: true }),"Reflect");
  await selectGalleryOption(page.getByLabel("Gradient renderer"),"Canvas2D");
  await selectGalleryOption(page.getByLabel("Gradient renderer"),"WebGL2");
  await selectGalleryOption(page
    .getByLabel("MappingMode", { exact: true }),"RelativeToBoundingBox");
  await expect(page.getByLabel("RadiusX", { exact: true })).toHaveValue("0.5");
  await page.getByLabel("RadiusX", { exact: true }).focus();
  expect(
    await page
      .getByLabel("RadiusX", { exact: true })
      .evaluate((e) => getComputedStyle(e).outlineStyle),
  ).toBe("none");
  await page
    .locator("main")
    .screenshot({ path: "../out/materials/gradients-gallery.png" });
  await page.goto("/#acrylic");
  await selectGalleryOption(page.locator("#theme"),"HighContrast");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.materialScenes.every((scene) => !scene.snapshot.animating),
      ),
    )
    .toBe(true);
  await page.goto("/#system-backdrops");
  await expect(page.locator("main")).toContainText("MicaController");
  await expect(page.locator("main canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("matched official Acrylic geometry, themes and recipes compare with native", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const native = JSON.parse(
    readFileSync("../out/materials-native/materials.json", "utf8"),
  );
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: native.dpi,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const results = [];
  mkdirSync("../out/materials", { recursive: true });
  for (const record of native.records) {
    if (process.env.MATERIAL_CASE && record.name !== process.env.MATERIAL_CASE)
      continue;
    await page.goto(`/?material-case=${record.name}#acrylic`);
    await expect(page.locator(`#acrylic-${record.index} .winui-surface > canvas`)).toBeVisible();
    await selectGalleryOption(page.locator("#theme"),record.theme);
    if (record.index === 1)
      await selectGalleryOption(page
        .getByLabel("Tint color", { exact: true }),record.tint);
    if (record.index > 0)
      await page
        .getByLabel(`Tint opacity ${record.index}`, { exact: true })
        .fill(String(record.opacity));
    if (record.index === 2)
      await page
        .getByLabel("Tint luminosity", { exact: true })
        .fill(String(record.luminosity));
    // Wait for the actual Rust-owned color tracks to settle rather than CSS time.
    await page.waitForFunction(
      (index) => !window.materialScenes[index].snapshot.animating,
      record.index,
    );
    await page
      .locator(`#acrylic-${record.index} .winui-scene`)
      .evaluate((el, width) => {
        (el as HTMLElement).style.cssText +=
          `;position:fixed;left:0;top:0;width:${width}px;height:252px;z-index:99999`;
      }, record.width);
    const actual = PNG.sync.read(
      await page
        .locator(`#acrylic-${record.index} .winui-surface > canvas`)
        .screenshot({ path: `../out/materials/${record.name}-browser.png` }),
    );
    const expected = PNG.sync.read(
      readFileSync(`../out/materials-native/${record.name}.png`),
    );
    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    let sum = 0,
      max = 0,
      count = 0;
    // Full glass and all three background shapes, excluding the rounded OS window corners.
    for (let y = 5; y < actual.height - 5; y++)
      for (
        let x = 5;
        x < Math.min(actual.width - 5, Math.round(400 * native.dpi));
        x++
      ) {
        const i = (y * actual.width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const d = Math.abs(actual.data[i + c] - expected.data[i + c]);
          sum += d;
          max = Math.max(max, d);
          count++;
        }
      }
    const result = { ...record, mean: sum / count, max };
    results.push(result);
    if (result.mean >= 3)
      writeFileSync(
        "../out/materials/failed-diagnostics.json",
        JSON.stringify(
          await page.evaluate(
            (index) => window.materialScenes[index].snapshot,
            record.index,
          ),
          null,
          2,
        ),
      );
    expect(result.mean).toBeLessThan(3);
  }
  writeFileSync(
    "../references/validation/official-acrylic-comparison.json",
    JSON.stringify({ dpi: native.dpi, results }, null, 2),
  );
  expect(errors).toEqual([]);
  await context.close();
});

test("radial gradient spread and outside focal point match native on both backends", async ({
  browser,
}) => {
  const native = JSON.parse(
    readFileSync("../out/materials-native/materials.json", "utf8"),
  );
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: native.dpi,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const results = [];
  for (const record of native.gradients)
    for (const backend of ["Canvas2D", "WebGL2"]) {
      await page.goto(`/?gradient-case=${record.name}-${backend}#button`);
      await expect(
        page.getByRole("button", { name: "Standard XAML", exact: true }),
      ).toBeVisible();
      await page.evaluate(
        async ({ record, backend }) => {
          const path = "/src/index.ts";
          const a = (await import(path)) as typeof import("../src/index");
          const host = document.createElement("div");
          host.id = "gradient-fixture";
          host.style.cssText =
            "position:fixed;left:0;top:0;width:200px;height:200px;z-index:999999";
          document.body.append(host);
          window.gallery.sdk
            .scene(host, {
              backend:
                a.RendererBackend[backend as keyof typeof a.RendererBackend],
            })
            .root.grid({
              background: {
                kind: a.GradientKind.Radial,
                center: [0.5, 0.5],
                origin: [record.originX, 0.5],
                radius: [0.25, 0.4],
                spreadMethod:
                  a.GradientSpread[
                    record.spread as keyof typeof a.GradientSpread
                  ],
                stops: [
                  { offset: 0, color: "#ffff00" },
                  { offset: 1, color: "#0000ff" },
                ],
              },
            });
        },
        { record, backend },
      );
      const actual = PNG.sync.read(
        await page.locator("#gradient-fixture > .winui-surface > canvas").screenshot({
          path: `../out/materials/${record.name}-${backend}.png`,
        }),
      );
      const expected = PNG.sync.read(
        readFileSync(`../out/materials-native/${record.name}.png`),
      );
      let sum = 0,
        count = 0;
      for (let y = 5; y < actual.height - 5; y++)
        for (let x = 5; x < actual.width - 5; x++) {
          const i = (y * actual.width + x) * 4;
          for (let c = 0; c < 3; c++) {
            sum += Math.abs(actual.data[i + c] - expected.data[i + c]);
            count++;
          }
        }
      const result = { name: record.name, backend, mean: sum / count };
      results.push(result);
      writeFileSync(
        "../references/validation/gradient-comparison.json",
        JSON.stringify({ dpi: native.dpi, results }, null, 2),
      );
      expect(result.mean).toBeLessThan(1.5);
    }
  expect(errors).toEqual([]);
  await context.close();
});
