import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { parseMoney } from './money';
import type { PaymentMethod } from '@api/InvoicesApi';

export type CartLine = { title: string; quantity: number; unitPrice: number; lineTotal: number };

/**
 * The four-step checkout wizard: Cart → Sign in → Billing address → Payment.
 * All steps live on /checkout; each method checks it is on the right step first.
 */
export class CheckoutPage extends BasePage {
  readonly rows: Locator = this.page
    .locator('table tbody tr')
    .filter({ has: this.page.getByTestId('product-title') });
  readonly cartTotal = this.page.getByTestId('cart-total');
  readonly confirmation = this.page.locator('#order-confirmation');

  readonly address = {
    country: this.page.getByTestId('country'),
    postcode: this.page.getByTestId('postal_code'),
    houseNumber: this.page.getByTestId('house_number'),
    street: this.page.getByTestId('street'),
    city: this.page.getByTestId('city'),
    state: this.page.getByTestId('state'),
  };

  readonly paymentMethod = this.page.getByTestId('payment-method');
  readonly paymentSuccess = this.page.getByTestId('payment-success-message');

  async open() {
    await this.page.goto('/checkout');
    await expect(this.page.getByTestId('proceed-1')).toBeVisible();
  }

  async readLines(): Promise<CartLine[]> {
    await expect(this.rows.first()).toBeVisible();
    const lines: CartLine[] = [];
    for (const row of await this.rows.all()) {
      lines.push({
        title: (await row.getByTestId('product-title').innerText()).trim(),
        quantity: Number(await row.getByTestId('product-quantity').inputValue()),
        unitPrice: parseMoney(await row.getByTestId('product-price').innerText()),
        lineTotal: parseMoney(await row.getByTestId('line-price').innerText()),
      });
    }
    return lines;
  }

  async total(): Promise<number> {
    return parseMoney(await this.cartTotal.innerText());
  }

  /** Step 1 → 2. For a logged-in user step 2 only shows a "proceed" button. */
  async proceedFromCart() {
    await this.page.getByTestId('proceed-1').click();
  }

  async proceedAsLoggedInUser() {
    await this.page.getByTestId('proceed-2').click();
    await expect(this.address.postcode).toBeVisible();
  }

  async fillAddress(a: {
    country: string;
    postcode: string;
    houseNumber: string;
    street: string;
    city: string;
    state: string;
  }) {
    await this.address.country.selectOption(a.country);
    await this.address.postcode.fill(a.postcode);
    await this.address.houseNumber.fill(a.houseNumber);
    await this.address.street.fill(a.street);
    await this.address.city.fill(a.city);
    await this.address.state.fill(a.state);
  }

  async proceedToPayment() {
    await this.page.getByTestId('proceed-3').click();
    await expect(this.paymentMethod).toBeVisible();
  }

  /** Confirms payment, then places the order. Returns the invoice number shown to the customer. */
  async payAndPlaceOrder(method: PaymentMethod = 'cash-on-delivery'): Promise<string> {
    await this.paymentMethod.selectOption(method);
    await this.page.getByTestId('finish').click();
    await expect(this.paymentSuccess).toHaveText('Payment was successful');
    await this.page.getByTestId('finish').click();
    const message = this.page.getByText(/Thanks for your order! Your invoice number is INV-\d+/);
    await expect(message).toBeVisible();
    return (await message.innerText()).match(/INV-\d+/)![0];
  }
}
