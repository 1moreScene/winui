import {selectGalleryOption} from './gallery-control-helper';
import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import type {
  WinUI,
  Scene,
  Panel,
  Animation,
  AnimationResult,
} from "../src/index";
declare global {
  interface Window {
    effectsTime: number;
    effectsLoss?: WEBGL_lose_context;
    effectsFixture: {
      sdk: WinUI;
      scenes: Scene[];
      backgrounds: Panel[];
      panels: Panel[];
      animation?: Animation;
      results: AnimationResult[];
    };
  }
}
const failures = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
});
test.afterEach(({ page }) => expect(failures.get(page)).toEqual([]));

async function fixture(page: Page) {
  await page.goto("/#button");
  await expect(
    page.getByRole("button", { name: "Standard XAML", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const path = "/src/index.ts";
    const a = (await import(path)) as typeof import("../src/index");
    window.effectsTime = 0;
    const sdk = await a.WinUI.create({ clock: () => window.effectsTime });
    const root = document.createElement("div");
    root.id = "effects-fixture";
    root.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:white";
    document.body.append(root);
    const scenes: Scene[] = [],
      backgrounds: Panel[] = [],
      panels: Panel[] = [];
    for (const [index, backend] of [
      a.RendererBackend.Canvas2D,
      a.RendererBackend.WebGL2,
    ].entries()) {
      const host = document.createElement("div");
      host.id = `effect-${index}`;
      host.style.cssText = `position:absolute;left:${index * 620}px;top:0;width:600px;height:400px`;
      root.append(host);
      const scene = sdk.scene(host, {
        backend,
        root: { background: "#31578b" },
      });
      const bg = scene.root.grid({
        width: 900,
        height: 500,
        horizontalAlignment: a.HorizontalAlignment.Left,
        verticalAlignment: a.VerticalAlignment.Top,
      });
      for (const [i, color] of [
        "#df7467",
        "#edbd59",
        "#46a6a2",
        "#6684cf",
      ].entries()) {
        bg.grid({
          width: 200,
          height: 500,
          margin: [i * 220, 0, 0, 0],
          horizontalAlignment: a.HorizontalAlignment.Left,
          background: color,
        });
      }
      const panel = scene.root.grid({
        width: 320,
        height: 240,
        margin: [140, 80, 0, 0],
        horizontalAlignment: a.HorizontalAlignment.Left,
        verticalAlignment: a.VerticalAlignment.Top,
        acrylic: {
          tintColor: "#ffffff",
          tintOpacity: 0.2,
          luminosityOpacity: 0.65,
          fallbackColor: "#f3f3f3",
        },
      });
      const stack = panel.stack({ padding: [24, 24, 24, 24], spacing: 16 });
      stack.text({ text: "Acrylic / 中文", fontSize: 22 });
      const button = stack.button({
        text: "Animate",
        variant: a.ButtonVariant.Accent,
      });
      button.onClick(() =>
        panel.animate({ translationX: 50, opacity: 0.6 }, { duration: 100 }),
      );
      scenes.push(scene);
      backgrounds.push(bg);
      panels.push(panel);
    }
    window.effectsFixture = { sdk, scenes, backgrounds, panels, results: [] };
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.effectsFixture.scenes.every((s) => s.snapshot.nodes.length > 9),
      ),
    )
    .toBe(true);
}
async function tick(page: Page, time: number) {
  await page.evaluate((time) => {
    window.effectsTime = time;
    for (const s of window.effectsFixture.scenes) s.configure({});
  }, time);
  try {
    await expect.poll(() => page.evaluate(() => window.effectsFixture.scenes[1].snapshot.time)).toBe(time);
  } catch (error) {
    writeFileSync('../out/effects-clock-failure.json', JSON.stringify(await page.evaluate(() => ({
      expected: window.effectsTime, visibility: document.visibilityState,
      scenes: window.effectsFixture.scenes.map(s => {
        const internal = s as unknown as {frame:number;disposed:boolean;drawing:boolean;stats:unknown};
        return {time:s.snapshot.time,backend:s.snapshot.backend,frame:internal.frame,disposed:internal.disposed,drawing:internal.drawing,stats:internal.stats};
      }),
    })), null, 2));
    throw error;
  }
}
function pixelDiff(left: Buffer, right: Buffer, region = [0, 0, 600, 400]) {
  const a = PNG.sync.read(left),
    b = PNG.sync.read(right);
  let sum = 0,
    max = 0,
    n = 0;
  const scale = a.width / 600;
  for (
    let y = Math.ceil(region[1] * scale);
    y < Math.floor(region[3] * scale);
    y++
  )
    for (
      let x = Math.ceil(region[0] * scale);
      x < Math.floor(region[2] * scale);
      x++
    ) {
      const i = (y * a.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(a.data[i + c] - b.data[i + c]);
        sum += d;
        max = Math.max(max, d);
        n++;
      }
    }
  return { mean: sum / n, max };
}

test("Gallery exposes working GPU Acrylic, reversal and Canvas fallback", async ({
  page,
}) => {
  await page.goto("/#effects-lab");
  await selectGalleryOption(page.getByLabel("Renderer", { exact: true }),"WebGL2");
  const play = page.getByRole("button", {
    name: "Play / reverse",
    exact: true,
  });
  await expect(play).toBeVisible();
  const canvas = page.locator("#effects-example canvas");
  const initial = await canvas.screenshot();
  await canvas.hover({ position: { x: 80, y: 200 }, force: true });
  await page.mouse.wheel(0, 240);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const scrolled = await canvas.screenshot();
  expect(scrolled.equals(initial)).toBe(false);
  const move = page.getByRole("button", {
    name: "Move / pause background",
    exact: true,
  });
  await move.click();
  await expect
    .poll(async () => !(await canvas.screenshot()).equals(scrolled))
    .toBe(true);
  await move.click();
  await page
    .locator("#effects-example")
    .screenshot({ path: "../out/effects/gallery-gpu.png" });
  for (let i = 0; i < 12; i++) await play.click({ force: true });
  await expect(page.locator("#effects-output")).toHaveText("Completed");
  await page
    .getByRole("checkbox", { name: "Reduce transparency", exact: true })
    .check();
  await selectGalleryOption(page.getByLabel("Renderer", { exact: true }),"Canvas2D");
  await expect(play).toBeVisible();
  await play.click();
  await expect(page.locator("#effects-output")).toHaveText("Completed");
  await page
    .locator("#effects-example")
    .screenshot({ path: "../out/effects/gallery.png" });
});

test("presentation tracks preserve delayed targets, reverse continuously and settle on disposal", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    const p = window.effectsFixture.panels[1];
    const animation = p.animate(
      { translationX: 200, opacity: 0.2 },
      { duration: 100, delay: 50, easing: undefined, curve: [0, 0, 1, 1] },
    );
    window.effectsFixture.animation = animation;
    void animation.finished.then((r) => window.effectsFixture.results.push(r));
  });
  await tick(page, 25);
  expect(
    await page.evaluate(
      () => window.effectsFixture.panels[1].snapshot.presentation.translationX,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => window.effectsFixture.panels[1].properties.translationX,
    ),
  ).toBe(200);
  await tick(page, 100);
  const current = await page.evaluate(
    () => window.effectsFixture.panels[1].snapshot.presentation.translationX,
  );
  expect(current).toBeCloseTo(100, 1);
  await page.evaluate(() => {
    const animation = window.effectsFixture.panels[1].animate(
      { translationX: 0, opacity: 1 },
      { duration: 100, curve: [0, 0, 1, 1] },
    );
    window.effectsFixture.animation = animation;
    void animation.finished.then((r) => window.effectsFixture.results.push(r));
  });
  await tick(page, 150);
  expect(
    await page.evaluate(
      () => window.effectsFixture.panels[1].snapshot.presentation.translationX,
    ),
  ).toBeCloseTo(50, 1);
  await page.evaluate(() => window.effectsFixture.animation!.cancel());
  await tick(page, 250);
  expect(await page.evaluate(() => window.effectsFixture.results)).toEqual([
    "Interrupted",
    "Cancelled",
  ]);
  expect(
    await page.evaluate(
      () => window.effectsFixture.panels[1].snapshot.presentation.translationX,
    ),
  ).toBeCloseTo(50, 1);
  expect(
    await page.evaluate(
      () => window.effectsFixture.panels[1].properties.translationX,
    ),
  ).toBe(0);
  await page.evaluate(() => {
    const p = window.effectsFixture.panels[1];
    void p
      .animate({ translationY: 80 }, { duration: 500 })
      .finished.then((r) => window.effectsFixture.results.push(r));
    p.dispose();
  });
  await expect
    .poll(() => page.evaluate(() => window.effectsFixture.results))
    .toEqual(["Interrupted", "Cancelled", "Disposed"]);
});

test("Acrylic samples moving backgrounds and agrees across backends at two DPIs", async ({
  browser,
}) => {
  mkdirSync("../out/effects", { recursive: true });
  const results = [];
  for (const dpr of [1, 2]) {
    const context = await browser.newContext({
      viewport: { width: 1300, height: 800 },
      deviceScaleFactor: dpr,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await fixture(page);
    const before = await page.locator("#effect-1").screenshot();
    for (const offset of [0, -180]) {
      await page.evaluate((offset) => {
        for (const p of window.effectsFixture.backgrounds)
          p.update({ translationX: offset });
      }, offset);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.effectsFixture.backgrounds[1].snapshot.presentation
                .translationX,
          ),
        )
        .toBe(offset);
      const canvas = await page
        .locator("#effect-0")
        .screenshot({ path: `../out/effects/canvas-${dpr}-${offset}.png` });
      const gpu = await page
        .locator("#effect-1")
        .screenshot({ path: `../out/effects/gpu-${dpr}-${offset}.png` });
      const diff = pixelDiff(canvas, gpu, [150, 200, 450, 310]);
      results.push({ dpr, offset, ...diff });
      expect(diff.mean).toBeLessThan(7);
      if (offset !== 0)
        expect(
          pixelDiff(before, gpu, [150, 200, 450, 310]).mean,
        ).toBeGreaterThan(8);
    }
    expect(errors).toEqual([]);
    await context.close();
  }
  writeFileSync(
    "../references/validation/material-backends.json",
    JSON.stringify(
      {
        results,
        boundary:
          "Local acrylic region excludes label/button text; downsampled GPU Gaussian is approximate, not native pixel equivalence.",
      },
      null,
      2,
    ),
  );
});

test("nested translucent clips sample lower layers, policies and cache survive context loss", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    for (const scene of window.effectsFixture.scenes) {
      const group = scene.root.grid({
        width: 140,
        height: 140,
        margin: [350, 200, 0, 0],
        horizontalAlignment:
          window.effectsFixture.panels[0].properties.horizontalAlignment,
        opacity: 0.6,
        clip: true,
        transform: [0.9, 0.1, -0.1, 0.9, 0, 0],
      });
      group.grid({
        width: 200,
        height: 180,
        acrylic: {
          tintColor: "#102030",
          tintOpacity: 0.1,
          fallbackColor: "#20202080",
        },
      });
    }
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.effectsFixture.scenes[1].snapshot.nodes.length,
      ),
    )
    .toBe(12);
  const a = await page.locator("#effect-0").screenshot(),
    b = await page.locator("#effect-1").screenshot();
  expect(pixelDiff(a, b, [365, 225, 460, 305]).mean).toBeLessThan(7);
  const cache = await page.evaluate(
    () => window.effectsFixture.scenes[1].diagnostics.cachedSurfaces,
  );
  for (let i = 1; i <= 8; i++) await tick(page, i * 10);
  expect(
    await page.evaluate(
      () => window.effectsFixture.scenes[1].diagnostics.cachedSurfaces,
    ),
  ).toBe(cache);
  await page.evaluate(() => {
    for (const s of window.effectsFixture.scenes)
      s.configure({ reducedTransparency: true });
  });
  await tick(page, 300);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.effectsFixture.panels[1].snapshot.materialWeight,
      ),
    )
    .toBe(0);
  await page.evaluate(() => {
    const p = window.effectsFixture.panels[1];
    void p
      .animate({ translationY: 100 }, { duration: 10000, delay: 500 })
      .finished.then((r) => window.effectsFixture.results.push(r));
    window.effectsFixture.scenes[1].configure({ reducedMotion: true });
  });
  await tick(page, 301);
  expect(
    await page.evaluate(
      () => window.effectsFixture.panels[1].snapshot.presentation.translationY,
    ),
  ).toBe(100);
  expect(await page.evaluate(() => window.effectsFixture.results)).toEqual([
    "Completed",
  ]);
  const glCanvas = page.locator("#effect-1 canvas");
  await glCanvas.evaluate((c) => {
    window.effectsLoss = (c as HTMLCanvasElement)
      .getContext("webgl2")!
      .getExtension("WEBGL_lose_context")!;
    window.effectsLoss.loseContext();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.effectsFixture.scenes[1].snapshot.backend.lost,
      ),
    )
    .toBe(true);
  await page.evaluate(() => window.effectsLoss!.restoreContext());
  await expect
    .poll(() =>
      page.evaluate(
        () => window.effectsFixture.scenes[1].snapshot.backend.generation,
      ),
    )
    .toBe(2);
  await page.evaluate(() => window.effectsFixture.sdk.dispose());
  expect(await page.locator("#effects-fixture canvas").count()).toBe(0);
});

test("host motion policy, high contrast and completion reentry remain deterministic", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    const p = window.effectsFixture.panels[1];
    void p
      .animate({ translationX: 40 }, { duration: 100 })
      .finished.then((result) => {
        window.effectsFixture.results.push(result);
        void p
          .animate({ translationX: 0 }, { duration: 100 })
          .finished.then((r) => window.effectsFixture.results.push(r));
      });
  });
  await tick(page, 100);
  await tick(page, 200);
  await expect
    .poll(() => page.evaluate(() => window.effectsFixture.results))
    .toEqual(["Completed", "Completed"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    const path = "/src/index.ts";
    const a = (await import(path)) as typeof import("../src/index");
    const p = window.effectsFixture.panels[1];
    void p
      .animate({ translationX: 10 }, { duration: 5000, delay: 2000 })
      .finished.then((r) => window.effectsFixture.results.push(r));
    for (const s of window.effectsFixture.scenes)
      s.configure({ theme: a.ThemeMode.HighContrast });
  });
  await tick(page, 201);
  expect(
    await page.evaluate(
      () => window.effectsFixture.panels[1].snapshot.presentation.translationX,
    ),
  ).toBe(10);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.effectsFixture.panels[1].snapshot.materialWeight,
      ),
    )
    .toBe(0);
  const before = await page.evaluate(
    () => window.effectsFixture.scenes[1].diagnostics.effectPasses,
  );
  await tick(page, 300);
  expect(
    await page.evaluate(
      () => window.effectsFixture.scenes[1].diagnostics.effectPasses,
    ),
  ).toBe(before);
  const canvas = page.locator("#effect-1 canvas");
  expect(
    await canvas.evaluate((c) =>
      (c as HTMLCanvasElement).getContext("webgl2")!.getError(),
    ),
  ).toBe(0);
});

test("fixed native Acrylic and frame-by-frame interruption retain measured differences", async ({
  browser,
}) => {
  test.setTimeout(120000);
  test.skip(
    !existsSync("../out/effects-native/effects-samples.json"),
    "Run tools/run-native-probe.ps1 -Kind Effects first",
  );
  const native = JSON.parse(
    readFileSync("../out/effects-native/effects-samples.json", "utf8"),
  );
  const context = await browser.newContext({
    viewport: { width: 1300, height: 800 },
    deviceScaleFactor: native.dpi,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page);
  const staticResults = [];
  for (const record of native.staticRecords) {
    expect(record.screenForeground).toBe(true);
    await page.evaluate(async ({ theme, offset }) => {
      const path = "/src/index.ts";
      const a = (await import(path)) as typeof import("../src/index");
      const f = window.effectsFixture;
      for (const s of f.scenes)
        s.configure({ theme: a.ThemeMode[theme as keyof typeof a.ThemeMode] });
      for (const b of f.backgrounds) b.update({ translationX: offset });
    }, record);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.effectsFixture.backgrounds[1].snapshot.presentation
              .translationX,
        ),
      )
      .toBe(record.offset);
    const gpu = await page.locator("#effect-1").screenshot({
      path: `../out/effects/native-${record.theme}-${record.offset}-browser.png`,
    });
    const original = readFileSync(
      `../out/effects-native/${record.theme}-${record.offset}-screen.png`,
    );
    const difference = pixelDiff(original, gpu, [150, 200, 450, 310]);
    staticResults.push({ ...record, ...difference });
    expect(difference.mean).toBeLessThan(8);
  }
  await page.evaluate(async () => {
    const path = "/src/index.ts";
    const a = (await import(path)) as typeof import("../src/index");
    for (const s of window.effectsFixture.scenes)
      s.configure({ theme: a.ThemeMode.Light });
    for (const b of window.effectsFixture.backgrounds)
      b.update({ translationX: 0 });
  });
  const frames = [];
  let actionIndex = 0;
  for (const frame of native.frames) {
    while (
      actionIndex < native.actions.length &&
      native.actions[actionIndex].timeMs <= frame.startMs
    ) {
      const action = native.actions[actionIndex++];
      await page.evaluate((action) => {
        window.effectsTime = action.timeMs;
        window.effectsFixture.panels[1].animate(
          { translationX: action.targetX, opacity: action.targetOpacity },
          { duration: action.duration, delay: action.delay },
        );
      }, action);
    }
    await tick(page, frame.startMs);
    const actual = await page.evaluate(
      () => window.effectsFixture.panels[1].snapshot.presentation,
    );
    const gpu = await page
      .locator("#effect-1")
      .screenshot({ path: `../out/effects/${frame.name}-browser.png` });
    const original = readFileSync(`../out/effects-native/${frame.name}.png`);
    frames.push({
      name: frame.name,
      timeMs: frame.startMs,
      captureEndMs: frame.endMs,
      screenForeground: frame.screenForeground,
      nativeX: frame.x,
      browserX: actual.translationX,
      xError: Math.abs(frame.x - actual.translationX),
      nativeOpacity: frame.opacity,
      browserOpacity: actual.opacity,
      opacityError: Math.abs(frame.opacity - actual.opacity),
      pixels: pixelDiff(original, gpu, [140, 190, 580, 310]),
    });
  }
  const sorted = frames.map((f) => f.xError).sort((a, b) => a - b);
  const report = {
    nativeEnvironment: {
      sdk: native.sdk,
      dpr: native.dpi,
      width: native.width,
      height: native.height,
      font: native.font,
    },
    staticResults,
    frameCount: frames.length,
    xErrorP95: sorted[Math.floor(sorted.length * 0.95)],
    xErrorMax: Math.max(...sorted),
    opacityErrorMax: Math.max(...frames.map((f) => f.opacityError)),
    frames,
    boundary:
      "UI Rendering callbacks and GDI capture brackets are measured separately. Screenshot may reflect a previous compositor frame. Browser replay uses native wall-clock action times; no clock fitting or native from-value injection. Pixel and exact present-time equivalence are not accepted.",
  };
  mkdirSync("../references/validation", { recursive: true });
  writeFileSync(
    "../references/validation/effects-native-comparison.json",
    JSON.stringify(report, null, 2),
  );
  expect(report.xErrorP95).toBeLessThan(12);
  expect(report.opacityErrorMax).toBeLessThan(0.06);
  expect(errors).toEqual([]);
  await context.close();
});
