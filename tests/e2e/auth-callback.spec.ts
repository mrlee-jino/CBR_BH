import { expect, test } from "@playwright/test";

test("callback errors cannot redirect off-site or reflect provider messages", async ({ page }) => {
  await page.goto(
    "/auth/confirm?error=access_denied&error_description=untrusted&next=https://evil.test",
  );
  await expect(page).toHaveURL(/\/login\?message=sign-in-failed$/);
  await expect(page.getByRole("status")).toContainText("Sign-in was not completed");
  await expect(page.getByText("untrusted")).toHaveCount(0);
  await page.goto("/auth/confirm?code=invalid&next=//evil.test");
  await expect(page).toHaveURL(/\/login\?message=invalid-link$/);
});
