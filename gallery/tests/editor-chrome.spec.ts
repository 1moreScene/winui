import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import type { TextBoxController as TextBox, PasswordBoxController as PasswordBox, Scene } from "winui-wasm";
declare global {
  interface Window {
    chromeFixture: { scene: Scene; control: TextBox | PasswordBox };
  }
}
test("editor helper hit region, inner hover/pressed mask and glyph match native parts at two heights", async ({
  page,
}) => {
  test.setTimeout(120000);
  const native = JSON.parse(
    readFileSync("../references/text-helper-metrics.json", "utf8"),
  );
  const rows: object[] = [];
  mkdirSync("../out/editor-chrome", { recursive: true });
  await page.goto("/#navigation-view");
  await expect(page.locator("#runtime-status")).toHaveText(/Ready/);
  for (const item of native.matrix) {
    await page.evaluate(async (item) => {
      const a = (await import(
        "/@id/winui-wasm" as string
      )) as typeof import("winui-wasm");
      const host = document.createElement("div");
      host.id = "editor-chrome";
      host.style.cssText =
        "position:fixed;inset:0;width:1000px;height:500px;z-index:999999";
      document.body.append(host);
      const scene = window.gallery.sdk.scene(host, {
        theme: a.ThemeMode[item.theme as keyof typeof a.ThemeMode],
        reducedMotion: true,
      });
      const props = {
        width: 250,
        height: item.height,
        accessibleName: "fixture",
        horizontalAlignment: a.HorizontalAlignment.Left,
        verticalAlignment: a.VerticalAlignment.Top,
      };
      const control =
        item.kind === "TextBox"
          ? scene.root.textBox(props)
          : scene.root.passwordBox(props);
      window.chromeFixture = { scene, control };
    }, item);
    const input = page.getByRole("textbox", { name: "fixture", exact: true });
    await input.fill(item.kind === "TextBox" ? "Sample text" : "password");
    await expect(input).toHaveValue(
      item.kind === "TextBox" ? "Sample text" : "password",
    );
    const helper = page.getByRole("button", {
      name: item.kind === "TextBox" ? "Clear text" : "Reveal password",
      exact: true,
    });
    await expect(helper).toBeVisible();
    const h = (await helper.boundingBox())!;
    expect(h.width).toBe(item.button.width);
    expect(h.height).toBe(item.button.height);
    expect(h.x).toBe(item.button.x - item.bounds.x);
    expect(h.y).toBe(0);
    await page.mouse.move(900, 450);
    if (item.state !== "Normal") await helper.hover();
    if (item.state === "Pressed") await page.mouse.down();
    const group = page
      .locator("#editor-chrome [data-scene-node]")
      .filter({ has: input })
      .last();
    const png = PNG.sync.read(await group.screenshot());
    const expected = PNG.sync.read(
      readFileSync(`../out/text-scroll-native/${item.theme}-EditorHelpers.png`),
    );
    let sum = 0,
      n = 0;
    const start = item.button.x - item.bounds.x;
    for (let y = 0; y < item.height; y++)
      for (let x = start; x < 250; x++)
        for (let c = 0; c < 3; c++) {
          sum += Math.abs(
            png.data[(y * png.width + x) * 4 + c] -
              expected.data[
                ((item.bounds.y + y) * expected.width + item.bounds.x + x) * 4 +
                  c
              ],
          );
          n++;
        }
    const mean = sum / n;
    rows.push({
      kind: item.kind,
      theme: item.theme,
      state: item.state,
      height: item.height,
      mean,
    });
    expect(mean).toBeLessThan(5);
    if (item.state === "Pressed") {
      await page.mouse.move(900, 450);
      await page.mouse.up();
    }
    await page.evaluate(() => {
      window.chromeFixture.scene.dispose();
      document.getElementById("editor-chrome")!.remove();
    });
  }
  writeFileSync(
    "../references/validation/editor-helper-comparison.json",
    JSON.stringify(
      {
        rows,
        reference: native.reference,
        acceptedReleaseParity: false,
        acceptedPixelParity: false,
      },
      null,
      2,
    ) + "\n",
  );
});
test("multiline Light TextBox retains pixel-rounded accent band as it grows at fractional DPR", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const results: object[] = [];
  for (const dpr of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({
        deviceScaleFactor: dpr,
        viewport: { width: 1440, height: 1000 },
      }),
      page = await context.newPage();
    await page.goto("/#text-box");
    const input = page.getByRole("textbox", {
      name: "multi-line TextBox",
      exact: true,
    });
    await expect(input).toBeVisible();
    for (const lines of [1, 2, 3, 5, 10, 25]) {
      await input.fill(Array(lines).fill("sample text").join("\n"));
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.textScrollScenes["textbox-multiline"].snapshot.nodes.find(
                (n) => n.kind === "TextBox",
              )!.editor!.caret.height,
          ),
        )
        .toBeGreaterThan(0);
      await page.waitForTimeout(60);
      const png = PNG.sync.read(
        await page.locator("#textbox-multiline .winui-scene").screenshot(),
      );
      let coverage = 0;
      const x = Math.floor(png.width / 2);
      for (
        let y = Math.max(0, png.height - Math.ceil(8 * dpr));
        y < png.height;
        y++
      ) {
        const i = (y * png.width + x) * 4;
        const r = png.data[i],
          g = png.data[i + 1],
          b = png.data[i + 2];
        if (b - r > 30 && g - r > 15) coverage += (255 - r) / 255;
      }
      coverage /= dpr;
      results.push({ dpr, lines, coverageDip: coverage });
      expect(coverage).toBeGreaterThan(1.75);
      expect(coverage).toBeLessThan(2.55);
      if (lines === 3)
        await page
          .locator("#textbox-multiline")
          .screenshot({ path: `../out/editor-chrome/multiline-DPR${dpr}.png` });
    }
    await context.close();
  }
  writeFileSync(
    "../references/validation/multiline-accent.json",
    JSON.stringify(
      {
        results,
        rule: "round(2 * DPR) physical pixels, clipped to original rounded body; composited coverage includes browser subpixel phase",
      },
      null,
      2,
    ) + "\n",
  );
});
