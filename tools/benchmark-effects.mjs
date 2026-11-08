import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "../gallery/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = spawn(
  process.execPath,
  [
    root + "gallery/node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4175",
    "--strictPort",
  ],
  {
    cwd: root + "gallery",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw Error(logs);
    try {
      if ((await fetch("http://127.0.0.1:4175")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw Error("Owned production preview did not start");
  browser = await chromium.launch({
    channel: process.env.PW_CHANNEL ?? "chrome",
  });
  const runs = [];
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4175/#effects-lab");
    await page
      .getByRole("button", { name: "Play / reverse", exact: true })
      .waitFor();
    const record = await page.evaluate(async () => {
      const ui = window.gallery.sdk;
      const before = ui.liveCount;
      const host = document.createElement("div");
      host.style.cssText =
        "position:fixed;inset:0;width:600px;height:400px;z-index:99999";
      document.body.append(host);
      // Take the exact runtime RendererBackend value already used by the Gallery.
      const scene = ui.scene(host, {
        backend: document.querySelector(".winui-scene").dataset.backend,
        root: { background: "#31578b" },
      });
      const bg = scene.root.grid();
      for (const [i, color] of [
        "#df7467",
        "#edbd59",
        "#46a6a2",
        "#6684cf",
      ].entries())
        bg.grid({
          width: 180,
          height: 500,
          background: color,
          translationX: (i - 1.5) * 200,
        });
      const panel = scene.root.grid({
        width: 320,
        height: 240,
        acrylic: {
          tintColor: "#ffffff",
          tintOpacity: 0.2,
          luminosityOpacity: 0.65,
          fallbackColor: "#f3f3f3",
        },
      });
      panel
        .stack({ padding: [24, 24, 24, 24], spacing: 16 })
        .text({ text: "Acrylic / 中文", fontSize: 22 });
      panel.button({ text: "Animate" });
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      await frame();
      await frame();
      const gl = host.querySelector("canvas").getContext("webgl2");
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
      const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
      const queries = [];
      let active = null;
      const originalClear = gl.clear,
        originalError = gl.getError;
      // Instrument only this context's complete Rust paint submission. The first
      // clear begins a query; the final getError ends it, without an idle RAF gap.
      if (ext) {
        gl.clear = function (mask) {
          if (!active) {
            active = this.createQuery();
            this.beginQuery(ext.TIME_ELAPSED_EXT, active);
          }
          return originalClear.call(this, mask);
        };
        gl.getError = function () {
          if (active) {
            this.endQuery(ext.TIME_ELAPSED_EXT);
            queries.push(active);
            active = null;
          }
          return originalError.call(this);
        };
      }
      const intervals = [];
      let previous = performance.now();
      let direction = true;
      const cachedBefore = scene.diagnostics.cachedSurfaces;
      for (let i = 0; i < 120; i++) {
        if (i % 24 === 0) {
          bg.animate({ translationX: direction ? -120 : 0 }, { duration: 600 });
          panel.animate(
            { translationX: direction ? 80 : 0, opacity: direction ? 0.7 : 1 },
            { duration: 600 },
          );
          direction = !direction;
        }
        await frame();
        const now = performance.now();
        intervals.push(now - previous);
        previous = now;
      }
      gl.clear = originalClear;
      gl.getError = originalError;
      const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      let polls = 0;
      const fenceStart = performance.now();
      while (
        gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED &&
        polls++ < 60
      )
        await frame();
      const fenceUpperBoundMs = performance.now() - fenceStart;
      gl.deleteSync(fence);
      const disjoint = ext
        ? Boolean(gl.getParameter(ext.GPU_DISJOINT_EXT))
        : null;
      const gpuMs = [];
      let unavailable = 0;
      for (const query of queries) {
        if (!disjoint && gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE))
          gpuMs.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
        else unavailable++;
        gl.deleteQuery(query);
      }
      const quantile = (values, q) =>
        [...values].sort((a, b) => a - b)[
          Math.min(values.length - 1, Math.floor(values.length * q))
        ] ?? null;
      const diagnostics = scene.diagnostics;
      const result = {
        renderer,
        diagnostics,
        cachedBefore,
        cachedAfter: diagnostics.cachedSurfaces,
        intervalP50Ms: quantile(intervals, 0.5),
        intervalP95Ms: quantile(intervals, 0.95),
        gpuTimerAvailable: Boolean(ext),
        gpuDisjoint: disjoint,
        gpuSamples: gpuMs.length,
        unavailableQueries: unavailable,
        gpuPaintP50Ms: quantile(gpuMs, 0.5),
        gpuPaintP95Ms: quantile(gpuMs, 0.95),
        fenceUpperBoundMs,
      };
      scene.dispose();
      host.remove();
      result.liveCountBefore = before;
      result.liveCountAfter = ui.liveCount;
      return result;
    });
    if (errors.length) throw Error(errors.join("\n"));
    if (record.liveCountBefore !== record.liveCountAfter)
      throw Error("Scene resources did not release");
    runs.push(record);
    await context.close();
  }
  const report = {
    capturedAt: new Date().toISOString(),
    mode: "production preview, 600x400 DIP, DPR 1, 120 RAFs, three fresh contexts",
    runs,
    boundary:
      "Synchronous frame statistics include WASM, GPU submission and DOM projection. EXT_disjoint_timer_query_webgl2 brackets this context from the first framebuffer clear to final error check, with query overhead; unavailable/disjoint samples are excluded. RAF intervals include browser scheduling. Fence polling is only an upper bound on queue completion. Cache counts are retained framebuffer surfaces, not VRAM bytes or total process memory.",
  };
  writeFileSync(
    new URL(
      "../references/validation/effects-performance.json",
      import.meta.url,
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
