import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { currentTotp } from "../helpers/totp.mjs";

// Never create test users or send recovery emails to a hosted project.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== "http://127.0.0.1:54321")
  throw new Error("Auth browser tests require the isolated local stack.");
const password = `Puyo-test-${randomUUID()}!`;
const service = createClient(url, process.env.TEST_SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function emailLink(email: string) {
  let link: string | undefined;
  await expect(async () => {
    const response = await fetch(
      `http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const inbox = await response.json();
    const first = inbox.messages?.[0];
    expect(first).toBeTruthy();
    const message = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${first.ID}`)).json();
    const html = message.HTML ?? message.Text ?? "";
    link = html.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
    expect(link).toBeTruthy();
  }).toPass({ timeout: 15000 });
  const target = new URL(link!);
  expect(["127.0.0.1", "localhost"]).toContain(target.hostname);
  return target.href;
}

test("signup, email confirmation, profile, owner activation, logout and recovery work end to end", async ({
  page,
}) => {
  const email = `puyo-browser-${randomUUID()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Cabadbaran Neighbor");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "confirmation email" })).toBeVisible();
  const confirmation = await emailLink(email);
  await page.goto(confirmation);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cabadbaran Neighbor");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cabadbaran Neighbor");
  await page
    .getByRole("navigation", { name: "Account navigation" })
    .getByRole("link", { name: "Profile", exact: true })
    .click();
  await page.getByLabel("Display name").fill("Local Renter");
  await page.getByLabel("Phone number (optional)").fill("09123456789");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "profile has been saved" }),
  ).toBeVisible();
  await page.goto("/become-an-owner");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Activate owner access" }).click();
  await expect(page).toHaveURL(/\/owner$/);
  await expect(page.getByText("OWNER ACCESS ACTIVE")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send recovery link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "recovery emails" })).toBeVisible();
  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/reset-password$/);
  const newPassword = `New-${password}`;
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(page).toHaveURL(/password-updated/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("unverified email cannot sign in and a forged return URL never redirects off-site", async ({
  page,
}) => {
  const email = `puyo-unverified-${randomUUID()}@example.test`;
  const { error } = await service.auth.admin.createUser({ email, password, email_confirm: false });
  expect(error).toBeNull();
  await page.goto("/login?next=https://example.com");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Confirm your email");
  await page.goto("/auth/confirm?token_hash=invalid&type=signup&next=//example.com");
  await expect(page).toHaveURL(/\/login\?message=invalid-link$/);
  await page.goto("/reset-password");
  await expect(page.getByText("Open a valid recovery link")).toBeVisible();
});

test("auth forms remain accessible on desktop and mobile", async ({ page }) => {
  for (const route of [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/resend-confirmation",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(report.violations).toEqual([]);
  }
});

test("token-hash confirmation is single-use and ignores off-site redirects", async ({ page }) => {
  const { data, error } = await service.auth.admin.generateLink({
    type: "signup",
    email: `puyo-hash-${randomUUID()}@example.test`,
    password,
  });
  expect(error).toBeNull();
  if (!data.properties) throw new Error("Local confirmation-link generation failed.");
  const path = `/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=signup&next=//example.com`;
  await page.goto(path);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto(path);
  await expect(page).toHaveURL(/\/login\?message=invalid-link$/);
});

test("assigned admin must enroll and verify an authenticator before protected access", async ({
  page,
}) => {
  const email = `puyo-mfa-${randomUUID()}@example.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const connection = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await connection.connect();
  try {
    await connection.query("insert into public.account_roles(user_id,role) values($1,'admin')", [
      data.user!.id,
    ]);
  } finally {
    await connection.end();
  }
  await page.goto("/login?next=/admin");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/security$/);
  await page.getByRole("button", { name: "Set up an authenticator" }).click();
  await page.getByText("Enter the setup key manually").click();
  const secret = await page.locator(".mfa-setup code").innerText();
  await page.getByLabel("Authenticator code").fill(currentTotp(secret));
  await page.getByRole("button", { name: "Verify authenticator", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "verification is complete" }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Platform administration.");
});

test("an unverified account can request and use a fresh confirmation email", async ({ page }) => {
  const email = `puyo-resend-browser-${randomUUID()}@example.test`;
  const { error } = await service.auth.admin.createUser({ email, password, email_confirm: false });
  expect(error).toBeNull();
  await page.goto("/resend-confirmation");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Resend confirmation email", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "new confirmation email" }),
  ).toBeVisible();
  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Your email is verified.", { exact: false })).toBeVisible();
});
