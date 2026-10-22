import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { currentTotp } from "../helpers/totp.mjs";
import { confirmAction } from "../helpers/confirm-action";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== "http://127.0.0.1:54321")
  throw new Error("Admin management tests require isolated local Supabase.");
const service = createClient(url, process.env.TEST_SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function login(page: Page, email: string, password: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function search(page: Page, value: string, status: string) {
  await page.getByRole("searchbox").fill(value);
  await page.getByLabel("Status", { exact: true }).selectOption(status);
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(value);
  await expect.poll(() => new URL(page.url()).searchParams.get("status")).toBe(status);
  await expect(page.getByRole("searchbox")).toHaveValue(value);
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(status);
}

test("admins manage users and reports with MFA, confirmations, audit reasons and private access", async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const token = randomUUID();
  const password = `Cabahay-management-${token}!`;
  const accounts = [];
  for (const label of ["Moderator", "Owner", "Reporter"]) {
    const email = `${label.toLowerCase()}-${token}@example.test`;
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `${label} ${token}` },
    });
    expect(result.error).toBeNull();
    accounts.push({ id: result.data.user!.id, email, name: `${label} ${token}` });
  }
  const [admin, owner, reporter] = accounts;
  const property = randomUUID(),
    report = randomUUID(),
    dismissed = randomUUID();
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const stranger = await browser.newContext();
  const strangerPage = await stranger.newPage();
  try {
    await db.query(
      "insert into public.account_roles(user_id,role) values($1,'admin'),($2,'owner')",
      [admin.id, owner.id],
    );
    await db.query(
      "insert into public.properties(id,owner_id,slug,title,description,property_type,barangay,status,verified_at,verified_by) values($1,$2,$3,$4,'A monthly rental fixture for report review.','boarding_house','Caasinan','published',now(),$5)",
      [property, owner.id, `moderation-${token}`, `Reported home ${token}`, admin.id],
    );
    await db.query(
      "insert into public.reports(id,reporter_id,property_id,reason,detail) values($1,$2,$3,$4,$5),($6,$2,$3,$7,'Duplicate fixture report')",
      [
        report,
        reporter.id,
        property,
        `Safety concern ${token}`,
        '<img src=x onerror="window.adminReportXss=true">',
        dismissed,
        `Duplicate ${token}`,
      ],
    );
    for (let i = 0; i < 21; i++)
      await db.query(
        "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)",
        [
          randomUUID(),
          `paging-${i}-${token}@example.test`,
          JSON.stringify({ display_name: `Paging ${token} ${i}` }),
        ],
      );

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers$/);
    await login(strangerPage, reporter.email, password, "/admin/users");
    await expect(strangerPage).toHaveURL(/\/dashboard$/);
    await strangerPage.goto("/admin/reports");
    await expect(strangerPage).toHaveURL(/\/dashboard$/);
    await expect(strangerPage.getByRole("heading", { name: "Manage reports." })).toHaveCount(0);

    await login(page, admin.email, password, "/admin/users");
    await expect(page).toHaveURL(/\/dashboard\/security$/);
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/dashboard\/security$/);
    await page.getByRole("button", { name: "Set up an authenticator" }).click();
    await page.getByText("Enter the setup key manually").click();
    const secret = await page.locator(".mfa-setup code").innerText();
    await page.getByLabel("Authenticator code").fill(currentTotp(secret));
    await page.getByRole("button", { name: "Verify authenticator", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "verification is complete" }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Account navigation" })
      .getByRole("link", { name: "Users", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage users.");
    await page.goto(`/admin/users?notice=__proto__&q=${owner.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Manage users.");
    await search(page, admin.id, "all");
    await expect(
      page.getByText("This is your account. You cannot change your own status."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Suspend account", exact: true })).toHaveCount(0);
    await search(page, owner.id, "all");
    const card = page.getByRole("article", { name: `Account: ${owner.name}`, exact: true });
    await card.getByText("Suspend account access", { exact: true }).click();
    await card.getByLabel("Reason (required)").fill("Investigating a reported property issue");
    await confirmAction(page, "Suspend account");
    await expect(page.getByRole("status").filter({ hasText: "Account suspended" })).toBeVisible();
    await expect(card.getByText("suspended", { exact: true })).toBeVisible();
    expect(
      (
        await db.query(
          "select metadata->>'reason' as reason from public.audit_events where entity_id=$1 and action='account.suspended' order by occurred_at desc limit 1",
          [owner.id],
        )
      ).rows[0].reason,
    ).toBe("Investigating a reported property issue");
    await card.getByText("Restore account access", { exact: true }).click();
    await card.getByLabel("Reason (required)").fill("The reported issue has been addressed");
    await confirmAction(page, "Restore account");
    await expect(
      page.getByRole("status").filter({ hasText: "Account access restored" }),
    ).toBeVisible();
    await expect(card.getByText("active", { exact: true })).toBeVisible();
    // Tampering with the hidden target cannot suspend the acting administrator.
    await card.getByText("Suspend account access", { exact: true }).click();
    await card.getByLabel("Reason (required)").fill("Attempt to change my own status");
    await card.locator('input[name="id"]').evaluate((input, id) => {
      (input as HTMLInputElement).value = id;
    }, admin.id);
    await confirmAction(page, "Suspend account");
    await expect(card.getByRole("alert")).toContainText("cannot change your own account status");
    expect(
      (await db.query("select account_status from public.profiles where id=$1", [admin.id])).rows[0]
        .account_status,
    ).toBe("active");

    await search(page, `Paging ${token}`, "active");
    await expect(page.getByRole("article")).toHaveCount(20);
    await page.getByRole("link", { name: "Next page", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("searchbox")).toHaveValue(`Paging ${token}`);
    await page.getByRole("link", { name: "Previous page", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(20);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page
      .getByRole("navigation", { name: "Account navigation" })
      .getByRole("link", { name: "Reports", exact: true })
      .click();
    await search(page, report, "open");
    let reportCard = page.getByRole("article", {
      name: `Report: Safety concern ${token}`,
      exact: true,
    });
    await expect(reportCard.getByText(reporter.name, { exact: false })).toBeVisible();
    await expect(reportCard.locator('img[src="x"]')).toHaveCount(0);
    await expect(
      reportCard.getByRole("link", { name: reporter.name, exact: true }),
    ).toHaveAttribute("href", `/admin/users?q=${reporter.id}`);
    const stale = await page.context().newPage();
    await stale.goto(page.url());
    await reportCard.getByLabel("Report decision").selectOption("resolved");
    await confirmAction(page, "Close report");
    await expect(
      page.getByRole("status").filter({ hasText: "Report marked resolved" }),
    ).toBeVisible();
    await expect(page.getByText("No reports match these filters.")).toBeVisible();
    await stale.getByLabel("Report decision").selectOption("dismissed");
    await confirmAction(stale, "Close report");
    await expect(stale.locator('p[role="alert"]')).toContainText("already have been handled");
    await stale.close();
    expect(
      (await db.query("select status,resolved_by from public.reports where id=$1", [report]))
        .rows[0],
    ).toEqual({ status: "resolved", resolved_by: admin.id });
    await search(page, report, "resolved");
    reportCard = page.getByRole("article", {
      name: `Report: Safety concern ${token}`,
      exact: true,
    });
    await expect(reportCard.getByText(`Resolved by ${admin.name}`, { exact: false })).toBeVisible();
    await expect(reportCard.getByRole("button", { name: "Close report", exact: true })).toHaveCount(
      0,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await search(page, dismissed, "open");
    await page.getByLabel("Report decision").selectOption("dismissed");
    await confirmAction(page, "Close report");
    await expect(page.getByRole("status").filter({ hasText: "Report dismissed" })).toBeVisible();
    expect(
      (await db.query("select status from public.reports where id=$1", [dismissed])).rows[0].status,
    ).toBe("dismissed");
  } finally {
    await db.end();
    await stranger.close();
  }
});
