import {selectGalleryOption,openSource} from './gallery-control-helper';
import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import type { GlobalScrollbars, WinUI } from "../src/index";
declare global {
  interface Window {
    globalLease: GlobalScrollbars;
    secondSdk: WinUI;
    localSdk: WinUI;
    clicks: number;
  }
}
async function start(page: Page) {
  await page.goto("/#text-box");
  await expect(
    page.getByRole("textbox", { name: "simple TextBox", exact: true }),
  ).toBeVisible();
  await page.evaluate(
    () => (window.globalLease = window.gallery.sdk.installGlobalScrollbars()),
  );
}
async function scroller(page: Page) {
  await page.evaluate(() => {
    const e = document.createElement("div");
    e.id = "global-test";
    e.style.cssText =
      "position:fixed;left:400px;top:120px;width:300px;height:200px;overflow:auto;z-index:100;background:#eee";
    e.innerHTML =
      '<div style="width:800px;height:1000px"><button id="business-button">Business</button></div>';
    document.body.append(e);
    window.clicks = 0;
    e.querySelector("button")!.addEventListener("click", () => window.clicks++);
  });
  await expect(page.locator("#global-test")).toHaveAttribute(
    "data-winui-scroll-host",
    "",
  );
}
const bar = (page: Page, id = "global-test", axis = "vertical") =>
  page.locator(
    `[data-winui-global-scrollbars] [role=scrollbar][aria-controls="${id}"][aria-orientation="${axis}"]`,
  );
test("application hook keeps native scrolling, content events and Rust thumb/keyboard behavior", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await scroller(page);
  await page.locator("#business-button").click();
  expect(await page.evaluate(() => window.clicks)).toBe(1);
  await page.locator("#global-test").hover({ position: { x: 100, y: 90 } });
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => page.locator("#global-test").evaluate((e) => e.scrollTop))
    .toBeGreaterThan(250);
  const vertical = bar(page);
  await expect(vertical).toHaveAttribute("aria-valuenow", "300");
  const r = (await vertical.boundingBox())!;
  await page.mouse.move(r.x + 6, r.y + 65);
  await page.waitForTimeout(650);
  await page.mouse.down();
  await page.mouse.move(r.x + 6, r.y + 160, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(() => page.locator("#global-test").evaluate((e) => e.scrollTop))
    .toBeGreaterThan(700);
  await vertical.focus();
  await vertical.press("Home");
  await expect
    .poll(() => page.locator("#global-test").evaluate((e) => e.scrollTop))
    .toBe(0);
  await vertical.press("PageDown");
  await expect
    .poll(() => page.locator("#global-test").evaluate((e) => e.scrollTop))
    .toBeGreaterThan(190);
  await page.evaluate(() =>
    document
      .getElementById("global-test")!
      .scrollTo({ left: 400, top: 500, behavior: "instant" }),
  );
  await expect(bar(page)).toHaveAttribute("aria-valuenow", "500");
  await expect(bar(page, "global-test", "horizontal")).toHaveAttribute(
    "aria-valuenow",
    "400",
  );
  mkdirSync("../out/global-scrollbars", { recursive: true });
  await page.screenshot({ path: "../out/global-scrollbars/interaction.png" });
  expect(errors).toEqual([]);
});
test("dynamic containers, shadow DOM, clipping, RTL and resize synchronize without steady polling", async ({
  page,
}) => {
  await start(page);
  await scroller(page);
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "shadow-host";
    host.style.cssText = "position:fixed;left:800px;top:100px";
    document.body.append(host);
    host.attachShadow({ mode: "open" }).innerHTML =
      '<div id="shadow-scroll" style="width:200px;height:100px;overflow:auto"><div style="height:600px">Shadow</div></div>';
    const e = document.getElementById("global-test")!;
    e.style.direction = "rtl";
  });
  await expect(bar(page, "shadow-scroll")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#shadow-scroll")
        .evaluate((e) => getComputedStyle(e).scrollbarWidth),
    )
    .toBe("none");
  await page.evaluate(
    () => (document.getElementById("global-test")!.scrollLeft = -200),
  );
  await expect(bar(page, "global-test", "horizontal")).toHaveAttribute(
    "aria-valuenow",
    "300",
  );
  await page.evaluate(() => {
    const e = document.getElementById("global-test")!;
    e.style.height = "250px";
    e.firstElementChild!.setAttribute("style", "width:800px;height:1200px");
  });
  await expect(bar(page)).toHaveAttribute("aria-valuemax", "950");
  const originalX = (await bar(page).boundingBox())!.x;
  await page.evaluate(() => {
    const e = document.getElementById("global-test")!;
    e.style.transition = "transform 120ms linear";
    e.style.transform = "translateX(30px)";
  });
  await expect
    .poll(async () => (await bar(page).boundingBox())!.x)
    .toBeCloseTo(originalX + 30, 0);
  await page.waitForTimeout(200);
  const a = await page.evaluate(() => window.globalLease.diagnostics);
  await page.waitForTimeout(300);
  const b = await page.evaluate(() => window.globalLease.diagnostics);
  expect(b.updates - a.updates).toBeLessThanOrEqual(1);
  await page.evaluate(() => document.getElementById("global-test")!.remove());
  await expect(bar(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => window.globalLease.diagnostics.managed),
  ).toBeGreaterThan(0);
});
test("runtime leases share one renderer, subtree disposal restores original DOM chrome and IDs", async ({
  page,
}) => {
  await page.goto("/#text-box");
  await expect(
    page.getByRole("textbox", { name: "simple TextBox", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.gallery.sdk.dispose());
  await expect(page.locator("[data-winui-global-scrollbars]")).toHaveCount(0);
  await page.evaluate(async () => {
    const WinUI=window.gallery.sdk.constructor as typeof import('../src/index').WinUI;
    window.localSdk = await WinUI.create({ globalScrollbars: false });
    const root = document.createElement("section");
    root.id = "subtree";
    root.style.cssText = "position:fixed;left:400px;top:100px;width:350px";
    root.innerHTML =
      '<div style="overflow:auto;height:120px"><div style="height:700px">owned</div></div>';
    document.body.append(root);
    window.globalLease = window.localSdk.installGlobalScrollbars(root);
    window.secondSdk = await WinUI.create();
  });
  await expect(page.locator("[data-winui-global-scrollbars]")).toHaveCount(1);
  const child = page.locator("#subtree>div");
  await expect(child).toHaveAttribute("data-winui-scroll-host", "");
  const generated = await child.getAttribute("id");
  expect(generated).toMatch(/^winui-dom-scroll-/);
  await page.evaluate(() => window.secondSdk.dispose());
  await expect(child).toHaveAttribute("data-winui-scroll-host", "");
  await page.evaluate(() => window.globalLease.dispose());
  await expect(child).not.toHaveAttribute("data-winui-scroll-host", "");
  await expect(child).not.toHaveAttribute("id", /./);
  await expect(page.locator("[data-winui-global-scrollbars]")).toHaveCount(0);
  expect(await child.evaluate((e) => getComputedStyle(e).scrollbarWidth)).toBe(
    "auto",
  );
  await page.evaluate(() => window.localSdk.dispose());
});
test("hidden/opted-out/transformed surfaces keep native chrome, nested scroll and clipping stay bounded", async ({
  page,
}) => {
  await start(page);
  await scroller(page);
  await page.evaluate(() => {
    const e = document.createElement("div");
    e.id = "clip-parent";
    e.style.cssText =
      "position:fixed;left:800px;top:100px;width:250px;height:140px;overflow:hidden";
    e.innerHTML =
      '<div id="clipped-scroll" style="width:200px;height:250px;overflow:auto"><div style="height:1000px"></div></div>';
    document.body.append(e);
    const native = document.createElement("div");
    native.id = "native-scroll";
    native.dataset.winuiScrollbars = "native";
    native.style.cssText = "height:70px;overflow:auto";
    native.innerHTML = '<div style="height:600px"></div>';
    document.body.append(native);
  });
  await expect(bar(page, "clipped-scroll")).toBeVisible();
  const bounds = (await bar(page, "clipped-scroll").boundingBox())!;
  const parent = (await page.locator("#clip-parent").boundingBox())!;
  expect(
    await page.evaluate(
      ({ x, y }) =>
        (document.elementFromPoint(x, y) as HTMLElement)?.dataset.scrollAxis,
      { x: bounds.x + 6, y: parent.y + parent.height + 12 },
    ),
  ).toBeUndefined();
  await expect(page.locator("#native-scroll")).not.toHaveAttribute(
    "data-winui-scroll-host",
    "",
  );
  await page.evaluate(
    () =>
      (document.getElementById("global-test")!.style.transform =
        "rotate(4deg)"),
  );
  await expect(page.locator("#global-test")).not.toHaveAttribute(
    "data-winui-scroll-host",
    "",
  );
  expect(
    await page.evaluate(() => window.globalLease.diagnostics.skipped),
  ).toBeGreaterThan(0);
});
test("document/source/sidebars are automatic, policy changes and repeated unmount stay clean", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await openSource(page.locator('#textbox-readonly .source'));
  await expect
    .poll(() => page.locator("pre[data-winui-scroll-host]").count())
    .toBeGreaterThan(0);
  for (const theme of ["Dark", "HighContrast", "Light"]) {
    await selectGalleryOption(page.locator("#theme"),theme);
    await page.waitForTimeout(50);
  }
  for (let i = 0; i < 3; i++) {
    await scroller(page);
    await page.evaluate(() => document.getElementById("global-test")!.remove());
    await expect(bar(page)).toHaveCount(0);
  }
  const diagnostics = await page.evaluate(() => window.globalLease.diagnostics);
  writeFileSync(
    "../references/validation/global-scrollbars.json",
    JSON.stringify(
      {
        diagnostics,
        errors,
        renderer: "shared Rust ScrollViewer, Canvas2D",
        nativeDomScrolling: true,
        acceptedNativeMaterialParity: false,
      },
      null,
      2,
    ) + "\n",
  );
  expect(errors).toEqual([]);
});

test("native touch scrolling remains native and touching a Rust bar drags its thumb", async ({
  browser,
}) => {
  const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  await start(page);
  await scroller(page);
  await page.evaluate(() => {
    const e = document.getElementById("global-test")!;
    e.dataset.scrollFinished = "false";
    e.addEventListener("scrollend", () => (e.dataset.scrollFinished = "true"), {
      once: true,
    });
  });
  const cdp = await context.newCDPSession(page);
  const point = (x: number, y: number) => ({ id: 1, x, y });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(500, 280)],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [point(500, 170)],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.locator("#global-test").evaluate((e) => e.scrollTop))
    .toBeGreaterThan(40);
  await expect(page.locator("#global-test")).toHaveAttribute(
    "data-scroll-finished",
    "true",
  );
  await page.evaluate(
    () => (document.getElementById("global-test")!.scrollTop = 0),
  );
  await expect(bar(page)).toHaveAttribute("aria-valuenow", "0");
  const r = (await bar(page).boundingBox())!;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(r.x + 6, r.y + 20)],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [point(r.x + 6, r.y + 160)],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.locator("#global-test").evaluate((e) => e.scrollTop))
    .toBeGreaterThan(600);
  await context.close();
});
