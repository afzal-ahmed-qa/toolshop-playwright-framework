import { test, expect } from '@fixtures/index';
import { toBillingAddress } from '@data/factories';

/**
 * Proves the building blocks work: API client, contracts, a registered
 * customer and an order placed without any UI.
 */
test.describe('API client @api', () => {
  test('API-01 product list matches its contract and paginates @smoke', async ({ api }) => {
    const page = await api.products.list();
    expect(page.data.length).toBeGreaterThan(0);
    expect(page.data.length).toBeLessThanOrEqual(page.per_page);
    expect(page.last_page).toBe(Math.ceil(page.total / page.per_page));
  });

  test('API-02 a fetched product equals the one in the list', async ({ api }) => {
    const [first] = (await api.products.list()).data;
    const product = await api.products.get(first!.id);
    expect(product).toEqual(first);
  });

  test('API-03 a new customer can log in and read their profile', async ({ newCustomer }) => {
    const me = await newCustomer.api.auth.me();
    expect(me).toMatchObject({
      id: newCustomer.id,
      email: newCustomer.email,
      first_name: newCustomer.first_name,
    });
  });

  test('API-04 a customer orders through the API and the invoice adds up', async ({ api, newCustomer }) => {
    const [a, b] = (await api.products.list({ sort: 'price,asc' })).data.filter((p) => p.in_stock);
    const cartId = await api.carts.create();
    await api.carts.add(cartId, a!.id, 2);
    await api.carts.add(cartId, b!.id, 1);

    const created = await newCustomer.api.invoices.create(cartId, toBillingAddress(newCustomer.lookup));
    const invoice = await newCustomer.api.invoices.get(created.id);

    const expected = a!.price * 2 + b!.price;
    expect(invoice.total).toBeCloseTo(expected, 2);
    expect(invoice.invoicelines).toHaveLength(2);
    expect(invoice.user_id).toBe(newCustomer.id);
  });
});
