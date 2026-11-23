import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { env } from '@config/env';
import { raw } from '@api/raw';
import { expectKnownDefect } from '@fixtures/known-defect';
import { uniqueEmail } from '@data/factories';

/**
 * Defects in the "sprint5-with-bugs" build of Toolshop (docs/defects.md, WB-01..07).
 * Only runs with ENV=with-bugs; the nightly CI job does that.
 *
 * This build uses an older API format (numeric ids, a flat address), so these
 * tests use raw requests instead of the typed client and its sprint 5 contracts.
 * Each test asserts the CORRECT behaviour inside expectKnownDefect().
 */
type Fixtures = { request: APIRequestContext; adminToken: string; customerToken: string; tempUser: TempUser };
type TempUser = { id: number; email: string; password: string; body: Record<string, unknown> };

const PASSWORD = 'Str0ng!Pass#2026';

const test = base.extend<Fixtures>({
  request: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: `${env.apiURL}/` });
    await use(request);
    await request.dispose();
  },
  adminToken: async ({ request }, use) => {
    const res = await raw(request, 'POST', 'users/login', { data: env.admin });
    await use((await res.json()).access_token);
  },
  customerToken: async ({ request }, use) => {
    const res = await raw(request, 'POST', 'users/login', { data: env.customer });
    await use((await res.json()).access_token);
  },
  /** A fresh user in the old format; deleted again by the admin afterwards. */
  tempUser: async ({ request, adminToken }, use) => {
    const body = {
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      dob: '1990-05-17',
      phone: '0123456789',
      email: uniqueEmail('wb'),
      password: PASSWORD,
      address: 'Marienplatz 1',
      city: 'Munich',
      state: 'Bavaria',
      country: 'DE',
      postcode: '80331',
    };
    const res = await raw(request, 'POST', 'users/register', { data: body });
    expect(res.status(), await res.text()).toBe(201);
    const id = (await res.json()).id as number;
    await use({ id, email: body.email, password: PASSWORD, body });
    await raw(request, 'DELETE', `users/${id}`, { token: adminToken });
  },
});

test.describe('Defects in the with-bugs build @defects', () => {
  test.skip(env.name !== 'with-bugs', 'Runs only against the with-bugs build (ENV=with-bugs)');

  test('WB-01 the profile endpoint does not expose the password hash', async ({ request, customerToken }) => {
    const me = await (await raw(request, 'GET', 'users/me', { token: customerToken })).json();
    expect(me.email).toBe(env.customer.email);
    await expectKnownDefect(
      'WB-01',
      '/users/me returns password, role and failed_login_attempts',
      async () => {
        expect(Object.keys(me)).not.toContain('password');
        expect(Object.keys(me)).not.toContain('failed_login_attempts');
      },
    );
  });

  test('WB-02 login tokens expire within an hour', async ({ request }) => {
    const login = await (await raw(request, 'POST', 'users/login', { data: env.customer })).json();
    expect(login.access_token).toBeTruthy();
    await expectKnownDefect(
      'WB-02',
      'tokens live 15,600,000 s (about 180 days); sprint 5 uses 300 s',
      async () => {
        expect(login.expires_in).toBeLessThanOrEqual(3600);
      },
    );
  });

  test('WB-03 a customer cannot list or read other users', async ({ request, customerToken }) => {
    const list = await raw(request, 'GET', 'users', { token: customerToken });
    const admin = await raw(request, 'GET', 'users/1', { token: customerToken });
    await expectKnownDefect(
      'WB-03',
      'customers get every user, incl. the admin and password hashes',
      async () => {
        expect(list.status()).toBe(403);
        expect(admin.status()).toBe(403);
      },
    );
  });

  test('WB-04 invoices are not readable without logging in', async ({ request }) => {
    const res = await raw(request, 'GET', 'invoices');
    await expectKnownDefect(
      'WB-04',
      'GET /invoices answers 200 with customer invoices and addresses',
      async () => {
        expect(res.status()).toBe(401);
      },
    );
  });

  test('WB-05 registration rejects an invalid e-mail address', async ({ request, adminToken }) => {
    const res = await raw(request, 'POST', 'users/register', {
      data: { ...validUser(), email: 'not-an-email' },
    });
    const body = await res.json();
    // While the defect exists the user really gets created: remove it again.
    // eslint-disable-next-line playwright/no-conditional-in-test -- clean-up only, not an assertion
    if (res.status() === 201) await raw(request, 'DELETE', `users/${body.id}`, { token: adminToken });
    await expectKnownDefect(
      'WB-05',
      '"not-an-email" is accepted and the response contains the password hash',
      async () => {
        expect(res.status()).toBe(422);
      },
    );
  });

  test('WB-06 the registration response returns the phone number as entered', async ({
    request,
    adminToken,
  }) => {
    const res = await raw(request, 'POST', 'users/register', { data: validUser() });
    expect(res.status()).toBe(201);
    const created = await res.json();
    await raw(request, 'DELETE', `users/${created.id}`, { token: adminToken });
    // The stored profile is correct ("0123456789"); only this response is wrong.
    await expectKnownDefect(
      'WB-06',
      'the response has phone 123456789, a number without the leading zero',
      async () => {
        expect(created.phone).toBe('0123456789');
      },
    );
  });

  test('WB-07 an account is locked after repeated wrong passwords', async ({ request, tempUser }) => {
    for (let i = 1; i <= 4; i++) {
      await raw(request, 'POST', 'users/login', { data: { email: tempUser.email, password: `wrong-${i}` } });
    }
    const res = await raw(request, 'POST', 'users/login', {
      data: { email: tempUser.email, password: tempUser.password },
    });
    await expectKnownDefect('WB-07', 'no lockout; sprint 5 locks after 3 failures with 423', async () => {
      expect(res.status()).toBe(423);
    });
  });
});

function validUser() {
  return {
    first_name: 'Test',
    last_name: 'User',
    dob: '1990-05-17',
    phone: '0123456789',
    email: uniqueEmail('wb'),
    password: PASSWORD,
    address: 'Marienplatz 1',
    city: 'Munich',
    state: 'Bavaria',
    country: 'DE',
    postcode: '80331',
  };
}
