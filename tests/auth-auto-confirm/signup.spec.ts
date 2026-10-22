import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
  throw new Error(
    "Auto-confirm tests require an isolated local Supabase with Confirm email disabled.",
  );

for (const role of ["Renter", "Property owner"]) {
  test(`auto-confirmed ${role} signup opens the correct workspace`, async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("radio", { name: new RegExp(`^${role}`) }).check();
    await page.getByLabel("Your name").fill("Auto Confirm Neighbor");
    await page.getByLabel("Email address").fill(`cabahay-auto-${randomUUID()}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill("Local-Auto-Confirm-42!");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(role === "Renter" ? /\/dashboard$/ : /\/become-an-owner$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
}
