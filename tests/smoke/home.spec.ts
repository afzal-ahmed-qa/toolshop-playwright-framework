import { test, expect } from '@playwright/test';

test('SMK-01 home page lists products @smoke', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('product-name').first()).toBeVisible();
  await expect(page.getByTestId('sort')).toBeVisible();
});
