import { test, expect } from '@fixtures/index';
import { env } from '@config/env';
import { raw } from '@api/raw';
import { buildProduct, buildUser } from '@data/factories';
import { expectKnownDefect } from '@fixtures/known-defect';

/** Negative and boundary cases. Each checks the status code and that the error names the right field. */
test.describe('Input validation @api', () => {
  test.describe('cart quantity', () => {
    for (const [id, quantity, message] of [
      ['VAL-01', 0, 'must be at least 1'],
      ['VAL-02', -1, 'must be at least 1'],
      ['VAL-03', 100, 'must not be greater than 99'],
      ['VAL-04', 'abc', 'must be an integer'],
    ] as const) {
      test(`${id} quantity ${JSON.stringify(quantity)} is rejected`, async ({ api }) => {
        const [product] = (await api.products.list()).data;
        const cartId = await api.carts.create();
        const res = await raw(api.carts.request, 'POST', `carts/${cartId}`, {
          data: { product_id: product!.id, quantity },
        });
        expect(res.status()).toBe(422);
        expect((await res.json()).errors.quantity[0]).toContain(message);
        expect((await api.carts.get(cartId)).cart_items).toHaveLength(0);
      });
    }

    test('VAL-05 the boundaries 1 and 99 are accepted', async ({ api }) => {
      const [a, b] = (await api.products.list()).data;
      const cartId = await api.carts.create();
      await api.carts.add(cartId, a!.id, 1);
      await api.carts.add(cartId, b!.id, 99);
      const quantities = (await api.carts.get(cartId)).cart_items
        .map((i) => i.quantity)
        .sort((x, y) => x - y);
      expect(quantities).toEqual([1, 99]);
    });
  });

  test('VAL-06 an unknown product cannot be added to a cart', async ({ api }) => {
    const cartId = await api.carts.create();
    const res = await raw(api.carts.request, 'POST', `carts/${cartId}`, {
      data: { product_id: '01XXXXXXXXXXXXXXXXXXXXXXXX', quantity: 1 },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).errors).toHaveProperty('product_id');
  });

  test('VAL-07 an unknown cart returns 404', async ({ api }) => {
    const res = await raw(api.carts.request, 'GET', 'carts/01XXXXXXXXXXXXXXXXXXXXXXXX');
    expect(res.status()).toBe(404);
  });

  test('VAL-08 an unknown product returns 404', async ({ api }) => {
    const res = await raw(api.products.request, 'GET', 'products/01XXXXXXXXXXXXXXXXXXXXXXXX');
    expect(res.status()).toBe(404);
  });

  test.describe('registration', () => {
    test('VAL-09 missing fields are all reported at once', async ({ api }) => {
      const res = await raw(api.auth.request, 'POST', 'users/register', { data: { email: 'x@example.com' } });
      expect(res.status()).toBe(422);
      expect(Object.keys(await res.json())).toEqual(
        expect.arrayContaining(['first_name', 'last_name', 'password']),
      );
    });

    test('VAL-10 an e-mail address can only be registered once', async ({ api, newCustomer }) => {
      const res = await raw(api.auth.request, 'POST', 'users/register', {
        data: buildUser(newCustomer.lookup, { email: newCustomer.email }),
      });
      expect(res.status()).toBe(409);
      expect((await res.json()).email[0]).toContain('already exists');
    });

    for (const [id, password, reason] of [
      ['VAL-11', 'abc', 'too short'],
      ['VAL-12', 'alllowercase1!', 'no upper case'],
      ['VAL-13', 'NoDigitsHere!!', 'no digit'],
    ] as const) {
      test(`${id} a weak password is rejected (${reason})`, async ({ api }) => {
        const lookup = await api.users.lookupPostcode('DE', '80331');
        const res = await raw(api.auth.request, 'POST', 'users/register', {
          data: buildUser(lookup, { password }),
        });
        expect(res.status()).toBe(422);
        expect((await res.json()).password.length).toBeGreaterThan(0);
      });
    }

    test('VAL-14 customers must be at least 18', async ({ api }) => {
      const lookup = await api.users.lookupPostcode('DE', '80331');
      const tenYearsAgo = new Date(Date.now() - 10 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const res = await raw(api.auth.request, 'POST', 'users/register', {
        data: buildUser(lookup, { dob: tenYearsAgo }),
      });
      expect(res.status()).toBe(422);
      expect((await res.json()).dob[0]).toContain('18 years');
    });
  });

  test('VAL-15 a wrong password is rejected with 401', async ({ api }) => {
    const res = await api.auth.loginRaw(env.customer.email, 'definitely-wrong');
    expect(res.status()).toBe(401);
  });

  test('VAL-16 a page after the last one is empty, not an error', async ({ api }) => {
    const { last_page } = await api.products.list();
    const beyond = await api.products.list({ page: last_page + 5 });
    expect(beyond.data).toEqual([]);
    expect(beyond.current_page).toBe(last_page + 5);
  });

  test('VAL-17 related products of a deleted product return 404', async ({ api, adminApi }) => {
    const template = (await api.products.list()).data[0]!;
    const product = await adminApi.products.create(
      buildProduct({
        category_id: template.category.id,
        brand_id: template.brand.id,
        product_image_id: template.product_image!.id,
      }),
    );
    await adminApi.products.remove(product.id);
    const res = await raw(api.products.request, 'GET', `products/${product.id}/related`);
    await expectKnownDefect('DEF-05', '/related returns 500 for a deleted product', async () => {
      expect(res.status()).toBe(404);
    });
  });
});
