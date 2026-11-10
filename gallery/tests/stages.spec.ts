import {selectGalleryOption} from './gallery-control-helper';
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import type { Scene, ButtonController as Button, SceneNode, TextOptions } from "winui-wasm";
declare global {
  interface Window {
    fixture: {
      scene: Scene;
      button: Button;
      caption?: SceneNode<TextOptions>;
      clicks: number;
      events: string[];
    };
    gpuScene?: Scene;
    gpuLoss?: WEBGL_lose_context;
  }
}
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => expect(pageErrors.get(page)).toEqual([]));
async function start(page: Page) {
  await page.goto("/#navigation-view");
  await expect(page.locator("#runtime-status")).toHaveText("Ready");
}
async function create(page: Page, backend = "Canvas2D") {
  await page.evaluate(async (backend) => {
    const path = "/@id/winui-wasm";
    const api = (await import(path)) as typeof import("winui-wasm");
    const host = document.createElement("div");
    host.id = "stage-fixture";
    host.style.cssText =
      "position:fixed;left:0;top:0;width:600px;height:400px;z-index:99999";
    document.body.append(host);
    const scene = window.gallery.sdk.scene(host, {
      backend: api.RendererBackend[backend as keyof typeof api.RendererBackend],
      reducedMotion: true,
    });
    const stack = scene.root.stack({ padding: [20, 20, 20, 20], spacing: 12 });
    const caption = stack.text({
      text: "共享场景 / English",
      fontSize: 20,
      fontWeight: 600,
    });
    const button = stack.button({
      text: "Save 中文",
      variant: api.ButtonVariant.Accent,
    });
    window.fixture = { scene, button, caption, clicks: 0, events: [] };
    button.onClick(() => {
      window.fixture.clicks++;
      scene.batch(() => {
        caption.update({ text: `Saved ${window.fixture.clicks}` });
        button.update({ text: "Save again" });
      });
    });
  }, backend);
  await expect
    .poll(() => page.evaluate(() => window.fixture.scene.snapshot.nodes.length))
    .toBe(4);
}
test("shared root batches, reparenting, events and subtree lifetime", async ({
  page,
}) => {
  await start(page);
  await create(page);
  expect(await page.locator("#stage-fixture canvas").count()).toBe(1);
  await page.getByRole("button", { name: "Save 中文", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.fixture.caption?.properties.text))
    .toBe("Saved 1");
  const result = await page.evaluate(() => {
    const { scene, button, caption } = window.fixture;
    let rejected = false;
    try {
      scene.batch(() => {
        button.update({ text: "must rollback" });
        caption!.update({ maxWidth: -1 });
      });
    } catch {
      rejected = true;
    }
    const p = scene.root.grid();
    button.moveTo(p);
    p.dispose();
    const next = scene.root.button({ text: "Next" });
    return {
      rejected,
      caption: caption!.properties.text,
      disposed: button.isDisposed,
      nextDisposed: next.isDisposed,
    };
  });
  expect(result.rejected).toBe(true);
  expect(result.disposed).toBe(true);
  await page.evaluate(() => window.fixture.scene.dispose());
  expect(await page.locator("#stage-fixture canvas").count()).toBe(0);
});
test("Button pointer capture, keyboard release, repeats and disabled switch", async ({
  page,
}) => {
  await start(page);
  await create(page);
  const b = page.locator("#stage-fixture button");
  const box = (await b.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(500, 350);
  await page.mouse.up();
  expect(await page.evaluate(() => window.fixture.clicks)).toBe(0);
  await b.focus();
  await page.keyboard.down("Enter");
  await expect
    .poll(() => page.evaluate(() => window.fixture.button.snapshot.state))
    .toBe("Pressed");
  for (let i = 0; i < 12; i++) await page.keyboard.down("Enter");
  expect(await page.evaluate(() => window.fixture.clicks)).toBe(0);
  await page.keyboard.up("Enter");
  await expect.poll(() => page.evaluate(() => window.fixture.clicks)).toBe(1);
  await page.keyboard.down(" ");
  await page.evaluate(() => window.fixture.button.update({ enabled: false }));
  await page.keyboard.up(" ");
  expect(await page.evaluate(() => window.fixture.clicks)).toBe(1);
  await expect(b).toBeDisabled();
  await page.evaluate(() => window.fixture.button.update({ enabled: true }));
  await b.focus();
  await page.keyboard.down(" ");
  await page.keyboard.press("Escape");
  await page.keyboard.up(" ");
  expect(await page.evaluate(() => window.fixture.clicks)).toBe(1);
  await page.evaluate(() => window.fixture.scene.dispose());
});
test("Rust WebGL2 path draws text, restores a lost context and keeps model identity", async ({
  page,
}) => {
  await start(page);
  await create(page, "WebGL2");
  await expect
    .poll(() => page.evaluate(() => window.fixture.scene.snapshot.backend.lost))
    .toBe(false);
  const info = await page
    .locator("#stage-fixture canvas")
    .evaluate((canvas) => {
      const gl = (canvas as HTMLCanvasElement).getContext("webgl2")!;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        version: gl.getParameter(gl.VERSION),
        renderer: ext
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
      };
    });
  await page.getByRole("button", { name: "Save 中文", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.clicks)).toBe(1);
  await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>("#stage-fixture")!;
    host.style.width = "500px";
    host.style.height = "340px";
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.fixture.scene.snapshot.nodes[0].rect.width),
    )
    .toBe(500);
  await page.locator("#stage-fixture canvas").evaluate((canvas) => {
    window.gpuLoss = (canvas as HTMLCanvasElement)
      .getContext("webgl2")!
      .getExtension("WEBGL_lose_context")!;
    window.gpuLoss.loseContext();
  });
  await expect
    .poll(() => page.evaluate(() => window.fixture.scene.snapshot.backend.lost))
    .toBe(true);
  await page.evaluate(() => window.gpuLoss!.restoreContext());
  await expect
    .poll(() =>
      page.evaluate(() => window.fixture.scene.snapshot.backend.generation),
    )
    .toBe(2);
  expect(
    await page.evaluate(() => window.fixture.caption?.properties.text),
  ).toBe("Saved 1");
  await page.getByRole("button", { name: "Save again", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.fixture.clicks)).toBe(2);
  mkdirSync("../out/stages", { recursive: true });
  writeFileSync(
    "../out/stages/gpu-environment.json",
    JSON.stringify(info, null, 2),
  );
  await page
    .locator("#stage-fixture")
    .screenshot({ path: "../out/stages/gpu-restored.png" });
  await page.evaluate(() => window.fixture.scene.dispose());
});
test("React Button uses the same SDK, image content and StrictMode lifetime", async ({
  page,
}) => {
  await page.goto("/#button");
  await expect(
    page.getByRole("button", { name: "Standard XAML", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Standard XAML", exact: true })
    .click();
  await expect(page.locator("#button-click-output")).toContainText(
    "You clicked: Button1 (1)",
  );
  await page.getByLabel("Disable button", { exact: true }).check();
  await expect(
    page.getByRole("button", { name: "Standard XAML", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Disable button", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Pie", exact: true }).click();
  await expect(page.locator("#button-image .output")).toContainText(
    "You clicked: Button2 (1)",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => window.stages.scenes[1].snapshot.imageRequests.length,
      ),
    )
    .toBe(0);
  await page.screenshot({
    path: "../out/stages/button-gallery.png",
    fullPage: true,
  });
  await page.goto("/#foundation");
  await expect(
    page.getByRole("button", { name: "Update both controls", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Update both controls", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.stages.navigation?.properties.navigation?.header,
      ),
    )
    .toBe("Update 1");
  await selectGalleryOption(page.getByLabel("Renderer", { exact: true }),"WebGL2");
  await expect
    .poll(() =>
      page.evaluate(() => window.stages.scenes[1].snapshot.backend.kind),
    )
    .toBe("WebGL2");
  await expect
    .poll(() =>
      page.evaluate(() => window.stages.scenes[1].snapshot.nodes.length),
    )
    .toBeGreaterThan(5);
  const count = await page.evaluate(() => window.gallery.sdk.liveCount);
  await page
    .getByRole("button", { name: "Unmount scene", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.gallery.sdk.liveCount))
    .toBeLessThan(count);
  await page.getByRole("button", { name: "Mount scene", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.gallery.sdk.liveCount))
    .toBe(count);
});
test("real browser composition preserves draft, commit, name and anchor geometry", async ({
  page,
}) => {
  await page.goto("/#foundation");
  const area = page.getByRole("textbox", {
    name: "中文组合输入验证",
    exact: true,
  });
  await expect(area).toBeVisible();
  await area.focus();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.imeSetComposition", {
    text: "中文",
    selectionStart: 2,
    selectionEnd: 2,
  });
  await expect(area).toHaveValue("中文");
  expect(await page.evaluate(() => window.stages.input?.snapshot.kind)).toBe("TextBox");
  expect(await page.evaluate(() => window.stages.input?.properties.text)).toBe(
    "",
  );
  await cdp.send("Input.insertText", { text: "中文" });
  await expect
    .poll(() => page.evaluate(() => window.stages.input?.properties.text))
    .toBe("中文");
  const anchor = await area.evaluate((input) => {
    const a = input as HTMLTextAreaElement;
    const r = a.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      selectionStart: a.selectionStart,
      focused: document.activeElement === a,
      name: a.getAttribute("aria-label"),
    };
  });
  expect(anchor.focused).toBe(true);
  expect(anchor.selectionStart).toBe(2);
  expect(anchor.width).toBeGreaterThan(100);
  mkdirSync("../out/stages", { recursive: true });
  writeFileSync(
    "../out/stages/ime-host.json",
    JSON.stringify(
      {
        mechanism:
          "Chromium CDP IME composition, real composition DOM events; OS candidate-window appearance not captured",
        anchor,
      },
      null,
      2,
    ),
  );
});

test("unsubscribe and disposal during dispatch cancel pending property batches", async ({
  page,
}) => {
  await start(page);
  await create(page);
  await page.evaluate(() => {
    const { scene, button } = window.fixture;
    const off = button.onClick(() =>
      window.fixture.events.push("unsubscribed"),
    );
    off();
    button.onClick(() => {
      button.update({ text: "queued" });
      button.dispose();
      window.fixture.events.push("destroyed");
    });
    button.onClick(() => window.fixture.events.push("after-destroy"));
    button.invoke();
  });
  await expect
    .poll(() => page.evaluate(() => window.fixture.events.join(",")))
    .toBe("destroyed");
  expect(await page.evaluate(() => window.fixture.button.isDisposed)).toBe(
    true,
  );
  await page.evaluate(() => window.fixture.scene.dispose());
});
