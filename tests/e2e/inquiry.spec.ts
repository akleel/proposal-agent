import { expect, test } from "@playwright/test";

test("creates and reloads a persisted inquiry", async ({ page }) => {
  const inquiryText =
    `Playwright E2E ${Date.now()}: ` +
    "We need 24 rooms in Stockholm for a two-day company offsite.";

  await page.goto("/");

  await page
    .getByRole("link", { name: "Create inquiry" })
    .click();

  await expect(page).toHaveURL(/\/inquiries\/new$/);

  await page
    .getByLabel("Customer inquiry")
    .fill(inquiryText);

  await Promise.all([
    page.waitForURL(
      /\/inquiries\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    ),
    page
      .getByRole("button", { name: "Create inquiry" })
      .click(),
  ]);

  const persistedUrl = page.url();

  await expect(
    page.getByText(inquiryText, { exact: true }),
  ).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL(persistedUrl);

  await expect(
    page.getByText(inquiryText, { exact: true }),
  ).toBeVisible();
});
