import { expect, test } from "@playwright/test";

test("signup offers two clear account choices and admin sign-in is separate", async ({ page }) => {
  await page.goto("/signup");
  const renter = page.getByRole("radio", { name: /^Renter/ });
  const owner = page.getByRole("radio", { name: /^Property owner/ });
  await expect(renter).not.toBeChecked();
  await expect(owner).not.toBeChecked();
  await renter.check();
  await expect(renter).toBeChecked();
  await owner.check();
  await expect(owner).toBeChecked();
  await expect(renter).not.toBeChecked();
  await expect(page.getByText(/After creating your account, complete/)).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(2);
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Administrator sign in" })).toBeVisible();
  await expect(page.getByText(/An authenticator code is required/)).toBeVisible();
  await page.goto("/preview/rentals");
  await expect(page.getByRole("link", { name: "Administration", exact: true })).toHaveCount(0);
});

test("submitting a form shows shared loading feedback and prevents repeated clicks", async ({
  page,
}) => {
  // Hold the action response in the browser; no signup reaches Supabase.
  let finish: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/signup", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await gate;
    await route.abort();
  });
  await page.goto("/signup");
  await page.getByRole("radio", { name: /^Renter/ }).check();
  await page.getByLabel("Your name").fill("Loading Test");
  await page.getByLabel("Email address").fill("loading@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Pass123!");
  await page.getByRole("checkbox").check();
  try {
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    const button = page.getByRole("button", { name: "Please wait…" });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button.locator(".ui-spinner")).toBeVisible();
  } finally {
    finish?.();
  }
});

test("page navigation animates and honors reduced motion", async ({ page, isMobile }) => {
  await page.goto("/preview/rentals");
  await expect(page.locator(".page-transition")).toHaveCSS("animation-name", "page-enter");
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    const nav = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(nav).toHaveCSS("animation-name", "page-enter");
    await nav.getByRole("link").first().focus();
    await page.keyboard.press("Escape");
    await expect(nav).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  }
  await page.getByRole("link", { name: "Amihan Garden House", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Amihan Garden House");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".page-transition")).toHaveCSS("animation-name", "none");
});
