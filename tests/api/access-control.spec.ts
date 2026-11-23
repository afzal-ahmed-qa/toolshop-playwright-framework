import { test, expect } from '@fixtures/index';
import { env } from '@config/env';
import { raw, type HttpMethod } from '@api/raw';
import { toBillingAddress } from '@data/factories';
import type { ToolshopApi } from '@api/ToolshopApi';
import { expectKnownDefect } from '@fixtures/known-defect';

type Role = 'anonymous' | 'invalid token' | 'customer' | 'admin';

async function tokenFor(role: Role, api: ToolshopApi): Promise<string | undefined> {
  switch (role) {
    case 'anonymous':
      return undefined;
    case 'invalid token':
      return 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJub2JvZHkifQ.invalid';
    case 'customer':
      return api.auth.login(env.customer.email, env.customer.password);
    case 'admin':
      return api.auth.login(env.admin.email, env.admin.password);
  }
}

/** Who may call what. One row per rule; the status code is the whole assertion. */
const rules: { id: string; method: HttpMethod; path: string; as: Role; status: number }[] = [
  { id: 'AC-01', method: 'GET', path: 'users', as: 'anonymous', status: 401 },
  { id: 'AC-02', method: 'GET', path: 'users', as: 'customer', status: 403 },
  { id: 'AC-03', method: 'GET', path: 'users', as: 'admin', status: 200 },
  { id: 'AC-04', method: 'GET', path: 'invoices', as: 'anonymous', status: 401 },
  { id: 'AC-05', method: 'GET', path: 'users/me', as: 'invalid token', status: 401 },
  { id: 'AC-06', method: 'DELETE', path: 'products/{any}', as: 'customer', status: 403 },
];

test.describe('Access control @api', () => {
  for (const rule of rules) {
    test(`${rule.id} ${rule.method} /${rule.path} as ${rule.as} → ${rule.status}`, async ({ api }) => {
      const [product] = (await api.products.list()).data;
      const path = rule.path.replace('{any}', product!.id);
      const res = await raw(api.products.request, rule.method, path, { token: await tokenFor(rule.as, api) });
      expect(res.status(), await res.text()).toBe(rule.status);
    });
  }

  test("AC-07 a customer cannot read another customer's invoice", async ({ api, newCustomer }) => {
    const [product] = (await api.products.list()).data.filter((p) => p.in_stock);
    const cartId = await api.carts.create();
    await api.carts.add(cartId, product!.id, 1);
    const invoice = await newCustomer.api.invoices.create(cartId, toBillingAddress(newCustomer.lookup));

    const otherCustomer = await tokenFor('customer', api);
    const res = await raw(api.products.request, 'GET', `invoices/${invoice.id}`, { token: otherCustomer });
    // 404 rather than 403 is fine: it does not even confirm the invoice exists.
    expect(res.status()).toBe(404);
  });

  for (const [id, role, status] of [
    ['AC-08', 'anonymous', 401],
    ['AC-09', 'customer', 403],
  ] as const) {
    test(`${id} only admins may create products (as ${role} → ${status})`, async ({ api, cleanup }) => {
      const template = (await api.products.list()).data[0]!;
      const res = await raw(api.products.request, 'POST', 'products', {
        token: await tokenFor(role, api),
        data: {
          name: `AC probe ${Date.now()}`,
          description: 'Created by an access-control test; deleted at once.',
          price: 1.23,
          category_id: template.category.id,
          brand_id: template.brand.id,
          product_image_id: template.product_image!.id,
          is_location_offer: false,
          is_rental: false,
          co2_rating: 'C',
        },
      });
      // While the defect exists the product really gets created: remove it again.
      // eslint-disable-next-line playwright/no-conditional-in-test -- clean-up only, not an assertion
      if (res.status() === 201) cleanup.product(((await res.json()) as { id: string }).id);
      await expectKnownDefect(
        'DEF-01',
        'POST /products is open to anonymous users and customers',
        async () => {
          expect(res.status()).toBe(status);
        },
      );
    });
  }
});
