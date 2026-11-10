import {selectGalleryOption} from './gallery-control-helper';
import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import type { WinUI, Scene, SceneNode } from "winui-wasm";
declare global {
  interface Window {
    fiveFixture: { sdk: WinUI; scene: Scene; control: SceneNode; time: number };
  }
}
test("five Gallery pages use public controls, real input, options and sample-only source", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [route, name] of [
    ["border", "Border"],
    ["canvas", "Canvas"],
    ["hyperlink-button", "HyperlinkButton"],
    ["expander", "Expander"],
    ["info-badge", "InfoBadge"],
  ]) {
    await page.goto("/#" + route);
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.values(window.fiveScenes ?? {}).some((s) => {
            try {
              return s.snapshot.nodes.some((n) => n.kind !== "Grid");
            } catch {
              return false;
            }
          }),
        ),
      )
      .toBe(true);
    if (name === "Border") {
      const radius=page.getByRole("slider", { name: "Corner radius" });
      await radius.press('Home');await radius.press('PageUp');await radius.press('PageUp');
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.fiveScenes["border-text"].snapshot.nodes.find(
                (n) => n.kind === "Border",
              )?.props.cornerRadius,
          ),
        )
        .toBe(20);
    }
    if (name === "Canvas")
      await page
        .getByRole("button", { name: "Reverse stacking order" })
        .click();
    if (name === "HyperlinkButton") {
      const b = page.getByRole("link", { name: "Click me", exact: true });
      await b.click();
      await expect(page.locator("output")).toContainText("1");
      await b.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("output")).toContainText("2");
      await page.getByRole("checkbox", { name: "Disable hyperlink" }).check();
      await expect(b).toBeDisabled();
    }
    if (name === "Expander") {
      const b = page.getByRole("button", {
        name: "This text is in the header",
        exact: true,
      });
      await expect(b).toHaveAttribute("aria-expanded", "false");
      await b.click();
      await expect(b).toHaveAttribute("aria-expanded", "true");
      await page.waitForTimeout(550);
      await b.focus();
      await page.keyboard.press(" ");
      await expect(b).toHaveAttribute("aria-expanded", "false");
      await page.waitForTimeout(550);
      await selectGalleryOption(page
        .getByRole("combobox", { name: "ExpandDirection" }),"Up");
      await b.click();
      await expect(b).toHaveAttribute("aria-expanded", "true");
    }
    if (name === "InfoBadge") {
      await selectGalleryOption(page
        .getByRole("combobox", { name: "Badge style" }),"Critical");
      await page.getByRole("button", { name: /Notifications/ }).click();
      await expect(
        page.getByRole("img", { name: "1", exact: true }),
      ).toBeVisible();
    }
    const section = page.locator("section.example:visible").first();
    await selectGalleryOption(page.locator('#theme:visible'),'HighContrast');
    const sampleId=await section.getAttribute('id');
    await expect.poll(()=>page.evaluate(id=>window.fiveScenes[id!].snapshot.nodes.find(n=>n.kind!=='Grid')?.theme,sampleId)).toBe('HighContrast');
    await section.locator("[aria-label=\"Source code\"][aria-expanded]").click();
    await expect(section.locator("pre")).toContainText("<" + name);
    await expect(section.locator("pre")).not.toContainText("options={{");
  }
  expect(errors).toEqual([]);
});

test("nested five-control content keeps editor coordinates, focus restoration and lifetime at fractional DPR", async ({
  browser,
}) => {
  for (const dpr of [1.25, 1.5, 2]) {
    const context = await browser.newContext({
      deviceScaleFactor: dpr,
      viewport: { width: 1200, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("/#border");
    await expect(
      page.getByRole("heading", { name: "Border", exact: true }),
    ).toBeVisible();
    await page.evaluate(async () => {
      const a = (await import(
        "/@id/winui-wasm" as string
      )) as typeof import("winui-wasm");
      const sdk = await a.WinUI.create({ globalScrollbars: false });
      const host = document.createElement("div");
      host.id = "five-fixture";
      host.style.cssText =
        "position:fixed;inset:0;width:360px;height:300px;z-index:999999";
      document.body.append(host);
      const scene = sdk.scene(host, { reducedMotion: true });
      const border = scene.root.border({
        width: 320,
        height: 260,
        borderThickness: [2, 4, 6, 8],
        padding: [8, 8, 8, 8],
        cornerRadius: 12,
        borderBrush: "#0067c0",
        horizontalAlignment: a.HorizontalAlignment.Left,
        verticalAlignment: a.VerticalAlignment.Top,
      });
      const canvas = border.canvas();
      canvas.hyperlinkButton({
        text: "Fixture link",
        canvasLeft: 1.25,
        canvasTop: 5.25,
      });
      const exp = canvas.expander({
        header: "Details",
        width: 240,
        isExpanded: true,
        canvasLeft: 1.25,
        canvasTop: 55.25,
      });
      exp.textBox({ text: "Edit me", accessibleName: "Nested editor" });
      window.fiveFixture = { sdk, scene, control: exp, time: 0 };
      let rejected = false;
      try {
        border.grid();
      } catch {
        rejected = true;
      }
      if (!rejected) throw new Error("Second Border child accepted");
    });
    const input = page.getByRole("textbox", { name: "Nested editor" });
    await expect(input).toBeVisible();
    await input.fill("Edited");
    await expect(input).toHaveValue("Edited");
    await page.evaluate(() =>
      window.fiveFixture.control.update({ isExpanded: false } as object),
    );
    await expect(
      page.getByRole("button", { name: "Details", exact: true }),
    ).toBeFocused();
    await expect(input).toBeHidden();
    await page.evaluate(() => window.fiveFixture.sdk.dispose());
    await expect(page.locator("#five-fixture .winui-surface")).toHaveCount(0);
    await context.close();
  }
});

test("HyperlinkButton invokes once before opening the requested URI", async ({
  page,
  context,
}) => {
  await context.route("https://www.microsoft.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>Navigation fixture</title>",
    }),
  );
  await page.goto("/#hyperlink-button");
  const link = page.getByRole("link", {
    name: "Microsoft home page",
    exact: true,
  });
  await expect(link).toBeVisible();
  const popup = context.waitForEvent("page");
  await link.click();
  const opened = await popup;
  await opened.waitForLoadState();
  expect(opened.url()).toMatch(/^https:\/\/www\.microsoft\.com\/?$/);
  await opened.close();
});

for (const backend of ["Canvas2D", "WebGL2"] as const)
  test(`${backend} five controls match fixed native state and layout regions`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.goto("/#border");
    await expect(
      page.getByRole("heading", { name: "Border", exact: true }),
    ).toBeVisible();
    const native = JSON.parse(
      readFileSync("../references/five-controls-metrics.json", "utf8"),
    );
    const rows: object[] = [];
    for (const item of native.matrix) {
      await page.evaluate(
        async ({ item, backend }) => {
          window.fiveFixture?.sdk.dispose();
          document.getElementById("five-fixture")?.remove();
          const a = (await import(
            "/@id/winui-wasm" as string
          )) as typeof import("winui-wasm");
          const sdk = await a.WinUI.create({
            globalScrollbars: false,
            clock: () => window.fiveFixture?.time ?? 0,
          });
          const host = document.createElement("div");
          host.id = "five-fixture";
          host.style.cssText =
            "position:fixed;inset:0;width:1000px;height:500px;z-index:99999";
          document.body.append(host);
          const scene = sdk.scene(host, {
            theme: item.theme,
            backend: a.RendererBackend[backend],
            reducedMotion: true,
          });
          const p = {
            ...item.props,
            horizontalAlignment: a.HorizontalAlignment.Left,
            verticalAlignment: a.VerticalAlignment.Top,
            translationX: item.bounds.x,
            translationY: item.bounds.y,
          };
          delete p.state;
          let control: SceneNode;
          if (item.kind === "Border") {
            const b = scene.root.border(p);
            b.grid({ background: "#add8e6" });
            control = b;
          } else if (item.kind === "Canvas") {
            const c = scene.root.canvas(p);
            for (const left of [10, 50, 90])
              c.border({
                width: 50,
                height: 35,
                canvasLeft: left,
                canvasTop: 10,
                background: `#00${(50 + left).toString(16)}c0`,
              });
            control = c;
          } else if (item.kind === "HyperlinkButton") {
            control = scene.root.hyperlinkButton({
              ...p,
              enabled: item.props.state !== "Disabled",
            });
          } else if (item.kind === "Expander") {
            const e = scene.root.expander(p);
            e.grid({ width: 100, height: 30, background: "#add8e6" });
            control = e;
          } else control = scene.root.infoBadge(p);
          window.fiveFixture = { sdk, scene, control, time: 0 };
        },
        { item, backend },
      );
      await expect(page.locator("#five-fixture canvas").first()).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => window.fiveFixture.scene.snapshot.nodes.length),
        )
        .toBeGreaterThan(1);
      const r = item.bounds;
      if (
        ["HyperlinkButton", "Expander"].includes(item.kind) &&
        ["PointerOver", "Pressed"].includes(item.props.state)
      ) {
        await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
        if (item.props.state === "Pressed") await page.mouse.down();
      } else await page.mouse.move(990, 490);
      await page.evaluate(() => window.fiveFixture.scene.configure({}));
      await page.waitForTimeout(20);
      const node = await page.evaluate(
        () => window.fiveFixture.control.snapshot,
      );
      expect(node.rect.width, JSON.stringify(item)).toBeCloseTo(r.width, 1);
      expect(node.rect.height, JSON.stringify(item)).toBeCloseTo(r.height, 1);
      const actual = PNG.sync.read(
        await page.locator("#five-fixture").screenshot(),
      );
      const expected = PNG.sync.read(
        readFileSync(
          `../out/five-controls-native/${item.theme}-${item.kind}.png`,
        ),
      );
      let error = 0,
        n = 0;
      for (let y = Math.floor(r.y); y < Math.ceil(r.y + r.height); y++)
        for (let x = Math.floor(r.x); x < Math.ceil(r.x + r.width); x++)
          for (let c = 0; c < 3; c++) {
            error += Math.abs(
              actual.data[(y * actual.width + x) * 4 + c] -
                expected.data[(y * expected.width + x) * 4 + c],
            );
            n++;
          }
      const mean = error / n;
      mkdirSync("../out/five-controls-browser", { recursive: true });
      writeFileSync(
        `../out/five-controls-browser/${backend}-${item.theme}-${item.kind}-${item.index}.png`,
        PNG.sync.write(actual),
      );
      rows.push({ ...item, mean });
      expect(mean, JSON.stringify(item)).toBeLessThan(
        item.kind === "InfoBadge" ? 16 : 7,
      );
      await page.mouse.up();
    }
    mkdirSync("../references/validation", { recursive: true });
    writeFileSync(
      `../references/validation/five-controls-${backend}.json`,
      JSON.stringify(
        {
          cases: rows.length,
          reference: native.reference,
          acceptedPixelParity: false,
          rows,
        },
        null,
        2,
      ) + "\n",
    );
  });

test("ProgressBar cap coverage stays curved at default and larger heights across fractional DPR", async ({
  browser,
}) => {
  const rows: object[] = [];
  for (const dpr of [1, 1.25, 1.5, 2])
    for (const backend of ["Canvas2D", "WebGL2"]) {
      const context = await browser.newContext({
        deviceScaleFactor: dpr,
        viewport: { width: 1000, height: 600 },
      });
      const page = await context.newPage();
      await page.goto("/#progress-bar");
      await expect(
        page.getByRole("heading", { name: "ProgressBar", exact: true }),
      ).toBeVisible();
      await page.evaluate(async (backend) => {
        const a = (await import(
          "/@id/winui-wasm" as string
        )) as typeof import("winui-wasm");
        const sdk = await a.WinUI.create({
          globalScrollbars: false,
          clock: () => window.fiveFixture?.time ?? 0,
        });
        const host = document.createElement("div");
        host.id = "cap-fixture";
        host.style.cssText =
          "position:fixed;inset:0;width:300px;height:100px;z-index:999999";
        document.body.append(host);
        const s = sdk.scene(host, {
          backend: backend as import("winui-wasm").RendererBackend,
          reducedMotion: false,
        });
        s.root.progressBar({
          width: 130,
          value: 100,
          translationX: 20,
          translationY: 20,
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
        });
        s.root.progressBar({
          width: 130,
          value: 100,
          minHeight: 12,
          cornerRadius: 6,
          translationX: 20,
          translationY: 50,
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
        });
        window.fiveFixture = { sdk, scene: s, control: s.root, time: 0 };
        s.root.progressBar({
          width: 130,
          isIndeterminate: true,
          translationX: 20,
          translationY: 80,
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
        });
      }, backend);
      await expect
        .poll(() =>
          page.evaluate(() => window.fiveFixture.scene.snapshot.nodes.length),
        )
        .toBe(4);
      await page.evaluate(() => {
        window.fiveFixture.time = 375;
        window.fiveFixture.scene.configure({});
      });
      await expect
        .poll(() => page.evaluate(() => window.fiveFixture.scene.snapshot.time))
        .toBe(375);
      const png = PNG.sync.read(
        await page.locator("#cap-fixture").screenshot(),
      );
      const nodes = await page.evaluate(() =>
        window.fiveFixture.scene.snapshot.nodes.filter(
          (n) => n.kind === "ProgressBar",
        ),
      );
      for (const node of nodes) {
        const ease = (x: number) => {
          let lo = 0,
            hi = 1;
          for (let i = 0; i < 50; i++) {
            const t = (lo + hi) / 2;
            const s = 1 - t;
            const value = 3 * s * s * t * 0.4 + 3 * s * t * t * 0.6 + t * t * t;
            if (value < x) lo = t;
            else hi = t;
          }
          const t = (lo + hi) / 2;
          return 3 * (1 - t) * t * t + t * t * t;
        };
        const visibleFraction = node.props.isIndeterminate
          ? Math.min(1, -0.4 + 1.6 * ease(375 / 1500) + 0.4)
          : 1;
        const x0 = 20 * dpr,
          y0 = node.world[5] * dpr,
          w = node.rect.width * dpr * visibleFraction,
          h = node.rect.height * dpr,
          r =
            Math.min(node.props.cornerRadius ?? 0, node.rect.height / 2) * dpr;
        let error = 0,
          count = 0;
        for (const end of [0, 1])
          for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++)
            for (
              let x = Math.floor(x0 + (end ? w - r - 1 : 0));
              x < Math.ceil(x0 + (end ? w : r + 1));
              x++
            ) {
              let coverage = 0;
              const samples = 32;
              for (let sy = 0; sy < samples; sy++)
                for (let sx = 0; sx < samples; sx++) {
                  const px = x + (sx + 0.5) / samples - x0,
                    py = y + (sy + 0.5) / samples - y0;
                  const cx = Math.max(r, Math.min(w - r, px)),
                    cy = Math.max(r, Math.min(h - r, py));
                  if (
                    px >= 0 &&
                    px <= w &&
                    py >= 0 &&
                    py <= h &&
                    (px - cx) ** 2 + (py - cy) ** 2 <= r * r
                  )
                    coverage++;
                }
              coverage /= samples * samples;
              const at = (y * png.width + x) * 4;
              for (let c = 0; c < 3; c++) {
                const foreground = [0, 103, 192][c];
                error += Math.abs(
                  png.data[at + c] -
                    (243 * (1 - coverage) + foreground * coverage),
                );
                count++;
              }
            }
        const mean = error / count;
        rows.push({
          backend,
          dpr,
          height: node.rect.height,
          indeterminate: node.props.isIndeterminate,
          mean,
        });
        expect(mean, JSON.stringify(rows.at(-1))).toBeLessThan(8);
      }
      await context.close();
    }
  writeFileSync(
    "../references/validation/progress-cap-coverage.json",
    JSON.stringify(
      {
        reference:
          "Independent area integration of circular caps, 32x32 samples per physical pixel",
        rows,
      },
      null,
      2,
    ) + "\n",
  );
});
