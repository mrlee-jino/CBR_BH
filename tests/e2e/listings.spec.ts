import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { currentTotp } from "../helpers/totp.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== "http://127.0.0.1:54321")
  throw new Error("Listing browser tests require isolated local Supabase.");
const service = createClient(url, process.env.TEST_SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function signIn(page: Page, email: string, password: string, next = "/owner") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
test("owner creates a property and room, admin reviews it, and renters see only the published offer", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  const token = randomUUID();
  const password = `Puyo-listing-${token}!`;
  const email = `owner-${token}@example.test`;
  const adminEmail = `reviewer-${token}@example.test`;
  const owner = await service.auth.admin.createUser({ email, password, email_confirm: true });
  expect(owner.error).toBeNull();
  const admin = await service.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
  });
  expect(admin.error).toBeNull();
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query(
      "insert into public.account_roles(user_id,role) values($1,'owner'),($2,'admin')",
      [owner.data.user!.id, admin.data.user!.id],
    );
  } finally {
    await db.end();
  }
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  try {
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/owner$/);
    await page.getByRole("link", { name: "Add a property", exact: true }).click();
    await page.getByLabel("Property name", { exact: true }).fill(`Test Garden ${token}`);
    await page.getByLabel("Web address name").fill(`garden-${token}`);
    await page.getByLabel("Barangay", { exact: true }).fill("Caasinan");
    await page
      .getByLabel("Description", { exact: true })
      .fill(
        "A quiet monthly rental with clear house rules and comfortable rooms for local students.",
      );
    await page.getByLabel("Street address", { exact: true }).fill("Private address 123");
    await page.getByLabel("Contact name", { exact: true }).fill("Private Owner");
    await page.getByLabel("Contact phone", { exact: true }).fill("09123456789");
    await page.getByLabel("Web address name").fill("Invalid Web Address");
    await page.getByRole("button", { name: "Create property", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Complete all fields");
    await expect(page.getByLabel("Property name", { exact: true })).toHaveValue(
      `Test Garden ${token}`,
    );
    await expect(page.getByLabel("Street address", { exact: true })).toHaveValue(
      "Private address 123",
    );
    await page.getByLabel("Web address name").fill(`garden-${token}`);
    await page.getByRole("button", { name: "Create property", exact: true }).click();
    await expect(page).toHaveURL(/\/owner\/properties\/[a-f0-9-]+$/);
    const manageUrl = page.url();
    const id = manageUrl.split("/").pop()!;
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "at least one active room",
    );
    await page.getByText("Add a room or bedspace", { exact: true }).click();
    await page.getByLabel("Room or bed label", { exact: true }).fill("Room A · Bed 1");
    await page.getByLabel("Monthly rent (PHP)", { exact: true }).fill("2500.50");
    await page.getByLabel("Deposit (PHP)", { exact: true }).fill("2500");
    await page
      .getByLabel("Rental terms and utilities", { exact: true })
      .fill("Water included; electricity billed separately.");
    await page.getByRole("button", { name: "Add room or bedspace", exact: true }).click();
    await expect(page.getByText(/Room A · Bed 1 · ₱2,500/)).toBeVisible();
    await publicPage.goto(`/properties/garden-${token}`);
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
      "This space isn’t here.",
    );
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(page.getByText(/Status: pending review/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Save property", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await signIn(page, adminEmail, password, "/admin");
    await expect(page).toHaveURL(/\/dashboard\/security$/);
    await page.getByRole("button", { name: "Set up an authenticator" }).click();
    await page.getByText("Enter the setup key manually").click();
    const secret = await page.locator(".mfa-setup code").innerText();
    await page.getByLabel("Authenticator code").fill(currentTotp(secret));
    await page.getByRole("button", { name: "Verify authenticator", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "verification is complete" }),
    ).toBeVisible();
    await page.goto(`/admin/properties/${id}`);
    await expect(page.getByText("Private address 123", { exact: true })).toBeVisible();
    await page
      .getByLabel("Review notes")
      .fill("Verified contact and property details for publication.");
    await page.getByRole("button", { name: "Save review", exact: true }).click();
    await expect(page.getByText("published", { exact: true }).first()).toBeVisible();
    await publicPage.goto(`/properties?q=${token}&type=bedspace&max=3000`);
    await expect(publicPage.getByTestId("listing-card")).toHaveCount(1);
    await publicPage.getByRole("link", { name: `Test Garden ${token}`, exact: true }).click();
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(`Test Garden ${token}`);
    await expect(publicPage.getByText("Room A · Bed 1", { exact: true })).toBeVisible();
    await expect(publicPage.getByText("₱2,500.50", { exact: true })).toHaveCount(2);
    await expect(publicPage.getByText("Private address 123", { exact: true })).toHaveCount(0);
    await expect(publicPage.getByText("09123456789", { exact: true })).toHaveCount(0);
    expect(
      (
        await new AxeBuilder({ page: publicPage })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await publicPage.screenshot({
      path: testInfo.outputPath("published-property.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/owner$/);
    await page.goto(manageUrl);
    await expect(
      page.getByText("Verified contact and property details for publication.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Property name", { exact: true }).fill(`Updated Garden ${token}`);
    await page.getByRole("button", { name: "Save property", exact: true }).click();
    await expect(page.getByText(/Status: paused/)).toBeVisible();
    await publicPage.goto(`/properties/garden-${token}`);
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
      "This space isn’t here.",
    );
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(report.violations).toEqual([]);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 320)
        await page.screenshot({ path: testInfo.outputPath("owner-mobile.png"), fullPage: true });
    }
  } finally {
    await visitor.close();
  }
});
