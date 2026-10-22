import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { currentTotp } from "../helpers/totp.mjs";
import { confirmAction } from "../helpers/confirm-action";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== "http://127.0.0.1:54321")
  throw new Error("Listing report tests require isolated local Supabase.");
const service = createClient(url, process.env.TEST_SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function credentials(page: Page, email: string, password: string) {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
test("a signed-in renter reports a published property privately and an admin reviews it", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const token = randomUUID(),
    password = `Cabahay-report-${token}!`;
  const accounts = [];
  for (const role of ["owner", "renter", "admin"]) {
    const email = `report-${role}-${token}@example.test`;
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `${role} report ${token}` },
    });
    expect(result.error).toBeNull();
    accounts.push({ id: result.data.user!.id, email });
  }
  const [owner, renter, admin] = accounts;
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const property = randomUUID(),
    slug = `report-flow-${token}`,
    title = `Reportable home ${token}`;
  const path = `/properties/${slug}/report`;
  const moderator = await browser.newContext();
  const moderatorPage = await moderator.newPage();
  await moderatorPage.emulateMedia({ reducedMotion: "reduce" });
  try {
    await db.query(
      "insert into public.account_roles(user_id,role) values($1,'owner'),($2,'admin')",
      [owner.id, admin.id],
    );
    await db.query(
      "insert into public.properties(id,owner_id,slug,title,description,property_type,barangay,status,verified_at,verified_by) values($1,$2,$3,$4,'A publicly reviewed monthly rental.','boarding_house','Caasinan','published',now(),$5)",
      [property, owner.id, slug, title, admin.id],
    );
    await db.query(
      "insert into public.property_private_details(property_id,street_address,contact_name,contact_phone) values($1,'Private reporting address 456','Private Reporting Owner','09123456789')",
      [property],
    );
    await db.query(
      "insert into public.units(property_id,label,unit_type,monthly_rent,deposit_amount) values($1,'Report room','private_room',3000,3000)",
      [property],
    );
    await page.goto(`/properties/${slug}`);
    await page.getByRole("link", { name: "Report this listing", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`));
    await credentials(page, renter.email, password);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Report this listing");
    await expect(page.getByText("Private reporting address 456")).toHaveCount(0);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const detail =
      'The advertised price differs from the offered room. <img src=x onerror="window.reportXss=true">';
    await page.getByLabel("Report reason").selectOption("Incorrect listing information");
    await page.getByLabel("Additional details (optional)").fill(detail);
    await page.getByRole("button", { name: "Send report", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(
      /report.*(submitted|administrator|admin)/i,
    );
    const reports = await db.query(
      "select id,reason,detail,status,reporter_id from public.reports where property_id=$1",
      [property],
    );
    expect(reports.rows).toHaveLength(1);
    const report = reports.rows[0];
    expect(report).toMatchObject({
      reporter_id: renter.id,
      reason: "Incorrect listing information",
      detail,
      status: "open",
    });
    await expect(page.getByText(`Report reference: ${report.id}`, { exact: true })).toBeVisible();
    expect(
      (await db.query("select status from public.properties where id=$1", [property])).rows[0]
        .status,
    ).toBe("published");
    const refresh = await page.goto(path);
    expect(refresh!.headers()["cache-control"]).toContain("no-store");
    await expect(page.getByRole("status")).toContainText("already have an open report");
    await expect(page.getByRole("button", { name: "Send report", exact: true })).toHaveCount(0);
    const ownerClient = createClient(url!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(
      (await ownerClient.auth.signInWithPassword({ email: owner.email, password })).error,
    ).toBeNull();
    expect((await ownerClient.from("reports").select("id").eq("id", report.id)).data).toEqual([]);
    await db.query("update public.properties set status='paused' where id=$1", [property]);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This space isn’t here.");
    await expect(page.getByRole("button", { name: "Send report", exact: true })).toHaveCount(0);
    await db.query("update public.properties set status='published' where id=$1", [property]);
    await moderatorPage.goto("/admin/login");
    await credentials(moderatorPage, admin.email, password);
    await expect(moderatorPage).toHaveURL(/\/dashboard\/security$/);
    await moderatorPage.getByRole("button", { name: "Set up an authenticator" }).click();
    await moderatorPage.getByText("Enter the setup key manually").click();
    const secret = await moderatorPage.locator(".mfa-setup code").innerText();
    await moderatorPage.getByLabel("Authenticator code").fill(currentTotp(secret));
    await moderatorPage.getByRole("button", { name: "Verify authenticator", exact: true }).click();
    await expect(
      moderatorPage.getByRole("status").filter({ hasText: "verification is complete" }),
    ).toBeVisible();
    await moderatorPage.goto(`/admin/reports?q=${report.id}`);
    const card = moderatorPage.getByRole("article", {
      name: "Report: Incorrect listing information",
      exact: true,
    });
    await expect(card.getByText(detail, { exact: true })).toBeVisible();
    await expect(card.locator('img[src="x"]')).toHaveCount(0);
    await expect(card.getByRole("link", { name: new RegExp(title) })).toHaveAttribute(
      "href",
      `/admin/properties/${property}`,
    );
    await card.getByLabel("Report decision").selectOption("resolved");
    await confirmAction(moderatorPage, "Close report");
    await expect(
      moderatorPage.getByRole("status").filter({ hasText: "Report marked resolved" }),
    ).toBeVisible();
    expect(
      (await db.query("select status,resolved_by from public.reports where id=$1", [report.id]))
        .rows[0],
    ).toEqual({ status: "resolved", resolved_by: admin.id });
    expect(
      (await db.query("select status from public.properties where id=$1", [property])).rows[0]
        .status,
    ).toBe("published");
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Send report", exact: true })).toBeVisible();
    await db.query("update public.profiles set account_status='suspended' where id=$1", [
      renter.id,
    ]);
    await page.goto(path);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "An active account is required",
    );
    await expect(page.getByRole("button", { name: "Send report", exact: true })).toHaveCount(0);
  } finally {
    await db.end();
    await moderator.close();
  }
});
