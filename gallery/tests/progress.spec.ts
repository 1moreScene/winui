import {selectGalleryOption} from './gallery-control-helper';
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import type {
  Scene,
  WinUI,
  ProgressBar,
  ProgressRing,
  SceneEvent,
} from "../src/index";
test.use({ deviceScaleFactor: 1.25 });
declare global {
  interface Window {
    progressFixture: {
      sdk: WinUI;
      scene: Scene;
      control: ProgressBar | ProgressRing;
      time: number;
      events: SceneEvent[];
    };
  }
}

test("ProgressBar Gallery options and direct React value update", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#progress-bar");
  const sample = page.locator("#bar-indeterminate");
  await expect(sample.getByRole("progressbar")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await sample.getByRole("radio", { name: "Paused", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.progressScenes["bar-indeterminate"].snapshot.nodes.find(
            (n) => n.kind === "ProgressBar",
          )?.progress?.color,
      ),
    )
    .toBe("#9d5d00ff");
  await sample.getByRole("radio", { name: "Error", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.progressScenes["bar-indeterminate"].snapshot.nodes.find(
            (n) => n.kind === "ProgressBar",
          )?.progress?.color,
      ),
    )
    .toBe("#c42b1cff");
  await page.getByRole("spinbutton", { name: "Bar progress" }).fill("75");
  await expect(
    page.locator("#bar-determinate").getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "75");
  await sample.locator("[aria-label=\"Source code\"][aria-expanded]").click();
  await expect(sample.locator("pre")).toContainText("<ProgressBar");
  await expect(sample.locator("pre")).not.toContainText("options={{");
  await selectGalleryOption(page.locator("#theme"),"Dark");
  await sample.getByRole("radio", { name: "Running", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.progressScenes["bar-indeterminate"].snapshot.nodes.find(
            (n) => n.kind === "ProgressBar",
          )?.progress?.color,
      ),
    )
    .toBe("#4cc2ffff");
  expect(errors).toEqual([]);
});
test("ProgressRing Gallery active/background/value and ToggleSwitch dependency", async ({
  page,
}) => {
  await page.goto("/#progress-ring");
  const sample = page.locator("#ring-indeterminate");
  await expect(sample.getByRole("progressbar")).toBeVisible();
  await sample.getByRole("switch", { name: "Progress Options" }).click();
  await expect(sample.getByRole("progressbar")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.progressScenes["ring-indeterminate"].snapshot.animating,
      ),
    )
    .toBe(false);
  await sample.getByRole("switch", { name: "Progress Options" }).click();
  await expect(sample.getByRole("progressbar")).toBeVisible();
  await selectGalleryOption(sample
    .getByRole("combobox", { name: "Background color" }),"#d3d3d3");
  await page.getByRole("spinbutton", { name: "Ring progress" }).fill("50");
  await expect(
    page.locator("#ring-determinate").getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "50");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.progressScenes["ring-determinate"].snapshot.nodes.find(
            (n) => n.kind === "ProgressRing",
          )?.progress?.trimEnd,
      ),
    )
    .toBeCloseTo(0.5, 3);
  await page.goto("/#toggle-switch");
  const custom = page.locator("#switch-custom");
  await expect(custom.getByRole("progressbar")).toBeVisible();
  await custom.getByRole("switch").click();
  await expect(custom.getByRole("progressbar")).toHaveCount(0);
  await custom.locator("[aria-label=\"Source code\"][aria-expanded]").click();
  await expect(custom.locator("pre")).toContainText("<ProgressRing");
});

for (const backend of ["Canvas2D", "WebGL2"] as const)
  test(`${backend} progress geometry and colors match fixed SDK frozen matrices at 125% DPI`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    mkdirSync("../out/progress-browser", { recursive: true });
    const native = JSON.parse(
      readFileSync("../references/progress-metrics.json", "utf8"),
    );
    const rows: object[] = [];
    await page.goto("/#progress-ring");
    await expect(
      page.getByRole("heading", { name: "ProgressRing", exact: true }),
    ).toBeVisible();
    for (const item of [
      ...native.matrix.map((item: Record<string, unknown>) => ({
        ...item,
        image: "Progress",
      })),
      ...native.animations.map((item: Record<string, unknown>) => ({
        ...item,
        value: 0,
        image: "ProgressBarAnimation",
      })),
    ]) {
      if (
        item.kind === "ProgressRing" &&
        item.mode === "Indeterminate" &&
        item.value === 1
      )
        continue; // End of nonlooping native capture; loop wraps to zero instead.
      await page.evaluate(
        async ({ item, backend }) => {
          const a = (await import(
            "/src/index.ts" as string
          )) as typeof import("../src/index");
          window.progressFixture?.sdk.dispose();
          document.querySelector("#progress-fixture")?.remove();
          const f = {
            time: 0,
            events: [],
          } as unknown as Window["progressFixture"];
          window.progressFixture = f;
          const host = document.createElement("div");
          host.id = "progress-fixture";
          host.style.cssText =
            "position:fixed;left:0;top:0;width:1000px;height:500px;z-index:999999";
          document.body.append(host);
          f.sdk = await a.WinUI.create({
            globalScrollbars: false,
            clock: () => f.time,
          });
          f.scene = f.sdk.scene(host, {
            backend: a.RendererBackend[backend],
            theme: a.ThemeMode[item.theme as keyof typeof a.ThemeMode],
            reducedMotion: false,
          });
          const common = {
            width: item.kind === "ProgressBar" ? 130 : 60,
            margin: [item.bounds.x, item.bounds.y, 0, 0] as [
              number,
              number,
              number,
              number,
            ],
            horizontalAlignment: a.HorizontalAlignment.Left,
            verticalAlignment: a.VerticalAlignment.Top,
            accessibleName: "native fixture",
          };
          f.control =
            item.kind === "ProgressBar"
              ? f.scene.root.progressBar({
                  ...common,
                  value: item.value,
                  isIndeterminate: item.time !== undefined,
                  showPaused: item.state === "Paused",
                  showError: item.state === "Error",
                })
              : f.scene.root.progressRing({
                  ...common,
                  height: 60,
                  value: item.value * 100,
                  isIndeterminate: item.mode === "Indeterminate",
                });
        },
        { item, backend },
      );
      await expect(
        page.locator("#progress-fixture").getByRole("progressbar"),
        JSON.stringify(item),
      ).toBeVisible();
      await page.evaluate((item) => {
        const f = window.progressFixture;
        f.time =
          item.time ??
          (item.kind === "ProgressRing" && item.mode === "Indeterminate"
            ? item.value * 2000
            : 2200);
        f.scene.configure({});
      }, item);
      await expect
        .poll(() =>
          page.evaluate(() => window.progressFixture.scene.snapshot.time),
        )
        .toBe(
          item.time ??
            (item.kind === "ProgressRing" && item.mode === "Indeterminate"
              ? item.value * 2000
              : 2200),
        );
      const actual = PNG.sync.read(
        await page.locator("#progress-fixture canvas").screenshot(),
      );
      const expected = PNG.sync.read(
        readFileSync(`../out/progress-native/${item.theme}-${item.image}.png`),
      );
      const scale = expected.width / 1000;
      expect(actual.width).toBe(expected.width);
      const bounds = await page.evaluate(
        () => window.progressFixture.control.snapshot.rect,
      );
      expect(Math.abs(bounds.width - item.bounds.width)).toBeLessThan(0.01);
      expect(Math.abs(bounds.height - item.bounds.height)).toBeLessThan(0.01);
      let sum = 0,
        count = 0,
        max = 0;
      for (
        let y = Math.floor(item.bounds.y * scale);
        y < Math.ceil((item.bounds.y + item.bounds.height) * scale);
        y++
      )
        for (
          let x = Math.floor(item.bounds.x * scale);
          x < Math.ceil((item.bounds.x + item.bounds.width) * scale);
          x++
        )
          for (let c = 0; c < 3; c++) {
            const d = Math.abs(
              actual.data[(y * actual.width + x) * 4 + c] -
                expected.data[(y * expected.width + x) * 4 + c],
            );
            sum += d;
            count++;
            max = Math.max(max, d);
          }
      const mean = sum / count;
      rows.push({ ...item, backend, scale, mean, max });
      expect(
        mean,
        JSON.stringify({
          kind: item.kind,
          mode: item.mode,
          value: item.value,
          state: item.state,
          theme: item.theme,
          backend,
        }),
      ).toBeLessThan(6);
    }
    writeFileSync(
      `../references/validation/progress-${backend}.json`,
      JSON.stringify(
        {
          reference:
            "Own matching-SDK frozen visual probe; not Store release/present-time acceptance",
          cases: rows.length,
          rows,
        },
        null,
        2,
      ),
    );
    await page.screenshot({ path: `../out/progress-browser/${backend}.png` });
  });

test("Progress SDK ranges, notifications, animation interruption and lifetime", async ({
  page,
}) => {
  await page.goto("/#progress-bar");
  await expect(
    page.locator("#bar-determinate").getByRole("progressbar"),
  ).toBeVisible();
  const result = await page.evaluate(async () => {
    const a = (await import(
      "/src/index.ts" as string
    )) as typeof import("../src/index");
    const host = document.createElement("div");
    document.body.append(host);
    const sdk = await a.WinUI.create({ globalScrollbars: false });
    const scene = sdk.scene(host);
    const bar = scene.root.progressBar({ width: 130, value: 150 });
    const events: number[] = [];
    const off = bar.onValueChanged((e) => events.push(e.value!));
    bar.update({ maximum: 25 });
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    off();
    bar.update({ value: 12 });
    const clamped = bar.properties;
    let invalid = false;
    try {
      bar.update({ minimum: 30, maximum: 10 });
    } catch {
      invalid = true;
    }
    const ring = scene.root.progressRing({ isIndeterminate: false, value: 0 });
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    ring.update({ value: 100 });
    await new Promise((r) => setTimeout(r, 80));
    const before = ring.snapshot.progress!.trimEnd;
    ring.update({ value: 75 });
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    const after = ring.snapshot.progress!.trimEnd;
    const id = ring.snapshot.id;
    ring.dispose();
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    const removed = !scene.snapshot.nodes.some((n) => n.id === id);
    sdk.dispose();
    return {
      clamped,
      events,
      invalid,
      before,
      after,
      removed,
      surfaces: host.childElementCount,
    };
  });
  expect(result.clamped.value).toBe(12);
  expect(result.clamped.maximum).toBe(25);
  expect(result.events).toEqual([25]);
  expect(result.invalid).toBe(true);
  expect(result.after).toBeGreaterThanOrEqual(result.before);
  expect(result.after - result.before).toBeLessThan(0.12);
  expect(result.removed).toBe(true);
  expect(result.surfaces).toBe(0);
});

test("Progress policies freeze loops without idle frames and resume from inactive", async ({
  page,
}) => {
  await page.goto("/#progress-ring");
  await expect(
    page.locator("#ring-indeterminate").getByRole("progressbar"),
  ).toBeVisible();
  await page.getByLabel("Reduced motion", { exact: true }).check();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.progressScenes["ring-indeterminate"].snapshot.animating,
      ),
    )
    .toBe(false);
  const before = await page.evaluate(
    () => window.progressScenes["ring-indeterminate"].diagnostics.frames,
  );
  await page.waitForTimeout(150);
  const after = await page.evaluate(
    () => window.progressScenes["ring-indeterminate"].diagnostics.frames,
  );
  expect(after - before).toBeLessThanOrEqual(1);
  await page.getByLabel("Reduced motion", { exact: true }).uncheck();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.progressScenes["ring-indeterminate"].snapshot.animating,
      ),
    )
    .toBe(true);
  await selectGalleryOption(page.locator("#theme"),"HighContrast");
  await expect
    .poll(() =>
      page.evaluate(
        () => window.progressScenes["ring-indeterminate"].snapshot.animating,
      ),
    )
    .toBe(false);
  await selectGalleryOption(page.locator("#theme"),"Light");
  await expect
    .poll(() =>
      page.evaluate(
        () => window.progressScenes["ring-indeterminate"].snapshot.animating,
      ),
    )
    .toBe(true);
  const progress = page.locator("#ring-indeterminate").getByRole("progressbar");
  await expect(progress).not.toHaveAttribute("tabindex", "0");
  await expect(progress).toHaveCSS("outline-style", "none");
});
