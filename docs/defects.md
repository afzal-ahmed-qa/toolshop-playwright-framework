# Defect log – Toolshop (sprint 5)

Defects found while building and running this suite against https://practicesoftwaretesting.com
(API version 5.0). Toolshop is a practice application, so these are recorded for reference
rather than raised with a vendor. Each one is reproducible with the steps below.

| ID     | Title                                                                                     | Severity                             | Found by                 | Status in suite                                    |
| ------ | ----------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------ | -------------------------------------------------- |
| DEF-01 | Products can be created without admin rights, even without logging in                     | Critical (security)                  | API probing for #11      | Expected failure in `access-control.spec.ts`       |
| DEF-02 | Edit product form does not load stock, brand, category and image; Save then does nothing  | Major                                | E2E-02                   | E2E-02 re-enters the fields and adds an annotation |
| DEF-03 | Product data is cached for 2 minutes, so shoppers see old prices after a change           | Major                                | E2E-02                   | Shopper checks use fresh browser contexts          |
| DEF-04 | When the product list fails (HTTP 500), placeholders stay forever and no message is shown | Major                                | MOCK-03                  | Expected failure in `network-mocking.spec.ts`      |
| DEF-05 | `/products/{id}/related` returns 500 for a deleted product instead of 404                 | Minor                                | E2E-02 investigation     | Expected failure in `validation.spec.ts`           |
| DEF-06 | `/products/search` returns the category without `slug`, unlike `/products`                | Minor (API consistency)              | Contract check in E2E-01 | Separate schema `searchProductSchema`              |
| DEF-07 | `POST /products` returns `in_stock` as a number, `GET` returns a boolean                  | Minor (API consistency)              | Contract check in VAL-17 | Separate schema `createdProductSchema`             |
| DEF-08 | "Show password" button has no accessible name                                             | Critical (accessibility, WCAG 4.1.2) | axe scan A11Y-03/04      | Allow-listed in `accessibility.spec.ts`            |
| DEF-09 | Invalid list markup in the category filter and the password rules                         | Serious (accessibility, WCAG 1.3.1)  | axe scan A11Y-01/04      | Allow-listed in `accessibility.spec.ts`            |
| DEF-10 | A rejected order shows no error, only "Payment was successful"                            | Major                                | E2E-03                   | `expectKnownDefect` in `checkout-errors.spec.ts`   |

---

### DEF-01, Products can be created without admin rights, even without logging in

|              |                                                               |
| ------------ | ------------------------------------------------------------- |
| **Endpoint** | `POST /products`                                              |
| **Severity** | Critical: anyone on the internet can add products to the shop |

**Steps**

1. Send `POST /products` with a complete product body and **no** `Authorization` header.
2. Repeat with a customer token (`customer@practicesoftwaretesting.com`).

**Expected:** 401 without a token, 403 for a customer. Only admins may create products.
**Actual:** 201 Created in both cases; the product appears in the shop.
Deleting a product correctly returns 403 for a customer, so the two endpoints are inconsistent.

---

### DEF-02, Edit product form does not load stock, brand, category and image

|              |                                                                                     |
| ------------ | ----------------------------------------------------------------------------------- |
| **Page**     | `/admin/products/edit/{id}`                                                         |
| **Severity** | Major: an admin cannot change a product without knowing and re-entering four fields |

**Steps**

1. Log in as admin, open **Products**, click **Edit** on any product.
2. Change only the price and click **Save**.

**Expected:** the form shows all current values; Save stores the new price and shows "Product saved!".
**Actual:** Name, description and price are filled, but **Stock** is empty and **Brand**, **Category**
and **Image** show no selection. These fields are required, so the form is invalid. Clicking
**Save** sends no request and shows no message; the admin gets no feedback at all.

---

### DEF-03, Shoppers see old product data for up to two minutes

|              |                                                                         |
| ------------ | ----------------------------------------------------------------------- |
| **Endpoint** | `GET /products/{id}`                                                    |
| **Severity** | Major: the product page can show a different price from the one charged |

**Steps**

1. As a shopper, open a product page and note the price.
2. As admin, change the price of that product.
3. As the same shopper, reload the product page.

**Expected:** the new price.
**Actual:** the old price, for up to 120 seconds. The response has
`Cache-Control: max-age=120, public`, so the browser reuses its cached copy.
A shopper who has never opened the product sees the new price at once.

---

### DEF-04, Endless placeholders when the product list fails

|              |                                                                         |
| ------------ | ----------------------------------------------------------------------- |
| **Page**     | `/` (shop front)                                                        |
| **Severity** | Major: the shopper waits forever and has no way to know what went wrong |

**Steps**

1. Make `/products` return HTTP 500 (reproduced with `page.route()` in MOCK-03).
2. Open the shop.

**Expected:** the loading placeholders disappear and a message such as "Something went wrong, please try again" is shown.
**Actual:** eight grey placeholder cards stay on screen indefinitely; no message, no retry.
For comparison, an empty list is handled well: "There are no products found."

---

### DEF-05, Related products return 500 for a deleted product

|              |                              |
| ------------ | ---------------------------- |
| **Endpoint** | `GET /products/{id}/related` |
| **Severity** | Minor                        |

**Steps**

1. As admin, delete a product.
2. Request `GET /products/{deleted id}/related`.

**Expected:** 404, like `GET /products/{deleted id}`.
**Actual:** 500 Internal Server Error.

---

### DEF-06, Search results have a different category shape

|              |                            |
| ------------ | -------------------------- |
| **Endpoint** | `GET /products/search?q=…` |
| **Severity** | Minor (API consistency)    |

**Steps**

1. `GET /products` and look at `data[0].category`.
2. `GET /products/search?q=pliers` and look at `data[0].category`.

**Expected:** the same product shape from both endpoints.
**Actual:** `/products` returns `{ id, name, slug }`; `/products/search` returns `{ id, name }`.
A client that relies on `slug` breaks on search results. Found by the zod contract check.

---

### DEF-07, Create-product response has a different `in_stock` type

|              |                         |
| ------------ | ----------------------- |
| **Endpoint** | `POST /products`        |
| **Severity** | Minor (API consistency) |

**Steps**

1. As admin, `POST /products` with `"stock": 5`.
2. `GET /products/{new id}`.

**Expected:** `in_stock` has the same type in both responses.
**Actual:** the POST response has `"in_stock": 5` (the stock count); the GET response has
`"in_stock": true`. A client that reads the create response as a boolean gets a number.

This was hidden at first: the test that creates a product used `test.fail()`, so the contract
error looked like the expected failure and four products were left on the shared site. The suite
now uses `expectKnownDefect()` (see `fixtures/known-defect.ts`), which only expects the defect
assertion itself to fail.

---

### DEF-08, "Show password" button has no accessible name

|              |                                                              |
| ------------ | ------------------------------------------------------------ |
| **Pages**    | `/auth/login`, `/auth/register`                              |
| **Severity** | Critical (accessibility, WCAG 2.1 – 4.1.2 Name, Role, Value) |

**Steps**

1. Open the login page.
2. Run an axe scan with WCAG 2.1 A/AA rules, or move to the eye button with a screen reader.

**Expected:** the button has a name such as "Show password", and says whether the password is shown.
**Actual:** the button only contains an eye icon with `aria-hidden="true"`. axe reports `button-name`
(critical); a screen reader announces just "button".

---

### DEF-09, Invalid list markup

|              |                                                                                |
| ------------ | ------------------------------------------------------------------------------ |
| **Pages**    | `/` (category filter), `/auth/register` (password rules under `#passwordHelp`) |
| **Severity** | Serious (accessibility, WCAG 2.1 – 1.3.1 Info and Relationships)               |

**Steps**

1. Open the shop front, then the registration page.
2. Run an axe scan with WCAG 2.1 A/AA rules.

**Expected:** `<ul>` elements contain only `<li>` children.
**Actual:** the category filter puts a `<fieldset>` directly inside `<ul>`, and the password rules list
has non-`<li>` children too. Screen readers announce wrong item counts or skip the structure.

---

### DEF-10, A rejected order shows no error message

|              |                                                                       |
| ------------ | --------------------------------------------------------------------- |
| **Page**     | `/checkout`, step 4 (Payment)                                         |
| **Severity** | Major: the customer believes the purchase worked, but no order exists |

**Steps**

1. Log in, add a product to the cart and go to checkout.
2. On the billing address step, change the postcode and type a city that does not belong to it.
3. Choose a payment method, click **Confirm** (payment check), then **Confirm** again (place order).

**Expected:** an error such as "The city does not belong to the selected country", and the
customer can correct the address.
**Actual:** the API answers 422 with that message, but the page keeps showing
"Payment was successful" and the Confirm button. No message, no order, no invoice.

Note: the 422 itself is not always returned. The address check "fails open" when the postcode
service is unavailable (by design, see `AddressMatchesCountry` in the Toolshop source), and then
the order is accepted. E2E-03 therefore mocks the rejection with the real 422 body.

---

## The `sprint5-with-bugs` build

Defects in https://with-bugs.practicesoftwaretesting.com (API
https://api-with-bugs.practicesoftwaretesting.com). This build uses an older API format (numeric
ids, a flat address), so its tests use raw requests: `tests/defects/with-bugs.spec.ts`, run with
`npm run test:with-bugs` and every night in CI. Expected behaviour is taken from the normal sprint 5
build where it exists.

| ID    | Title                                                                                    | Severity            |
| ----- | ---------------------------------------------------------------------------------------- | ------------------- |
| WB-01 | `/users/me` returns the password hash, role and failed-login counter                     | Critical (security) |
| WB-02 | Login tokens are valid for about 180 days (`expires_in` 15,600,000 s; sprint 5: 300 s)   | Major (security)    |
| WB-03 | A customer can list all users and read any user, including the admin and password hashes | Critical (security) |
| WB-04 | `GET /invoices` works without logging in and returns customer invoices and addresses     | Critical (security) |
| WB-05 | Registration accepts `not-an-email` as e-mail and returns the password hash              | Major               |
| WB-06 | The registration response shows phone `0123456789` as the number `123456789`             | Minor               |
| WB-07 | No account lockout; sprint 5 locks after 3 wrong passwords with 423 "Account locked"     | Major (security)    |

**Steps, in short** (all with `Accept: application/json`):

- **WB-01:** log in as `customer@practicesoftwaretesting.com`, `GET /users/me`. The body contains
  `password`, `role`, `enabled` and `failed_login_attempts`.
- **WB-02:** `POST /users/login`; the response has `"expires_in": 15600000`.
- **WB-03:** as that customer, `GET /users` and `GET /users/1`. Both answer 200; the list includes the
  `password` field of every user.
- **WB-04:** `GET /invoices` with no `Authorization` header answers 200 with invoices of user 2.
- **WB-05:** `POST /users/register` with `"email": "not-an-email"` answers 201; the body contains `password`.
- **WB-06:** register with `"phone": "0123456789"`; the response has `"phone": 123456789`.
  `GET /users/me` afterwards shows the correct `"0123456789"`, so only the response is wrong.
- **WB-07:** register a user, log in 4 times with a wrong password, then with the right one: 200.
  On the sprint 5 build the 4th attempt already returns 423.

Checked and **not** a defect in this build: sorting, pagination, search (also case-insensitive),
category filter, password strength and the minimum age of 18.
