import { test, expect } from '@fixtures/index';
import type { Route } from '@playwright/test';
import type { GridResults } from '@pages/BasePage';
import { expectKnownDefect } from '@fixtures/known-defect';

/**
 * How the shop front behaves when the product API misbehaves.
 * These states are hard or impossible to create on a real server,
 * so the browser's requests are intercepted with page.route().
 *
 * Only the product LIST is intercepted (QUERY/GET /products). The pattern does
 * not match /products/{id}, and API calls made by the test itself are not affected.
 */
const PRODUCT_LIST = /\/products(\?|$)/;

const emptyPage: GridResults = {
  current_page: 1,
  data: [],
  from: null,
  to: null,
  last_page: 1,
  per_page: 9,
  total: 0,
};

test.describe('Product list under network problems', () => {
  test('MOCK-01 an empty product list tells the shopper there is nothing', async ({ page, homePage }) => {
    await page.route(PRODUCT_LIST, (route) => route.fulfill({ json: emptyPage }));
    await page.goto('/');
    await expect(homePage.noResults).toHaveText('There are no products found.');
    await expect(homePage.cards).toHaveCount(0);
    await expect(homePage.skeletons).toHaveCount(0);
  });

  test('MOCK-02 a slow API shows loading placeholders, then the products', async ({ page, homePage }) => {
    await page.route(PRODUCT_LIST, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await route.continue();
    });
    await page.goto('/');
    await expect(homePage.skeletons.first()).toBeVisible();
    await expect(homePage.cards).toHaveCount(0);

    await expect(homePage.cards.first()).toBeVisible({ timeout: 10_000 });
    await expect(homePage.skeletons).toHaveCount(0);
  });

  test('MOCK-03 a server error shows a message instead of endless placeholders', async ({
    page,
    homePage,
  }) => {
    await page.route(PRODUCT_LIST, (route) =>
      route.fulfill({ status: 500, json: { message: 'Server Error' } }),
    );
    await page.goto('/');
    await expectKnownDefect('DEF-04', 'placeholders stay forever and no message on HTTP 500', async () => {
      await expect(homePage.skeletons).toHaveCount(0, { timeout: 5_000 });
      await expect(page.getByText(/went wrong|try again|could not|error/i)).toBeVisible({ timeout: 1_000 });
    });
  });

  test('MOCK-04 the grid formats edge-case data correctly', async ({ page, homePage }) => {
    const longName = 'Industrial Heavy-Duty Adjustable Torque Wrench Set With Carry Case And Extensions';

    // Take the real response and change it, so every other field stays realistic.
    await page.route(PRODUCT_LIST, async (route: Route) => {
      const response = await route.fetch();
      const body = (await response.json()) as GridResults;
      const [a, b, c] = body.data;
      body.data = [
        { ...a!, price: 1234.5 },
        { ...b!, price: 0.99, in_stock: false },
        { ...c!, name: longName },
      ];
      await route.fulfill({ response, json: body });
    });
    await page.goto('/');

    await expect(homePage.cards).toHaveCount(3);
    await expect(homePage.card(0).price).toHaveText(/\$1,?234\.50/);
    await expect(homePage.card(1).price).toHaveText('$0.99');
    await expect(homePage.card(1).outOfStock).toBeVisible();
    await expect(homePage.card(2).name).toHaveText(longName);

    // The long name wraps inside its card instead of spilling over the next one.
    const card = homePage.card(2);
    await card.root.scrollIntoViewIfNeeded();
    const [cardBox, nameBox] = [await card.root.boundingBox(), await card.name.boundingBox()];
    expect(nameBox!.x).toBeGreaterThanOrEqual(cardBox!.x);
    expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1);
  });
});
