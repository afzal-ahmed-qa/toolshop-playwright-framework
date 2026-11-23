import { test, expect } from '@fixtures/index';
import type { Category } from '@api/schemas';
import { toBillingAddress } from '@data/factories';

/**
 * Contract tests. Every client method parses its response with a zod schema
 * (api/schemas.ts), so calling the method IS the contract check; these tests add
 * the rules a schema cannot express, such as links between fields.
 */
test.describe('API contracts @api', () => {
  test('CON-01 brands have unique ids and slugs', async ({ api }) => {
    const brands = await api.products.brands();
    expect(brands.length).toBeGreaterThan(0);
    expect(new Set(brands.map((b) => b.id)).size).toBe(brands.length);
    expect(new Set(brands.map((b) => b.slug)).size).toBe(brands.length);
  });

  test('CON-02 every sub-category points back to its parent', async ({ api }) => {
    const tree = await api.products.categoryTree();
    const check = (nodes: Category[], parentId: string | null) => {
      for (const node of nodes) {
        expect(node.parent_id, `${node.name}.parent_id`).toBe(parentId);
        check(node.sub_categories, node.id);
      }
    };
    check(tree, null);
  });

  test('CON-03 pagination fields agree with each other on every page', async ({ api }) => {
    const first = await api.products.list();
    for (let page = 1; page <= Math.min(first.last_page, 3); page++) {
      const p = await api.products.list({ page });
      expect(p.current_page).toBe(page);
      expect(p.last_page).toBe(Math.ceil(p.total / p.per_page));
      expect(p.to! - p.from! + 1).toBe(p.data.length);
      expect(p.from).toBe((page - 1) * p.per_page + 1);
    }
  });

  test('CON-04 a product detail matches the same product in the list', async ({ api }) => {
    const [listed] = (await api.products.list({ sort: 'name,asc' })).data;
    expect(await api.products.get(listed!.id)).toEqual(listed);
  });

  test('CON-05 search results follow the search contract', async ({ api }) => {
    const results = await api.products.search('hammer');
    expect(results.total).toBeGreaterThan(0);
    for (const p of results.data) expect(p.name.toLowerCase()).toContain('hammer');
  });

  test('CON-06 the profile of a new customer matches what was registered', async ({ newCustomer }) => {
    const me = await newCustomer.api.auth.me();
    expect(me).toMatchObject({
      first_name: newCustomer.first_name,
      last_name: newCustomer.last_name,
      email: newCustomer.email,
      dob: newCustomer.dob,
      address: { city: newCustomer.lookup.city, postal_code: newCustomer.lookup.postcode },
    });
  });

  test('CON-07 an invoice and its lines follow the contract and add up', async ({ api, newCustomer }) => {
    const [product] = (await api.products.list()).data.filter((p) => p.in_stock);
    const cartId = await api.carts.create();
    await api.carts.add(cartId, product!.id, 3);
    const created = await newCustomer.api.invoices.create(cartId, toBillingAddress(newCustomer.lookup));

    const invoice = await newCustomer.api.invoices.get(created.id);
    const lineSum = invoice.invoicelines!.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
    expect(invoice.subtotal).toBeCloseTo(lineSum, 2);
    expect((await newCustomer.api.invoices.list()).data.map((i) => i.id)).toContain(created.id);
  });

  test('CON-08 the postcode lookup returns an address in the requested country', async ({ api }) => {
    const address = await api.users.lookupPostcode('DE', '80331');
    expect(address).toMatchObject({ country: 'DE', postcode: '80331' });
    expect(address.city).not.toBe('');
  });
});
