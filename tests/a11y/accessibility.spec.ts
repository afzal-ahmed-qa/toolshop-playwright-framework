import { test, expect } from '@fixtures/index';
import { expectNoNewViolations, type KnownViolation } from '@fixtures/a11y';
import { env } from '@config/env';

/**
 * WCAG 2.1 A/AA scans with axe-core, plus one keyboard-only check.
 * axe finds roughly a third of accessibility problems; the rest needs manual
 * testing with a screen reader. These scans catch regressions in that third.
 */
const PASSWORD_TOGGLE: KnownViolation = {
  rule: 'button-name',
  selector: '.btn-outline-secondary',
  defect: 'DEF-08',
};
const CATEGORY_LIST: KnownViolation = { rule: 'list', selector: '.checkbox', defect: 'DEF-09' };
const PASSWORD_RULES_LIST: KnownViolation = { rule: 'list', selector: '#passwordHelp', defect: 'DEF-09' };

test.describe('Accessibility @a11y', () => {
  test('A11Y-01 shop front', async ({ homePage, page }) => {
    await homePage.open();
    await expectNoNewViolations(page, [CATEGORY_LIST]);
  });

  test('A11Y-02 product page', async ({ api, productPage, page }) => {
    const [product] = (await api.products.list()).data;
    await productPage.open(product!.id);
    await expectNoNewViolations(page);
  });

  test('A11Y-03 login page', async ({ loginPage, page }) => {
    await loginPage.open();
    await expectNoNewViolations(page, [PASSWORD_TOGGLE]);
  });

  test('A11Y-04 registration page', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.getByTestId('register-submit')).toBeVisible();
    await expectNoNewViolations(page, [PASSWORD_TOGGLE, PASSWORD_RULES_LIST]);
  });

  test('A11Y-05 contact page', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByTestId('contact-submit')).toBeVisible();
    await expectNoNewViolations(page);
  });

  test('A11Y-06 cart and billing address steps of checkout', async ({
    customerPage,
    api,
    productPage,
    checkoutPage,
  }) => {
    const [product] = (await api.products.list()).data.filter((p) => p.in_stock);
    await productPage.open(product!.id);
    await productPage.addToCart(1);
    await checkoutPage.open();
    await expectNoNewViolations(customerPage);

    await checkoutPage.proceedFromCart();
    await checkoutPage.proceedAsLoggedInUser();
    await expectNoNewViolations(customerPage);
  });

  test('A11Y-07 a customer can log in with the keyboard only', async ({ page, loginPage }) => {
    await loginPage.open();
    await loginPage.email.focus();
    await page.keyboard.type(env.customer.email);
    await page.keyboard.press('Tab');
    await expect(loginPage.password).toBeFocused();
    await page.keyboard.type(env.customer.password);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/account$/);
  });
});
