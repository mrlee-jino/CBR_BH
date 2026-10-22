import { confirmAction } from "../helpers/confirm-action";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import sharp from "sharp";
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
function dateIn(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
    await confirmAction(page, "Submit for review");
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
    await page
      .getByLabel("Room or bedspace", { exact: true })
      .selectOption({ label: "Room A · Bed 1" });
    await page.getByLabel("Availability record", { exact: true }).selectOption("manual_occupancy");
    const occupancyStart = dateIn(30);
    const occupancyEnd = dateIn(35);
    await page.getByLabel("Start date (Philippine date)").fill(occupancyStart);
    await page.getByLabel("Private note (optional)").fill("Test walk-in occupancy");
    await page.getByRole("button", { name: "Save availability", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Walk-in occupancy saved" }),
    ).toBeVisible();
    const occupancy = page
      .locator("article.account-card")
      .filter({ hasText: "Test walk-in occupancy" });
    await expect(occupancy).toContainText("no end date");
    await occupancy.getByLabel("Set end date (exclusive)").fill(occupancyEnd);
    await occupancy.getByRole("button", { name: "Save end date", exact: true }).click();
    await expect(occupancy.getByRole("status")).toContainText("Availability end date saved");
    await expect(occupancy).toContainText(`${occupancyStart} to ${occupancyEnd}`);

    await page
      .getByLabel("Room or bedspace", { exact: true })
      .selectOption({ label: "Room A · Bed 1" });
    await page.getByLabel("Availability record", { exact: true }).selectOption("blocked");
    const maintenanceStart = dateIn(60);
    await page.getByLabel("Start date (Philippine date)").fill(maintenanceStart);
    await page.getByLabel("End date (optional)").fill(dateIn(65));
    await page.getByLabel("Private note (optional)").fill("Test maintenance block");
    await page.getByRole("button", { name: "Save availability", exact: true }).click();
    await expect(page.locator("#availability form.auth-form .form-message")).toContainText(
      "Maintenance block saved",
    );
    const maintenance = page.locator("article.account-card").filter({
      hasText: "Test maintenance block",
    });
    await expect(maintenance).toContainText("blocked");
    await confirmAction(page, "Cancel future block");
    await expect(
      page.locator("article.account-card").filter({ hasText: "Test maintenance block" }),
    ).toHaveCount(0);

    const crossOrigin = await page.request.post("/api/photos", {
      headers: { Origin: "https://attacker.example" },
      data: "ignored",
    });
    expect(crossOrigin.status()).toBe(403);
    const oversized = await page.request.post("/api/photos", {
      headers: { Origin: "http://127.0.0.1:3000" },
      multipart: {
        property_id: id,
        alt_text: "Oversized photo",
        photo: {
          name: "huge.png",
          mimeType: "image/png",
          buffer: Buffer.alloc(3 * 1024 * 1024 + 70000),
        },
      },
    });
    expect(oversized.status(), await oversized.text()).toBe(413);
    await page.getByLabel("Choose a property photo").setInputFiles({
      name: "unsafe.svg",
      mimeType: "image/png",
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    });
    await page.getByLabel("Photo description", { exact: true }).fill("Room A with study area");
    await page.getByRole("button", { name: "Upload photo", exact: true }).click();
    await expect(
      page.getByRole("main").getByRole("alert").filter({ hasText: "valid, nonanimated" }),
    ).toBeVisible();
    const inputPhoto = await sharp({
      create: { width: 320, height: 180, channels: 3, background: "#cdb4db" },
    })
      .withExif({ IFD0: { Artist: "Private camera information" } })
      .png()
      .toBuffer();
    await page
      .getByLabel("Choose a property photo")
      .setInputFiles({ name: "room.png", mimeType: "image/png", buffer: inputPhoto });
    await page.getByRole("button", { name: "Upload photo", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Photo uploaded for review" }),
    ).toBeVisible();
    const image = page.getByRole("img", { name: "Room A with study area", exact: true });
    await expect(image).toBeVisible();
    const photoPath = await image.getAttribute("src");
    expect(photoPath).toMatch(/^\/media\/photos\//);
    expect((await publicPage.request.get(photoPath!)).status()).toBe(404);
    const privateImage = await page.request.get(photoPath!);
    expect(privateImage.status()).toBe(200);
    expect(privateImage.headers()["cache-control"]).toContain("no-store");
    const outputMetadata = await sharp(await privateImage.body()).metadata();
    expect(outputMetadata.format).toBe("webp");
    expect(outputMetadata.exif).toBeUndefined();
    await publicPage.goto(`/properties/garden-${token}`);
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
      "This space isn’t here.",
    );
    await confirmAction(page, "Submit for review");
    await expect(page.getByText(/Status: pending review/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Save property", exact: true })).toHaveCount(0);
    await confirmAction(page, "Sign out");
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
    await confirmAction(page, "Save review");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Review every pending photo",
    );
    await page
      .getByLabel("Photo review note", { exact: true })
      .fill("Clear photo of the property; no personal documents visible.");
    await confirmAction(page, "Save photo review");
    await expect(page.getByText("approved", { exact: true }).first()).toBeVisible();
    await page
      .getByLabel("Review notes", { exact: true })
      .fill("Verified contact and property details for publication.");
    await confirmAction(page, "Save review");
    await expect(page.getByText("published", { exact: true }).first()).toBeVisible();
    await page.getByLabel("Featured priority (0 removes placement)").fill("80");
    await page
      .getByLabel("Featured through (Philippine date)")
      .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await page
      .getByLabel("Placement reason or agreement reference")
      .fill("Synthetic featured placement agreement.");
    await confirmAction(page, "Save featured placement");
    await expect(
      page.getByRole("status").filter({ hasText: "Featured placement saved" }),
    ).toBeVisible();
    await publicPage.goto(`/properties?q=${token}&type=bedspace&max=3000`);
    await expect(publicPage.getByTestId("listing-card")).toHaveCount(1);
    await expect(
      publicPage.getByTestId("listing-card").getByText("Featured · Promoted", { exact: true }),
    ).toBeVisible();
    await publicPage.getByRole("link", { name: `Test Garden ${token}`, exact: true }).click();
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(`Test Garden ${token}`);
    await expect(publicPage.getByText("Room A · Bed 1", { exact: true })).toBeVisible();
    await expect(
      publicPage.getByRole("img", { name: "Room A with study area", exact: true }),
    ).toBeVisible();
    expect((await publicPage.request.get(photoPath!)).status()).toBe(200);
    const optimized = await publicPage.request.get(
      `/_next/image?url=${encodeURIComponent(photoPath!)}&w=640&q=75`,
    );
    expect(optimized.status()).not.toBe(200);
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
    await confirmAction(page, "Sign out");
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/owner$/);
    await page.goto(manageUrl);
    await expect(
      page.getByText("Verified contact and property details for publication.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Property name", { exact: true }).fill(`Updated Garden ${token}`);
    await confirmAction(page, "Save property");
    await expect(page.getByText(/Status: paused/)).toBeVisible();
    await publicPage.goto(`/properties/garden-${token}`);
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
      "This space isn’t here.",
    );
    expect((await publicPage.request.get(photoPath!)).status()).toBe(404);
    await confirmAction(page, "Remove photo");
    await expect(
      page.getByRole("img", { name: "Room A with study area", exact: true }),
    ).toHaveCount(0);
    expect((await page.request.get(photoPath!)).status()).toBe(404);
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
