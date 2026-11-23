import path from 'node:path';
import { test, expect } from '@fixtures/index';
import { env } from '@config/env';

/**
 * Visual regression for a few components that matter to shoppers.
 *
 * Baselines only make sense when two things are fixed:
 *   - the data: only against ENV=local, which starts from the same seed every run
 *   - the rendering: only inside the Playwright Docker image, so fonts and
 *     anti-aliasing are the same on every machine (npm run test:visual:docker)
 * Moving parts (chat button, live activity, banners) are hidden with a stylesheet.
 */
const screenshot = {
  stylePath: path.join(__dirname, 'hide-dynamic.css'),
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.01,
};

test.describe('Visual @visual', () => {
  test.skip(env.name !== 'local', 'Baselines are made from the seeded Docker copy only');

  test('VIS-01 navigation bar', async ({ homePage, page }) => {
    await homePage.open();
    await expect(page.locator('nav.navbar')).toHaveScreenshot('navbar.png', screenshot);
  });

  test('VIS-02 product card', async ({ homePage }) => {
    await homePage.open();
    await homePage.sortBy('name,asc');
    await expect(homePage.card(0).root).toHaveScreenshot('product-card.png', screenshot);
  });

  test('VIS-03 product details', async ({ api, productPage, page }) => {
    const [first] = (await api.products.list({ sort: 'name,asc' })).data;
    await productPage.open(first!.id);
    await expect(page.locator('app-detail .row').first()).toHaveScreenshot('product-details.png', screenshot);
  });

  test('VIS-04 cart with two lines', async ({ api, productPage, checkoutPage, page }) => {
    const [a, b] = (await api.products.list({ sort: 'name,asc' })).data.filter((p) => p.in_stock);
    await productPage.open(a!.id);
    await productPage.addToCart(2);
    await productPage.open(b!.id);
    await productPage.addToCart(1);
    await checkoutPage.open();
    await expect(page.locator('app-cart table')).toHaveScreenshot('cart.png', screenshot);
  });
});
