import { faker } from '@faker-js/faker';
import type { NewUser } from '@api/AuthApi';
import type { NewProduct } from '@api/ProductsApi';
import type { PostcodeLookup } from '@api/schemas';
import type { BillingAddress } from '@api/InvoicesApi';

/**
 * Builders for test data. Every value can be overridden; the rest is random
 * but valid, so parallel tests never share an e-mail or a product name.
 */

/** Marks data created by this suite, so it is easy to find and clean up. */
export const RUN_TAG = `pw${Date.now().toString(36)}`;

export function uniqueEmail(prefix = 'customer'): string {
  return `${prefix}.${RUN_TAG}.${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

/** Meets the Toolshop password rules: 8+ chars, upper, lower, digit, symbol. */
export function strongPassword(): string {
  return `${faker.string.alpha({ length: 4, casing: 'upper' })}${faker.string.alpha({ length: 4, casing: 'lower' })}${faker.string.numeric(3)}!#`;
}

export function buildUser(address: PostcodeLookup, overrides: Partial<NewUser> = {}): NewUser {
  return {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    dob: faker.date.birthdate({ mode: 'age', min: 20, max: 70 }).toISOString().slice(0, 10),
    phone: faker.string.numeric(10),
    email: uniqueEmail(),
    password: strongPassword(),
    address: {
      street: address.street,
      house_number: address.house_number,
      city: address.city,
      state: address.state,
      country: address.country,
      postal_code: address.postcode,
    },
    ...overrides,
  };
}

export function toBillingAddress(address: PostcodeLookup): BillingAddress {
  return {
    billing_street: `${address.street} ${address.house_number}`,
    billing_city: address.city,
    billing_state: address.state,
    billing_country: address.country,
    billing_postal_code: address.postcode,
  };
}

export function buildProduct(
  refs: Pick<NewProduct, 'category_id' | 'brand_id' | 'product_image_id'>,
  overrides: Partial<NewProduct> = {},
): NewProduct {
  return {
    name: `${faker.commerce.productAdjective()} ${faker.commerce.product()} ${RUN_TAG}`,
    description: faker.commerce.productDescription(),
    price: Number(faker.commerce.price({ min: 5, max: 200 })),
    is_location_offer: false,
    is_rental: false,
    co2_rating: 'B',
    stock: 25,
    ...refs,
    ...overrides,
  };
}

/** German postcodes the lookup knows. One is picked per customer. */
export const GERMAN_POSTCODES = ['80331', '10115', '20095', '50667', '60311'] as const;
