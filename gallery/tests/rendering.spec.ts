import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import type { Scene } from "../src/index";
declare global {
  interface Window {
    drawing: { canvas: Scene; gpu: Scene };
  }
}
test("Canvas and GPU text/affine clips/layer opacity agree at DPR 1, 1.25, 1.5 and 2", async ({
  browser,
}) => {
  mkdirSync("../out/stages", { recursive: true });
  const results = [];
  for (const dpr of [1, 1.25, 1.5, 2]) {
    const context = await browser.newContext({
      viewport: { width: 1300, height: 800 },
      deviceScaleFactor: dpr,
    });
    const page = await context.newPage();
    await page.goto("/#navigation-view");
    await expect(page.locator("#runtime-status")).toHaveText("Ready");
    await page.evaluate(async () => {
      const path = "/src/index.ts";
      const a = (await import(path)) as typeof import("../src/index");
      window.drawing?.canvas.dispose();
      window.drawing?.gpu.dispose();
      document.querySelector("#drawing-root")?.remove();
      const root = document.createElement("div");
      root.id = "drawing-root";
      root.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:white";
      document.body.append(root);
      const scenes = [];
      for (const [backend, index] of [
        a.RendererBackend.Canvas2D,
        a.RendererBackend.WebGL2,
      ].map((v, i) => [v, i] as const)) {
        const host = document.createElement("div");
        host.id = index ? "gpu-drawing" : "canvas-drawing";
        host.style.cssText = `position:absolute;left:${index * 620}px;top:0;width:600px;height:400px`;
        root.append(host);
        const scene = window.gallery.sdk.scene(host, {
          backend,
          reducedMotion: true,
          root: { background: "#ffffff" },
        });
        const stack = scene.root.stack({
          padding: [16, 16, 16, 16],
          spacing: 10,
        });
        stack.text({
          text: "中文 / English / 👩‍💻 / é",
          fontSize: 24,
          fontWeight: 600,
        });
        stack.text({
          text: "中文字重、字体回退和混合文本换行。This paragraph wraps using Unicode break opportunities.",
          wrap: true,
          width: 320,
        });
        stack.text({
          text: "中文 / some truncated text 👩‍💻 é",
          width: 150,
          trimming: a.TextTrimming.CharacterEllipsis,
          fontFamily: "__MissingFont__, Segoe UI, system-ui, sans-serif",
        });
        stack.button({
          text: "GPU renders Button",
          variant: a.ButtonVariant.Accent,
        });
        const group = scene.root.grid({
          width: 120,
          height: 70,
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
          margin: [20, 260, 0, 0],
          opacity: 0.5,
        });
        group.grid({
          width: 80,
          height: 60,
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
          background: "#0000ff",
        });
        group.grid({
          width: 80,
          height: 60,
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
          margin: [40, 0, 0, 0],
          background: "#0000ff",
        });
        const clip = scene.root.grid({
          width: 90,
          height: 80,
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
          margin: [380, 260, 0, 0],
          clip: true,
          transform: [1, 0.15, 0.1, 1, 0, 0],
        });
        clip.grid({
          background: "#0067c0",
          width: 160,
          height: 120,
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
          margin: [-10, -10, 0, 0],
        });
        const imageButton = scene.root.button({
          width: 64,
          height: 64,
          margin: [500, 260, 0, 0],
          horizontalAlignment: a.HorizontalAlignment.Left,
          verticalAlignment: a.VerticalAlignment.Top,
          accessibleName: "Pie image",
        });
        imageButton.image({ source: "/official/Slices.png" });
        scenes.push(scene);
      }
      window.drawing = { canvas: scenes[0], gpu: scenes[1] };
    });
    await expect
      .poll(() => page.evaluate(() => window.drawing.gpu.snapshot.nodes.length))
      .toBe(13);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.drawing.gpu.snapshot.imageRequests.length +
            window.drawing.canvas.snapshot.imageRequests.length,
        ),
      )
      .toBe(0);
    const canvas = PNG.sync.read(
      await page
        .locator("#canvas-drawing")
        .screenshot({ path: `../out/stages/canvas-dpr-${dpr}.png` }),
    );
    const gpu = PNG.sync.read(
      await page
        .locator("#gpu-drawing")
        .screenshot({ path: `../out/stages/gpu-dpr-${dpr}.png` }),
    );
    expect(canvas.width).toBe(Math.round(600 * dpr));
    expect(gpu.width).toBe(canvas.width);
    let error = 0,
      over8 = 0;
    for (let i = 0; i < canvas.data.length; i += 4) {
      let max = 0;
      for (let c = 0; c < 3; c++) {
        const delta = Math.abs(canvas.data[i + c] - gpu.data[i + c]);
        error += delta;
        max = Math.max(max, delta);
      }
      if (max > 8) over8++;
    }
    const mae = error / (canvas.width * canvas.height * 3);
    expect(mae).toBeLessThan(4);
    const overlap =
      (Math.round(285 * dpr) * canvas.width + Math.round(80 * dpr)) * 4;
    for (const p of [canvas, gpu]) {
      expect(Math.abs(p.data[overlap] - 128)).toBeLessThanOrEqual(2);
      expect(Math.abs(p.data[overlap + 1] - 128)).toBeLessThanOrEqual(2);
      expect(p.data[overlap + 2]).toBe(255);
    }
    const emoji=await page.evaluate(()=>{const ctx=document.createElement('canvas').getContext('2d')!;ctx.font='600 24px Segoe UI, system-ui, sans-serif';return{x:16+ctx.measureText('中文 / English / ').width,y:16,width:30,height:38};});
    for(const image of [canvas,gpu]){let colored=0;for(let y=Math.ceil(emoji.y*dpr);y<Math.floor((emoji.y+emoji.height)*dpr);y++)for(let x=Math.ceil(emoji.x*dpr);x<Math.floor((emoji.x+emoji.width)*dpr);x++){const i=(y*image.width+x)*4;const rgb=[image.data[i],image.data[i+1],image.data[i+2]];if(Math.max(...rgb)-Math.min(...rgb)>30)colored++;}expect(colored).toBeGreaterThan(20);}
    const geometry = await page.evaluate(() => ({
      canvas: window.drawing.canvas.snapshot.nodes.map((n) => ({
        kind: n.kind,
        rect: n.rect,
        text: n.text,
      })),
      gpu: window.drawing.gpu.snapshot.nodes.map((n) => ({
        kind: n.kind,
        rect: n.rect,
        text: n.text,
      })),
    }));
    expect(geometry.gpu).toEqual(geometry.canvas);
    results.push({
      dpr,
      width: canvas.width,
      height: canvas.height,
      meanAbsoluteChannelError: mae,
      pixelsAbove8Percent: (over8 / (canvas.width * canvas.height)) * 100,
      geometryIdentical: true,
      isolatedOpacityVerified: true,
      colorGlyphAndImageVerified:true,
    });
    await context.close();
  }
  writeFileSync(
    "../references/validation/gpu-comparison.json",
    JSON.stringify(
      {
        method:
          "Real Canvas reference and Rust WebGL2 rendering on same browser/font/DPR; compare actual screenshot pixels and Rust geometry",
        results,
      },
      null,
      2,
    ) + "\n",
  );
});
