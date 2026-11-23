import type { Browser } from '@playwright/test';
import { test, expect } from '@fixtures/index';
import { STORAGE_STATE } from '@fixtures/auth';
import { AdminProductsPage } from '@pages/admin/AdminProductsPage';
import { AdminProductFormPage } from '@pages/admin/AdminProductFormPage';
import { ProductPage } from '@pages/ProductPage';
import { buildProduct } from '@data/factories';
import { cents } from '@pages/money';

/**
 * A shopper who opens the product page right now, in a fresh browser.
 * Fresh on purpose: the product API answers with Cache-Control max-age=120,
 * so a browser that saw the product before shows the old data for up to
 * two minutes (DEF-03, covered separately in the defect tests).
 */
async function shopperOpens(browser: Browser, productId: string, check: (p: ProductPage) => Promise<void>) {
  const context = await browser.newContext();
  try {
    const shopper = new ProductPage(await context.newPage());
    await shopper.page.goto(`/product/${productId}`);
    await check(shopper);
  } finally {
    await context.close();
  }
}

/**
 * E2E-02: two people, two browser contexts. The admin works in one with the
 * saved admin login; the shopper uses separate anonymous contexts, so the admin
 * session never leaks into what the shopper sees.
 */
test('E2E-02 admin creates, reprices and deletes a product; a shopper sees each change @e2e', async ({
  browser,
  api,
  cleanup,
}) => {
  test.setTimeout(90_000);
  const [brand] = await api.products.brands();
  const template = (await api.products.list()).data[0]!;
  const product = buildProduct({
    brand_id: brand!.id,
    category_id: template.category.id,
    product_image_id: template.product_image!.id,
  });

  const adminContext = await browser.newContext({ storageState: STORAGE_STATE.admin });
  const adminPage = await adminContext.newPage();
  const adminList = new AdminProductsPage(adminPage);
  const adminForm = new AdminProductFormPage(adminPage);
  let productId = '';

  try {
    await test.step('admin creates the product through the form', async () => {
      await adminForm.openNew();
      await adminForm.fill(product);
      productId = await adminForm.save();
      cleanup.product(productId);
    });

    await test.step('a shopper sees it with the right name and price', async () => {
      await shopperOpens(browser, productId, async (shopper) => {
        await expect(shopper.name).toContainText(product.name);
        expect(await shopper.price()).toBe(cents(product.price));
      });
    });

    const newPrice = cents(product.price + 10);
    await test.step('admin changes the price', async () => {
      await adminList.open();
      await adminList.search(product.name);
      await adminList.edit(productId);
      await adminForm.setPrice(newPrice);
      test.info().annotations.push({
        type: 'known defect',
        description: 'DEF-02: edit form does not load stock, brand, category and image',
      });
      await adminForm.reenterFieldsNotLoadedOnEdit(product);
      await adminForm.save();
      expect((await api.products.get(productId)).price).toBe(newPrice);
    });

    await test.step('a shopper now sees the new price', async () => {
      await shopperOpens(browser, productId, async (shopper) => {
        await expect(shopper.unitPrice).toContainText(newPrice.toFixed(2));
      });
    });

    await test.step('admin deletes it and shoppers can no longer open it', async () => {
      await adminList.open();
      await adminList.search(product.name);
      await adminList.delete(productId);
      expect((await api.products.request.get(`products/${productId}`)).status()).toBe(404);
      await shopperOpens(browser, productId, async (shopper) => {
        // The page renders no product at all for a deleted id.
        await expect(shopper.name).toBeHidden();
      });
    });
  } finally {
    await adminContext.close();
  }
});
