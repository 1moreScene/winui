import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import type { Scene, Button } from "../src/index";
declare global {
  interface Window {
    buttonMatrix: { scene: Scene; button: Button };
  }
}
test("Button native matrix: 3 palettes × 3 variants × 4 real input states", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 750 });
  await page.goto("/#navigation-view");
  await expect(page.locator("#runtime-status")).toHaveText("Ready");
  mkdirSync("../out/button-browser", { recursive: true });
  const records = [];
  const native = JSON.parse(
    readFileSync("../out/button-native/button-metrics.json", "utf8"),
  ) as {
    theme: string;
    variant: string;
    state: string;
    bounds: { x: number; y: number; width: number; height: number };
  }[];
  for (const theme of ["Light", "Dark", "HighContrast"])
    for (const [variant, col] of ["Standard", "Accent", "Subtle"].map(
      (v, i) => [v, i] as const,
    ))
      for (const [state, row] of [
        "Normal",
        "PointerOver",
        "Pressed",
        "Disabled",
      ].map((v, i) => [v, i] as const)) {
        await page.mouse.up();
        await page.mouse.move(1100, 650);
        await page.evaluate(
          async ({ theme, variant, col, row, state }) => {
            const path = "/src/index.ts";
            const api = (await import(path)) as typeof import("../src/index");
            window.buttonMatrix?.scene.dispose();
            document.querySelector("#button-matrix")?.remove();
            const host = document.createElement("div");
            host.id = "button-matrix";
            host.style.cssText =
              "position:fixed;left:0;top:0;width:1000px;height:500px;z-index:99999";
            document.body.append(host);
            const scene = window.gallery.sdk.scene(host, {
              theme: api.ThemeMode[theme as keyof typeof api.ThemeMode],
              reducedMotion: true,
            });
            const button = scene.root.button({
              width: 220,
              height: 36,
              horizontalAlignment: api.HorizontalAlignment.Left,
              verticalAlignment: api.VerticalAlignment.Top,
              margin: [24 + col * 320, 24 + row * 100, 0, 0],
              text:
                variant === "Standard"
                  ? "Standard XAML button"
                  : `${variant} style button`,
              variant:
                api.ButtonVariant[variant as keyof typeof api.ButtonVariant],
              enabled: state !== "Disabled",
            });
            window.buttonMatrix = { scene, button };
          },
          { theme, variant, col, row, state },
        );
        await expect
          .poll(() =>
            page.evaluate(
              () => window.buttonMatrix.scene.snapshot.nodes.length,
            ),
          )
          .toBe(2);
        if (state === "PointerOver" || state === "Pressed")
          await page.mouse.move(24 + col * 320 + 50, 24 + row * 100 + 15);
        if (state === "Pressed") await page.mouse.down();
        await expect
          .poll(() =>
            page.evaluate(() => window.buttonMatrix.button.snapshot.state),
          )
          .toBe(state);
        const name = `${theme}-${variant}-${state}`;
        const bytes = await page
          .locator("#button-matrix")
          .screenshot({ path: `../out/button-browser/${name}.png` });
        const p = PNG.sync.read(bytes),
          expected = PNG.sync.read(
            readFileSync(`../out/button-native/${theme}-buttons.png`),
          );
        const ref = native.find(
          (n) =>
            n.theme === theme && n.variant === variant && n.state === state,
        )!;
        const snapshot = await page.evaluate(
          () => window.buttonMatrix.button.snapshot,
        );
        const world = snapshot.world;
        expect(
          Math.max(
            Math.abs(world[4] - ref.bounds.x),
            Math.abs(world[5] - ref.bounds.y),
            Math.abs(snapshot.rect.width - ref.bounds.width),
            Math.abs(snapshot.rect.height - ref.bounds.height),
          ),
        ).toBe(0);
        let sum = 0,
          changed = 0,
          count = 0;
        const diff = new PNG({ width: 228, height: 44 });
        for (let y = 0; y < 44; y++)
          for (let x = 0; x < 228; x++) {
            const src =
                ((ref.bounds.y - 4 + y) * p.width + ref.bounds.x - 4 + x) * 4,
              dst = (y * 228 + x) * 4;
            let max = 0;
            for (let c = 0; c < 3; c++) {
              const d = Math.abs(p.data[src + c] - expected.data[src + c]);
              sum += d;
              max = Math.max(max, d);
              diff.data[dst + c] = Math.min(255, d * 5);
            }
            diff.data[dst + 3] = 255;
            if (max > 8) changed++;
            count++;
          }
        writeFileSync(
          `../out/button-browser/${name}-difference.png`,
          PNG.sync.write(diff),
        );
        records.push({
          name,
          geometryErrorDip: 0,
          meanAbsoluteChannelError: sum / (count * 3),
          pixelsAbove8Percent: (changed / count) * 100,
        });
      }
  await page.mouse.up();
  await page.evaluate(() => window.buttonMatrix.scene.dispose());
  writeFileSync(
    "../references/validation/button-comparison.json",
    JSON.stringify(
      {
        conditions: {
          width: 1000,
          height: 500,
          dpr: 1,
          font: "Segoe UI",
          sdk: "2.3.10-experimental",
          highContrast:
            "Same deterministic resource fixture; not OS forced-colors",
          nativeStates: "VSM fixtures",
          browserStates: "Real pointer down/move and enabled properties",
        },
        acceptedPixelParity: false,
        comparisons: records,
      },
      null,
      2,
    ) + "\n",
  );
});
