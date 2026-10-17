import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing search carries the chosen area and type to results", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your space.");
  await expect(
    page.locator(".preview-banner").getByRole("link", { name: "About PuyoHub", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Where do you want to live?").selectOption("Caasinan");
  await page.getByLabel("Your kind of space").selectOption("private-room");
  await page.getByRole("button", { name: "Find my space" }).click();
  await expect(page).toHaveURL(/area=Caasinan.*type=private-room/);
  await expect(page).toHaveURL(/\/properties\?/);
  await expect(page.getByLabel("Barangay", { exact: true })).toHaveValue("Caasinan");
});

test("combined filters and browser history preserve the search", async ({ page }) => {
  await page.goto("/preview/rentals");
  await page.getByLabel("Barangay", { exact: true }).selectOption("Caasinan");
  await page.getByLabel("Type of space").selectOption("private-room");
  await page.getByLabel("Maximum", { exact: true }).fill("3500");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByTestId("property-card")).toHaveCount(1);
  await expect(page.getByTestId("property-card")).toContainText("Luntian Corner Rooms");
  await page.getByRole("link", { name: "Luntian Corner Rooms", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Luntian Corner Rooms");
  await page.goBack();
  await expect(page.getByLabel("Maximum", { exact: true })).toHaveValue("3500");
  await expect(page.getByTestId("property-card")).toHaveCount(1);
});

test("keyword search and price sorting change actual result cards", async ({ page }) => {
  await page.goto("/preview/rentals?q=garden");
  await expect(page.getByTestId("property-card")).toHaveCount(1);
  await expect(page.getByTestId("property-card")).toContainText("Amihan Garden House");
  await page.goto("/preview/rentals?sort=price-asc");
  await expect(page.getByTestId("property-card").first()).toContainText("Balay Sidlak Bedspaces");
  await expect(page.getByTestId("property-card").last()).toContainText("The Acacia Apartments");
});

test("empty results have a working recovery action", async ({ page }) => {
  await page.goto("/preview/rentals?max=1000");
  await expect(page.getByTestId("property-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A little more room in your search?" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "See all sample rentals" }).click();
  await expect(page.getByTestId("property-card")).toHaveCount(6);
});

test("invalid budgets are explained without pretending there are valid results", async ({
  page,
}) => {
  await page.goto("/preview/rentals?min=7000&max=2000");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "minimum monthly budget must be less than or equal",
  );
  await expect(page.getByTestId("property-card")).toHaveCount(0);
  await page.goto("/preview/rentals?max=not-a-number");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("whole pesos");
});

test("request explanation is keyboard accessible and never submits a booking", async ({ page }) => {
  await page.goto("/preview/rentals/amihan-garden-house");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Amihan Garden House");
  await expect(
    page.getByText("Original concept illustrations · not property photos"),
  ).toBeVisible();
  const trigger = page.getByRole("button", { name: "How will requests work?" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("You haven’t sent a request");
  await expect(dialog).toContainText("A pending request won’t hold a unit");
  await expect(dialog.getByRole("button", { name: "Close request preview" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("unknown property is a real 404 with a recovery link", async ({ page }) => {
  const response = await page.goto("/preview/rentals/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This space isn’t here." })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Explore rentals", exact: true }).click();
  await expect(page).toHaveURL(/\/properties$/);
});

test("preview is excluded from indexing and explains its limits", async ({ page, request }) => {
  await page.goto("/preview");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText(/A separate demo contains fictional properties/)).toBeVisible();
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /preview");
});

test("page has no horizontal overflow or broken local artwork", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/preview/rentals", "/preview/rentals/amihan-garden-house"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const images = page.locator("img");
      for (const image of await images.all()) {
        if (!(await image.isVisible())) continue;
        await image.scrollIntoViewIfNeeded();
        await expect(image).toHaveJSProperty("complete", true);
        expect(
          await image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
        ).toBeGreaterThan(0);
      }
    }
  }
});

test("navigation and the skip link work at the selected viewport", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Close navigation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Find a home" })
      .click();
    await expect(page).toHaveURL(/\/properties$/);
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).not.toBeVisible();
  } else {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Find a home" })
      .click();
    await expect(page).toHaveURL(/\/properties$/);
  }
});

test("core pages and the request dialog pass automated accessibility checks", async ({ page }) => {
  // Measure the settled page rather than a partially transparent entry frame.
  // Motion itself is covered separately by interaction.spec.ts.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/",
    "/preview/rentals",
    "/preview/rentals/amihan-garden-house",
    "/preview",
  ]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.goto("/preview/rentals/amihan-garden-house");
  await page.getByRole("button", { name: "How will requests work?" }).click();
  const dialogResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dialogResults.violations).toEqual([]);
});
