import {selectGalleryOption} from './gallery-control-helper';
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import type { WinUI, Scene, RepeatButtonController as RepeatButton, ViewboxController as Viewbox } from "winui-wasm";
declare global {
  interface Window {
    basicFixture: {
      sdk: WinUI;
      scene: Scene;
      repeat?: RepeatButton;
      box?: Viewbox;
      time: number;
      clicks: number;
    };
  }
}

test("RepeatButton Gallery uses native defaults, hold/release, Space, Enter and disable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#repeat-button");
  const button = page.getByRole("button", {
    name: "Click and hold",
    exact: true,
  });
  await expect(button).toBeVisible();
  const count = () =>
    page.evaluate(() => {
      const text =
        window.basicNextScenes["repeat-simple"].snapshot.nodes.find(
          (n) => n.kind === "TextBlock",
        )?.props.text ?? "";
      return Number(text.match(/\d+/)?.[0] ?? 0);
    });
  // A final repeat can be emitted before release while its React label update
  // is still waiting for a commit and scene frame. Observe that frame before
  // checking that no further repeats occur after release.
  const committedFrame = () => page.evaluate(() => new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await button.hover();
  await page.mouse.down();
  await expect.poll(count).toBe(1);
  await expect.poll(count).toBeGreaterThan(2);
  await page.mouse.up();
  await committedFrame();
  const stopped = await count();
  await page.waitForTimeout(100);
  expect(await count()).toBe(stopped);
  await button.focus();
  await page.keyboard.down(" ");
  await expect.poll(count).toBeGreaterThan(stopped + 1);
  await page.keyboard.up(" ");
  await committedFrame();
  const afterSpace = await count();
  await page.waitForTimeout(80);
  expect(await count()).toBe(afterSpace);
  await page.keyboard.down("Enter");
  await page.waitForTimeout(650);
  await page.keyboard.up("Enter");
  expect(await count()).toBe(afterSpace + 1);
  // This is an ARIA projection of a Rust control. Its checked state commits
  // on the next scene frame, rather than via an HTML input's default action.
  const disable=page.getByRole("checkbox", { name: "Disable RepeatButton" });
  await disable.click();
  await expect(disable).toBeChecked();
  await expect(button).toBeDisabled();
  await page.locator("#repeat-simple [aria-label=\"Source code\"][aria-expanded]").click();
  await expect(page.locator("#repeat-simple pre")).toContainText(
    "<RepeatButton",
  );
  await expect(page.locator("#repeat-simple pre")).not.toContainText(
    "options={{",
  );
  expect(errors).toEqual([]);
});

test("RepeatButton SDK clock, live interval, atomic failure, cancel and disposal", async ({
  page,
}) => {
  await page.goto("/#repeat-button");
  await expect(
    page.getByRole("button", { name: "Click and hold", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const a = (await import(
      "/@id/winui-wasm" as string
    )) as typeof import("winui-wasm");
    const f = { time: 0, clicks: 0 } as Window["basicFixture"];
    window.basicFixture = f;
    f.sdk = await a.WinUI.create({
      globalScrollbars: false,
      clock: () => f.time,
    });
    const host = document.createElement("div");
    host.id = "basic-fixture";
    host.style.cssText =
      "position:fixed;inset:0;width:300px;height:100px;z-index:999999";
    document.body.append(host);
    f.scene = f.sdk.scene(host, { reducedMotion: true });
    f.repeat = f.scene.root.repeatButton({
      text: "Clock repeat",
      delay: 100,
      interval: 40,
    });
    f.repeat.onClick(() => f.clicks++);
  });
  const b = page.getByRole("button", { name: "Clock repeat" });
  await b.focus();
  await page.keyboard.down(" ");
  await expect
    .poll(() => page.evaluate(() => window.basicFixture.clicks))
    .toBe(1);
  await page.evaluate(() => {
    const f = window.basicFixture;
    f.time = 100;
    f.scene.configure({});
  });
  await expect
    .poll(() => page.evaluate(() => window.basicFixture.clicks))
    .toBe(2);
  const invalid = await page.evaluate(() => {
    const f = window.basicFixture;
    f.repeat!.update({ interval: 25 });
    try {
      f.repeat!.update({ interval: 0 });
      return false;
    } catch {
      return f.repeat!.properties.interval === 25;
    }
  });
  expect(invalid).toBe(true);
  await page.evaluate(() => {
    const f = window.basicFixture;
    f.time = 140;
    f.scene.configure({});
  });
  await expect
    .poll(() => page.evaluate(() => window.basicFixture.clicks))
    .toBe(3);
  await expect
    .poll(() =>
      page.evaluate(() => window.basicFixture.scene.snapshot.nextFrameAt),
    )
    .toBe(165);
  await page.keyboard.up(" ");
  await expect
    .poll(() =>
      page.evaluate(() => window.basicFixture.scene.snapshot.nextFrameAt),
    )
    .toBe(null);
  await page.evaluate(() => {
    const f = window.basicFixture;
    f.repeat!.invoke();
  });
  await expect
    .poll(() => page.evaluate(() => window.basicFixture.clicks))
    .toBe(4);
  await page.evaluate(() => window.basicFixture.sdk.dispose());
  await expect(page.locator("#basic-fixture .winui-surface")).toHaveCount(0);
});

test("Viewbox Gallery exposes all Stretch and StretchDirection choices through Rust", async ({
  page,
}) => {
  await page.goto("/#viewbox");
  await expect(
    page.getByRole("heading", { name: "Viewbox", exact: true }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const snapshot = window.basicNextScenes["viewbox-content"].snapshot;
    return snapshot.imageSources.includes("/official/Slices.png") && snapshot.imageRequests.length === 0;
  })).toBe(true);
  await expect(page.locator("#viewbox-content").getByRole("radio")).toHaveText([
    "None",
    "Fill",
    "Uniform",
    "UniformToFill",
    "UpOnly",
    "DownOnly",
    "Both",
  ]);
  const nativeContent = JSON.parse(
    readFileSync("../references/basic-next-metrics.json", "utf8"),
  ).galleryContent;
  const content = await page.evaluate(
    () =>
      window.basicNextScenes["viewbox-content"].snapshot.nodes.find(
        (n) => n.kind === "Viewbox",
      )!.viewbox!,
  );
  expect(content.contentSize).toEqual([
    nativeContent.content.width,
    nativeContent.content.height,
  ]);
  expect(content.scale[0]).toBeCloseTo(
    nativeContent.bounds.width / nativeContent.content.width,
    5,
  );
  expect(content.scale[1]).toBeCloseTo(
    nativeContent.bounds.height / nativeContent.content.height,
    5,
  );
  await page.getByRole("radio", { name: "UniformToFill", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.basicNextScenes["viewbox-content"].snapshot.nodes.find(
            (n) => n.kind === "Viewbox",
          )?.props.stretch,
      ),
    )
    .toBe("UniformToFill");
  await page.getByRole("radio", { name: "DownOnly", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.basicNextScenes["viewbox-content"].snapshot.nodes.find(
            (n) => n.kind === "Viewbox",
          )?.props.stretchDirection,
      ),
    )
    .toBe("DownOnly");
  const size = page.getByRole("slider", { name: "Width/Height" });
  await size.focus();
  await page.keyboard.press("Home");
  await expect(size).toHaveValue("20");
  await page.keyboard.press("End");
  await expect(size).toHaveValue("300");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.basicNextScenes["viewbox-content"].snapshot.nodes.find(
            (n) => n.kind === "Viewbox",
          )?.props.width,
      ),
    )
    .toBe(300);
  await page.locator("#viewbox-content [aria-label=\"Source code\"][aria-expanded]").click();
  await expect(page.locator("#viewbox-content pre")).toContainText("<Viewbox");
  await selectGalleryOption(page.locator("#theme"),"Dark");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.basicNextScenes["viewbox-content"].snapshot.nodes.find(
            (n) => n.kind === "Viewbox",
          )?.theme,
      ),
    )
    .toBe("Dark");
});

for (const backend of ["Canvas2D", "WebGL2"] as const)
  test(`${backend} RepeatButton and Viewbox match native state, scale and clipping matrices`, async ({
    browser,
  }) => {
    test.setTimeout(180000);
    const rows: object[] = [];
    mkdirSync("../out/basic-next-browser", { recursive: true });
    for (const suffix of ["", "-125"]) {
      const native = JSON.parse(
        readFileSync(`../references/basic-next-metrics${suffix}.json`, "utf8"),
      );
      const dpr = native.environment.dpi;
      const context = await browser.newContext({
        deviceScaleFactor: dpr,
        viewport: { width: 1440, height: 1000 },
        baseURL: test.info().project.use.baseURL,
      });
      const page = await context.newPage();
      await page.goto("/#repeat-button");
      await expect(
        page.getByRole("button", { name: "Click and hold", exact: true }),
      ).toBeVisible();
      for (const item of [
        ...(suffix === "" ? native.repeat : []).map((n: object) => ({
          ...n,
          kind: "RepeatButton",
          image: "RepeatButton",
        })),
        ...native.boxes.map((n: Record<string, unknown>) => ({
          ...n,
          kind: "Viewbox",
          image: `Viewbox-${n.size}`,
        })),
      ]) {
        await page.evaluate(
          async ({ item, backend }) => {
            const a = (await import(
              "/@id/winui-wasm" as string
            )) as typeof import("winui-wasm");
            window.basicFixture?.sdk.dispose();
            document.querySelector("#basic-fixture")?.remove();
            const host = document.createElement("div");
            host.id = "basic-fixture";
            host.style.cssText =
              "position:fixed;inset:0;width:1000px;height:500px;z-index:999999";
            document.body.append(host);
            const f = { time: 0, clicks: 0 } as Window["basicFixture"];
            window.basicFixture = f;
            f.sdk = await a.WinUI.create({
              globalScrollbars: false,
              clock: () => f.time,
            });
            f.scene = f.sdk.scene(host, {
              theme: a.ThemeMode[item.theme as keyof typeof a.ThemeMode],
              backend: a.RendererBackend[backend],
              reducedMotion: true,
            });
            if (item.kind === "RepeatButton")
              f.repeat = f.scene.root.repeatButton({
                text: "Click and hold",
                enabled: item.state !== "Disabled",
                margin: [item.bounds.x, item.bounds.y, 0, 0],
                horizontalAlignment: a.HorizontalAlignment.Left,
                verticalAlignment: a.VerticalAlignment.Top,
              });
            else {
              const slot = item.slot;
              const panel = f.scene.root.grid({
                width: slot.width,
                height: slot.height,
                translationX: slot.x,
                translationY: slot.y,
                horizontalAlignment: a.HorizontalAlignment.Left,
                verticalAlignment: a.VerticalAlignment.Top,
              });
              f.box = panel.viewbox({
                width: item.explicitWidth ?? undefined,
                height: item.explicitHeight ?? undefined,
                stretch: a.Stretch[item.stretch as keyof typeof a.Stretch],
                stretchDirection:
                  a.StretchDirection[
                    item.direction as keyof typeof a.StretchDirection
                  ],
              });
              const child = f.box.grid({
                width: 100,
                height: 50,
                background: "#a9a9a9",
              });
              for (const [i, color] of [
                "#0000ff",
                "#008000",
                "#ff0000",
                "#ffff00",
              ].entries())
                child.grid({
                  width: 25,
                  height: 10,
                  margin: [i * 25, 0, 0, 0],
                  background: color,
                  horizontalAlignment: a.HorizontalAlignment.Left,
                  verticalAlignment: a.VerticalAlignment.Top,
                });
            }
          },
          { item, backend },
        );
        await expect
          .poll(() =>
            page.evaluate(
              () => window.basicFixture.scene.snapshot.nodes.length,
            ),
          )
          .toBeGreaterThan(1);
        if (item.kind === "RepeatButton") {
          await page.mouse.move(990, 490);
          if (item.state === "PointerOver" || item.state === "Pressed")
            await page
              .getByRole("button", { name: "Click and hold", exact: true })
              .last()
              .hover();
          if (item.state === "Pressed") await page.mouse.down();
          const rect = await page.evaluate(
            () => window.basicFixture.repeat!.snapshot.rect,
          );
          expect(Math.abs(rect.width - item.bounds.width)).toBeLessThan(0.02);
          expect(Math.abs(rect.height - item.bounds.height)).toBeLessThan(0.02);
        } else {
          const snap = await page.evaluate(
            () => window.basicFixture.box!.snapshot,
          );
          expect(Math.abs(snap.rect.width - item.bounds.width)).toBeLessThan(
            0.01,
          );
          expect(Math.abs(snap.rect.height - item.bounds.height)).toBeLessThan(
            0.01,
          );
          expect(snap.viewbox!.scale[0]).toBeCloseTo(item.scale[0], 5);
          expect(snap.viewbox!.scale[1]).toBeCloseTo(item.scale[1], 5);
        }
        const actual = PNG.sync.read(
            await page.locator("#basic-fixture canvas").screenshot(),
          ),
          expected = PNG.sync.read(
            readFileSync(
              `../out/basic-next-native${suffix}/${item.theme}-${item.image}.png`,
            ),
          );
        expect(actual.width).toBe(expected.width);
        const region = item.slot ?? item.bounds;
        let sum = 0,
          count = 0,
          glyphSum = 0,
          glyphCount = 0,
          chromeSum = 0,
          chromeCount = 0;
        for (
          let y = Math.floor(region.y * dpr);
          y < Math.ceil((region.y + region.height) * dpr);
          y++
        )
          for (
            let x = Math.floor(region.x * dpr);
            x < Math.ceil((region.x + region.width) * dpr);
            x++
          )
            for (let c = 0; c < 3; c++) {
              const delta = Math.abs(
                actual.data[(y * actual.width + x) * 4 + c] -
                  expected.data[(y * expected.width + x) * 4 + c],
              );
              sum += delta;
              count++;
              const t = item.textBounds;
              const glyph =
                t &&
                x + 0.5 >= t.x * dpr - 1 &&
                x + 0.5 < (t.x + t.width) * dpr + 1 &&
                y + 0.5 >= t.y * dpr - 1 &&
                y + 0.5 < (t.y + t.height) * dpr + 1;
              if (glyph) {
                glyphSum += delta;
                glyphCount++;
              } else {
                chromeSum += delta;
                chromeCount++;
              }
            }
        const mean = sum / count,
          glyphMean = glyphCount ? glyphSum / glyphCount : null,
          chromeMean = chromeCount ? chromeSum / chromeCount : 0;
        rows.push({ ...item, backend, dpr, mean, glyphMean, chromeMean });
        // Short labels occupy most of this control. Keep the source chrome budget
        // independent from the existing DirectWrite/browser glyph coverage difference.
        if (item.kind === "RepeatButton") {
          expect(chromeMean, JSON.stringify(item)).toBeLessThan(2);
          expect(glyphMean!, JSON.stringify(item)).toBeLessThan(16);
        } else expect(mean, JSON.stringify(item)).toBeLessThan(3);

        if (item.state === "Pressed") await page.mouse.up();
      }
      await context.close();
    }
    writeFileSync(
      `../references/validation/basic-next-${backend}.json`,
      JSON.stringify(
        {
          reference:
            "Own fixed-SDK forced states and 100%/125% Viewbox matrices; not Store release present-time acceptance",
          acceptedPixelParity: false,
          cases: rows.length,
          rows,
        },
        null,
        2,
      ),
    );
  });

test("Viewbox child-space DOM, pointer/keyboard clipping, single-child validation and fractional DPR", async ({
  browser,
}) => {
  for (const dpr of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({
      deviceScaleFactor: dpr,
      viewport: { width: 1000, height: 700 },
    });
    const page = await context.newPage();
    await page.goto("/#viewbox");
    await expect(
      page.getByRole("heading", { name: "Viewbox", exact: true }),
    ).toBeVisible();
    await page.evaluate(async () => {
      const a = (await import(
        "/@id/winui-wasm" as string
      )) as typeof import("winui-wasm");
      const host = document.createElement("div");
      host.id = "basic-fixture";
      host.style.cssText =
        "position:fixed;inset:0;width:300px;height:180px;z-index:999999";
      document.body.append(host);
      const f = { time: 0, clicks: 0 } as Window["basicFixture"];
      window.basicFixture = f;
      f.sdk = await a.WinUI.create({ globalScrollbars: false });
      f.scene = f.sdk.scene(host, { reducedMotion: true });
      f.box = f.scene.root.viewbox({
        width: 60,
        height: 40,
        stretch: a.Stretch.None,
        horizontalAlignment: a.HorizontalAlignment.Left,
        verticalAlignment: a.VerticalAlignment.Top,
      });
      const panel = f.box.grid({ width: 100, height: 50 });
      f.repeat = panel.repeatButton({
        text: "Nested hold",
        width: 100,
        height: 50,
        delay: 100,
        interval: 40,
      });
      f.repeat.onClick(() => f.clicks++);
    });
    await expect(
      page.getByRole("button", { name: "Nested hold" }),
    ).toBeVisible();
    await page.mouse.click(80, 20);
    expect(await page.evaluate(() => window.basicFixture.clicks)).toBe(0);
    await page.mouse.click(20, 20);
    await expect
      .poll(() => page.evaluate(() => window.basicFixture.clicks))
      .toBe(1);
    await page.evaluate(async () => {
      const a = (await import(
        "/@id/winui-wasm" as string
      )) as typeof import("winui-wasm");
      window.basicFixture.box!.update({ stretch: a.Stretch.Fill });
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.basicFixture.repeat!.snapshot.world[0]),
      )
      .toBeCloseTo(0.6, 5);
    const button = page.getByRole("button", { name: "Nested hold" });
    const bounds = (await button.boundingBox())!;
    const projected = await page.evaluate(() => {
      const n = window.basicFixture.repeat!.snapshot;
      return [n.rect.width * n.world[0], n.rect.height * n.world[3]];
    });
    expect(Math.abs(bounds.width - projected[0])).toBeLessThan(0.02);
    expect(Math.abs(bounds.height - projected[1])).toBeLessThan(0.02);
    await button.focus();
    await page.keyboard.down(" ");
    await expect
      .poll(() => page.evaluate(() => window.basicFixture.clicks))
      .toBeGreaterThan(2);
    await page.keyboard.up(" ");
    const valid = await page.evaluate(() => {
      const f = window.basicFixture;
      const count = f.scene.snapshot.nodes.length;
      try {
        f.box!.grid({});
        return false;
      } catch {
        return f.scene.snapshot.nodes.length === count;
      }
    });
    expect(valid).toBe(true);
    await page.evaluate(() => window.basicFixture.sdk.dispose());
    await expect(page.locator("#basic-fixture .winui-surface")).toHaveCount(0);
    await context.close();
  }
});
