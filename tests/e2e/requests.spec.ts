import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== "http://127.0.0.1:54321")
  throw new Error("Request browser tests require isolated local Supabase.");
const service = createClient(url, process.env.TEST_SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function login(page: Page, email: string, password: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
}
test("renters request, owners decide, contacts stay private, and competing bookings cannot both be approved", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  const token = randomUUID();
  const password = `Puyo-requests-${token}!`;
  const accounts = [];
  for (const role of ["owner", "renter", "other"]) {
    const email = `${role}-${token}@example.test`;
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `${role} request test` },
    });
    expect(result.error).toBeNull();
    accounts.push({ email, id: result.data.user!.id });
  }
  const [owner, renter, other] = accounts;
  const property = randomUUID();
  const unit = randomUUID();
  const slug = `requests-${token}`;
  const title = `Request Garden ${token}`;
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query("insert into public.account_roles(user_id,role) values($1,'owner')", [owner.id]);
    await db.query(
      "insert into public.properties(id,owner_id,slug,title,description,property_type,barangay,status) values($1,$2,$3,$4,'A quiet test rental with clear monthly terms.','boarding_house','Caasinan','published')",
      [property, owner.id, slug, title],
    );
    await db.query(
      "insert into public.property_private_details(property_id,street_address,contact_name,contact_phone) values($1,'Private request address 789','Request Owner','09123456789')",
      [property],
    );
    await db.query(
      "insert into public.units(id,property_id,label,unit_type,monthly_rent,deposit_amount,terms) values($1,$2,'Room A','private_room',3500,3500,'Water included; electricity separate.')",
      [unit, property],
    );
    await db.query("update public.profile_contacts set phone='09987654321' where user_id=$1", [
      renter.id,
    ]);
  } finally {
    await db.end();
  }
  const ownerContext = await browser.newContext();
  const otherContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const otherPage = await otherContext.newPage();
  const bookingPath = `/properties/${slug}/request?kind=booking&unit=${unit}`;
  const start = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
  const visit = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) + "T14:30";
  async function book(target: Page) {
    await target.getByLabel("Move-in date", { exact: true }).fill(start);
    await target.getByLabel(/I accept the displayed/).check();
    await target.getByLabel(/I agree to share/).check();
    await target.getByRole("button", { name: "Send booking request", exact: true }).click();
    await expect(target).toHaveURL(/\/dashboard\/requests\/[a-f0-9-]+\?kind=booking/);
  }
  try {
    await page.goto(bookingPath);
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByLabel("Email address").fill(renter.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/properties/${slug}/request`));
    await expect(
      page.getByText("Water included; electricity separate.", { exact: true }),
    ).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.getByLabel("Move-in date", { exact: true }).fill(start);
    await page.getByLabel("Move-out date (optional)").fill(start);
    await page.getByLabel("Message to owner (optional)").fill("I am interested in a monthly stay.");
    await page.getByLabel(/I accept the displayed/).check();
    await page.getByLabel(/I agree to share/).check();
    await page.getByRole("button", { name: "Send booking request", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("after move-in");
    await expect(page.getByLabel("Message to owner (optional)")).toHaveValue(
      "I am interested in a monthly stay.",
    );
    await page.getByLabel("Move-out date (optional)").fill("");
    await book(page); // Optional move-out remains empty: indefinite booking.
    const bookingUrl = page.url();
    await expect(page.getByText("Private request address 789", { exact: true })).toHaveCount(0);
    await expect(page.getByText("pending", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Agreed offer at submission", { exact: true })).toBeVisible();
    await login(otherPage, other.email, password, "/dashboard/requests");
    await otherPage.goto(bookingUrl);
    await expect(otherPage.getByRole("heading", { level: 1 })).toHaveText("This space isn’t here.");
    await otherPage.goto(bookingPath);
    await book(otherPage);
    const competingUrl = otherPage.url();
    await login(ownerPage, owner.email, password, "/owner/requests");
    await ownerPage.goto(bookingPath);
    await expect(ownerPage.getByRole("main").getByRole("alert")).toContainText(
      "cannot request your own property",
    );
    await ownerPage.goto("/owner/requests");
    await expect(
      ownerPage.getByRole("heading", { name: title + " · Room A" }).first(),
    ).toBeVisible();
    await ownerPage.goto(bookingUrl);
    await expect(ownerPage.getByText("09987654321", { exact: true })).toBeVisible();
    await ownerPage.getByRole("button", { name: "Approve booking", exact: true }).click();
    await expect(ownerPage.getByText("approved", { exact: true })).toBeVisible();
    await ownerPage.goto(competingUrl);
    await ownerPage.getByRole("button", { name: "Approve booking", exact: true }).click();
    await expect(ownerPage.getByRole("main").getByRole("alert")).toContainText("overlap");
    await expect(ownerPage.getByText("pending", { exact: true })).toBeVisible();
    await ownerPage.getByRole("button", { name: "Reject booking", exact: true }).click();
    await expect(ownerPage.getByText("rejected", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Private request address 789", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel confirmation", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("cancellation reason");
    await page.getByLabel("Decision reason (required for cancellation)").fill("My plans changed");
    await page.getByRole("button", { name: "Cancel confirmation", exact: true }).click();
    await expect(page.getByText("cancelled", { exact: true })).toBeVisible();
    await expect(page.getByText("Private request address 789", { exact: true })).toHaveCount(0);
    await page.goto(`/properties/${slug}/request?kind=viewing`);
    await page.getByLabel("Preferred viewing date and time (Philippine time)").fill(visit);
    await page.getByLabel("Message to owner (optional)").fill("I would like to see the room.");
    await page.getByLabel(/I agree to share/).check();
    await page.getByRole("button", { name: "Send viewing request", exact: true }).click();
    await expect(page).toHaveURL(/\?kind=viewing$/);
    const viewingUrl = page.url();
    await expect(page.getByText("Private request address 789", { exact: true })).toHaveCount(0);
    await ownerPage.goto(viewingUrl);
    await ownerPage.getByRole("button", { name: "Accept viewing", exact: true }).click();
    await expect(ownerPage.getByText("accepted", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Private request address 789", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("accepted-viewing.png"), fullPage: true });
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page.getByLabel("Decision reason (required for cancellation)").fill("Need another time");
    await page.getByRole("button", { name: "Cancel confirmation", exact: true }).click();
    await expect(page.getByText("cancelled", { exact: true })).toBeVisible();
    await expect(page.getByText("Private request address 789", { exact: true })).toHaveCount(0);
    await page.goto("/dashboard/requests");
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  } finally {
    await ownerContext.close();
    await otherContext.close();
  }
});
