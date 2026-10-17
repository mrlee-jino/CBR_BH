import { expect, type Page } from "@playwright/test";

export async function confirmAction(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).press("Tab");
  // The dialog's primary action is always the non-cancel button.
  const primary = dialog.getByRole("button").filter({ hasNotText: /^Cancel$/ });
  await expect(primary).toBeFocused();
  await primary.click();
  await expect(dialog).not.toBeVisible();
}
