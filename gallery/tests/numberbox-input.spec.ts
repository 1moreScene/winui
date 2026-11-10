import { test, expect } from "@playwright/test";
import { selectGalleryOption } from "./gallery-control-helper";

for (const backend of ["Canvas2D", "WebGL2"]) {
  test(`${backend} NumberBox preserves typed drafts, commits on blur and responds to mouse spin buttons`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/#number-box");
    await selectGalleryOption(
      page.getByRole("combobox", { name: "Renderer", exact: true }),
      backend,
    );
    await expect
      .poll(() =>
        page.evaluate(
          () => window.composedScenes.NumberBox.snapshot.backend.kind,
        ),
      )
      .toBe(backend);
    const first = page.locator("#composed-number");
    const quantity = page.getByRole("spinbutton", {
      name: "Quantity",
      exact: true,
    });
    await quantity.click();
    await quantity.press("ControlOrMeta+A");
    await quantity.pressSequentially("27", { delay: 80 });
    await expect(quantity).toHaveValue("27");
    const empty = first.getByRole("spinbutton").nth(1);
    await empty.click();
    await expect(quantity).toHaveValue("27");
    await expect(page.getByLabel("composed-number output")).toHaveText(
      "Value: 27",
    );
    await first
      .getByRole("button", { name: "Increase value", exact: true })
      .click();
    await expect(quantity).toHaveValue("28");
    await first
      .getByRole("button", { name: "Decrease value", exact: true })
      .click();
    await expect(quantity).toHaveValue("27");

    await empty.click();
    await empty.pressSequentially("-12.5", { delay: 80 });
    await expect(empty).toHaveValue("-12.5");
    await quantity.click();
    await expect(empty).toHaveValue("-12.5");

    await quantity.press("ControlOrMeta+A");
    await quantity.pressSequentially("2 + 3 * 4", { delay: 80 });
    await expect(quantity).toHaveValue("2 + 3 * 4");
    await quantity.press("Enter");
    await expect(quantity).toHaveValue("14");

    const formatted = page.getByRole("spinbutton", {
      name: "Enter a dollar amount:",
      exact: true,
    });
    await formatted.click();
    await formatted.pressSequentially("2.36", { delay: 80 });
    await expect(formatted).toHaveValue("2.36");
    await formatted.press("Tab");
    await expect(formatted).toHaveValue("2.25");
    await formatted.fill("bad");
    await formatted.press("Tab");
    await expect(formatted).toHaveValue("2.25");
    await empty.fill("");
    await quantity.click();
    await expect(empty).toHaveValue("");
    expect(errors).toEqual([]);
  });
}
