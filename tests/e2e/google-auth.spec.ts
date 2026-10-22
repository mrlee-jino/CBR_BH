import { expect, test } from "@playwright/test";

test("Google signup requires consent and account choice without requiring an email password", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Choose Renter or Property owner");
  await page.getByRole("radio", { name: /^Property owner/ }).check();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Google sign-in is not available yet");
  await expect(page).toHaveURL(/\/signup$/);
});

test("unconfigured Google login stays usable and callback errors are safe", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Google sign-in is not available yet");
  await page.goto(
    "/auth/confirm?error=access_denied&error_description=untrusted&next=https://evil.test",
  );
  await expect(page).toHaveURL(/\/login\?message=google-cancelled$/);
  await expect(page.getByRole("status")).toContainText("Google sign-in was not completed");
  await expect(page.getByText("untrusted")).toHaveCount(0);
  await page.goto("/auth/confirm?code=invalid&next=//evil.test");
  await expect(page).toHaveURL(/\/login\?message=invalid-link$/);
});
