import { expect, test } from "@playwright/test";

// Browser smoke only: no injected wallet and no fake contract RPC are used.
// This verifies the real UI remains closed until a reviewed deployment is configured.
test("unconfigured deployment does not invent state or enable writes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("STUDIO DEV · 61997")).toBeVisible();
  await expect(page.getByText("Studio Dev deployment is not configured yet")).toBeVisible();
  await expect(page.getByRole("button", { name: /Prepare version registration/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Prepare claim/ })).toBeDisabled();
  await expect(page.getByText(/No effective authority/)).toHaveCount(0);

  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByText("No injected EIP-1193 wallet was detected in this browser.")).toBeVisible();
  await expect(page.getByText("No effective authority")).toHaveCount(0);
});

test("challenge input evidence rejects oversized files without truncation", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "oversized.json", mimeType: "application/json", buffer: Buffer.alloc(20_001, 65),
  });
  await expect(page.getByText("Evidence exceeds the 20,000-byte on-chain limit. Nothing was truncated or submitted.")).toBeVisible();
});
