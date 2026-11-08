import { test, expect } from "@playwright/test";
import {openSource} from './gallery-control-helper';

test("Button source panels show only their running sample", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#button");
  await expect(
    page.getByRole("button", { name: "Standard XAML", exact: true }),
  ).toBeVisible();

  const standard = page.locator("#button-standard");
  await standard.getByText("Source code", { exact: true }).click();
  const code = standard.locator("pre[data-sample-source]");
  await expect(code).toContainText('text="Standard XAML button"');
  await expect(code).toContainText("enabled={!disabled}");
  await expect(code).not.toContainText("options=");
  await expect(code).toContainText("onClick");
  expect((await code.innerText()).split("\n").length).toBeLessThan(25);
  await expect(code).not.toContainText(
    /declare global|function Header|InputProbe|RendererBackend|window\.stages/,
  );

  await standard
    .getByRole("button", { name: "Official XAML", exact: true })
    .click();
  await expect(code).toContainText("<Button");
  await expect(code).not.toContainText("onClick=");
  await standard
    .getByRole("button", { name: "TypeScript / React", exact: true })
    .click();
  await expect(code).toContainText("onClick=");

  for (const [name, expected] of [
    ["image", "/official/Slices.png"],
    ["styles", "ButtonVariant.Accent"],
    ["wrapping", "wrap={true}"],
  ]) {
    const sample = page.locator(`#button-${name}`);
    await sample.getByText("Source code", { exact: true }).click();
    await expect(sample.locator("pre[data-sample-source]")).toContainText(
      expected,
    );
    await expect(sample.locator("pre[data-sample-source]")).not.toContainText(
      "declare global",
    );
  }

  const initialization = page.locator("#button-initialization");
  await expect(initialization).toHaveCount(1);
  expect(await initialization.getAttribute("open")).toBeNull();
  await openSource(initialization);
  await expect(initialization.locator("pre")).toContainText(
    "await WinUI.create()",
  );
  await expect(initialization.locator("pre")).toContainText("WinUIProvider");
  expect(errors).toEqual([]);
});
