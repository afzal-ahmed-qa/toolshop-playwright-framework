import { test, expect } from '@fixtures/index';
import { expectKnownDefect } from '@fixtures/known-defect';

/**
 * E2E-03: what the customer sees when the shop refuses the order.
 *
 * The real API answers 422 when the billing city does not belong to the postcode.
 * That check is not reliable to trigger: it "fails open" when the postcode service
 * is unavailable (see AddressMatchesCountry in the Toolshop source), and then the
 * order is accepted. So the rejection is mocked here with the exact body the real
 * server returns; the test is about the customer-facing behaviour, and it creates no order.
 */
const REAL_422 = {
  billing_country: [
    'The billing_country does not match the entered address. The city does not belong to the selected country.',
  ],
};

test('E2E-03 a rejected order tells the customer why @e2e', async ({
  customerPage: page,
  api,
  productPage,
  checkoutPage,
}) => {
  test.setTimeout(90_000);
  const [product] = (await api.products.list()).data.filter((p) => p.in_stock);
  await page.route(
    (url) => url.pathname.endsWith('/invoices'),
    (route) =>
      route.request().method() === 'POST' ? route.fulfill({ status: 422, json: REAL_422 }) : route.continue(),
  );

  await test.step('go through checkout with the profile address', async () => {
    await productPage.open(product!.id);
    await productPage.addToCart(1);
    await checkoutPage.open();
    await checkoutPage.proceedFromCart();
    await checkoutPage.proceedAsLoggedInUser();
    await checkoutPage.proceedToPayment();
  });

  await test.step('confirm the order: the shop rejects it', async () => {
    await checkoutPage.paymentMethod.selectOption('cash-on-delivery');
    await page.getByTestId('finish').click();
    await expect(checkoutPage.paymentSuccess).toBeVisible();
    const rejected = page.waitForResponse(
      (r) => r.url().endsWith('/invoices') && r.request().method() === 'POST',
    );
    await page.getByTestId('finish').click();
    expect((await rejected).status()).toBe(422);
  });

  await test.step('the customer is told that the address is wrong', async () => {
    await expect(page.getByText(/Thanks for your order/)).toBeHidden();
    await expectKnownDefect(
      'DEF-10',
      'a rejected order shows no message, only "Payment was successful"',
      async () => {
        await expect(page.getByText(/does not (match|belong)/i)).toBeVisible({ timeout: 3_000 });
      },
    );
  });
});
