import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { parseMoney } from './money';

export class ProductPage extends BasePage {
  readonly name = this.page.getByTestId('product-name');
  readonly unitPrice = this.page.getByTestId('unit-price');
  readonly quantity = this.page.getByTestId('quantity');
  readonly addToCartButton = this.page.getByTestId('add-to-cart');
  readonly toast = this.page.getByRole('alert').filter({ hasText: 'Product added to shopping cart' });

  async open(productId: string) {
    await this.page.goto(`/product/${productId}`);
    await this.expectLoaded();
  }

  async expectLoaded() {
    await expect(this.name).not.toBeEmpty();
    await expect(this.unitPrice).not.toBeEmpty();
  }

  async price(): Promise<number> {
    return parseMoney(await this.unitPrice.innerText());
  }

  /** Adds to cart and waits until the header badge shows the new total quantity. */
  async addToCart(quantity = 1) {
    // The badge only exists once the cart has items; count() does not wait for it.
    const before = (await this.header.cartQuantity.count())
      ? Number(await this.header.cartQuantity.innerText())
      : 0;
    await this.quantity.fill(String(quantity));
    await this.addToCartButton.click();
    await expect(this.toast).toBeVisible();
    await expect(this.header.cartQuantity).toHaveText(String(before + quantity));
  }
}
