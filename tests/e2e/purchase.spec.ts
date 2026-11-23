import { test, expect } from '@fixtures/index';
import { cents } from '@pages/money';

/**
 * E2E-01: the main money path. A new customer finds two products, buys them,
 * and the order the shop stores matches what the customer saw on screen.
 * Prices are read from the API during the test, never hard-coded: on the
 * shared public site admins change them at any time.
 */
test('E2E-01 customer searches, buys two products and the stored invoice matches the cart @smoke @e2e', async ({
  customerPage,
  newCustomer,
  api,
  homePage,
  productPage,
  checkoutPage,
}) => {
  // A full journey across 4 pages; the default 30 s is meant for single-page tests.
  test.setTimeout(90_000);
  const [first, second] = (await api.products.search('pliers')).data.filter((p) => p.in_stock);
  test.skip(!first || !second, 'Needs two products in stock that match "pliers"');
  const order = [
    { product: first!, quantity: 3 },
    { product: second!, quantity: 1 },
  ];

  await test.step('find the products with the search box', async () => {
    await homePage.open();
    await homePage.search('pliers');
    const names = (await homePage.readCards()).map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(order.map((o) => o.product.name)));
  });

  await test.step('add them to the cart with different quantities', async () => {
    for (const { product, quantity } of order) {
      await homePage.open();
      await homePage.search('pliers');
      await homePage.openProduct(product.name);
      expect(await productPage.price()).toBe(product.price);
      await productPage.addToCart(quantity);
    }
  });

  const expectedTotal = cents(order.reduce((sum, o) => sum + o.product.price * o.quantity, 0));

  await test.step('the cart shows correct lines and total', async () => {
    await productPage.header.openCart();
    const lines = await checkoutPage.readLines();
    expect(lines.map((l) => ({ title: l.title, quantity: l.quantity, unitPrice: l.unitPrice }))).toEqual(
      order.map((o) => ({ title: o.product.name, quantity: o.quantity, unitPrice: o.product.price })),
    );
    for (const line of lines) expect(line.lineTotal).toBe(cents(line.unitPrice * line.quantity));
    expect(await checkoutPage.total()).toBe(expectedTotal);
  });

  let invoiceNumber = '';
  await test.step('check out with the address from the profile', async () => {
    await checkoutPage.proceedFromCart();
    await checkoutPage.proceedAsLoggedInUser();
    await expect(checkoutPage.address.city).toHaveValue(newCustomer.lookup.city);
    await expect(checkoutPage.address.postcode).toHaveValue(newCustomer.lookup.postcode);
    await checkoutPage.proceedToPayment();
    invoiceNumber = await checkoutPage.payAndPlaceOrder('cash-on-delivery');
  });

  await test.step('the stored invoice matches what the customer saw', async () => {
    const stored = (await newCustomer.api.invoices.list()).data.find(
      (i) => i.invoice_number === invoiceNumber,
    );
    expect(stored, `invoice ${invoiceNumber} in the customer's invoice list`).toBeDefined();
    const invoice = await newCustomer.api.invoices.get(stored!.id);

    expect(invoice.total).toBe(expectedTotal);
    expect(invoice.billing_city).toBe(newCustomer.lookup.city);
    expect(
      invoice
        .invoicelines!.map((l) => ({ id: l.product_id, qty: l.quantity }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual(
      order.map((o) => ({ id: o.product.id, qty: o.quantity })).sort((a, b) => a.id.localeCompare(b.id)),
    );
    await expect(customerPage.getByText(invoiceNumber)).toBeVisible();
  });
});
