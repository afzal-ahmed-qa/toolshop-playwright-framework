import { test as base, expect, type Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { env } from '@config/env';
import { ToolshopApi } from '@api/ToolshopApi';
import type { NewUser } from '@api/AuthApi';
import type { PostcodeLookup, User } from '@api/schemas';
import { buildUser, GERMAN_POSTCODES } from '@data/factories';
import { HomePage } from '@pages/HomePage';
import { ProductPage } from '@pages/ProductPage';
import { CheckoutPage } from '@pages/CheckoutPage';
import { LoginPage } from '@pages/LoginPage';
import { TOKEN_KEY } from './auth';

export type Customer = NewUser & {
  id: string;
  token: string;
  /** The address the postcode lookup returned; valid for checkout. */
  lookup: PostcodeLookup;
  api: ToolshopApi;
};

type TestFixtures = {
  /** Anonymous API client. */
  api: ToolshopApi;
  /** API client logged in as the seeded admin. */
  adminApi: ToolshopApi;
  /** A brand-new customer, registered through the API and deleted after the test. */
  newCustomer: Customer;
  /** A page where `newCustomer` is already logged in. */
  customerPage: Page;
  homePage: HomePage;
  productPage: ProductPage;
  checkoutPage: CheckoutPage;
  loginPage: LoginPage;
  /**
   * Register things a test creates; they are deleted after the test.
   * Fixture teardown runs even when the test times out, unlike a finally block
   * whose API context may already be closed.
   */
  cleanup: { product(id: string): void };
};

export const test = base.extend<TestFixtures>({
  api: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: `${env.apiURL}/` });
    await use(new ToolshopApi(request));
    await request.dispose();
  },

  adminApi: async ({ api }, use) => {
    await use(await api.loginAs(env.admin.email, env.admin.password));
  },

  newCustomer: async ({ api, adminApi }, use, testInfo) => {
    const postcode = faker.helpers.arrayElement(GERMAN_POSTCODES);
    const lookup = await api.users.lookupPostcode('DE', postcode);
    const data = buildUser(lookup);
    const user: User = await api.auth.register(data);
    const customerApi = await api.loginAs(data.email, data.password);

    await use({ ...data, id: user.id, token: customerApi.token!, lookup, api: customerApi });

    // Customers with orders cannot be deleted. They carry RUN_TAG in their
    // e-mail, and the CI database is reset on every run, so they do not pile up.
    const result = await adminApi.users.remove(user.id);
    if (result === 'kept-has-orders') {
      testInfo.annotations.push({ type: 'cleanup', description: `kept ${data.email}: has orders` });
    }
  },

  customerPage: async ({ page, newCustomer }, use) => {
    await page.addInitScript(
      ([key, token]) => {
        if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, token);
      },
      [TOKEN_KEY, newCustomer.token] as const,
    );
    await use(page);
  },

  cleanup: async ({ adminApi }, use) => {
    const products: string[] = [];
    await use({ product: (id) => products.push(id) });
    for (const id of products) await adminApi.products.remove(id);
  },

  // Page objects use `page`. A test that asks for customerPage gets the same
  // page instance, so page objects see the logged-in customer too.
  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
});

export { expect };
