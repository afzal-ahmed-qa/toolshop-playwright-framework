import { test, expect } from '@fixtures/index';
import { STORAGE_STATE } from '@fixtures/auth';

test.describe('Saved login state', () => {
  test.describe('as the seeded customer', () => {
    test.use({ storageState: STORAGE_STATE.customer });

    test('SMK-02 opens My account without the login form @smoke', async ({ page }) => {
      await page.goto('/account');
      await expect(page.getByTestId('page-title')).toHaveText('My account');
    });
  });

  test.describe('as the admin', () => {
    test.use({ storageState: STORAGE_STATE.admin });

    test('SMK-03 opens the admin product list @smoke', async ({ page }) => {
      await page.goto('/admin/products');
      await expect(page.getByTestId('product-add')).toBeVisible();
    });
  });

  test('SMK-04 a newly registered customer is logged in through the fixture', async ({
    customerPage,
    newCustomer,
  }) => {
    await customerPage.goto('/account');
    await expect(customerPage.getByTestId('nav-menu')).toContainText(newCustomer.first_name);
  });
});
