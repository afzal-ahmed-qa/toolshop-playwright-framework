import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

/** /admin/products: the product list with search, edit and delete. */
export class AdminProductsPage extends BasePage {
  readonly searchInput = this.page.getByTestId('product-search-query');
  readonly addButton = this.page.getByTestId('product-add');

  async open() {
    await this.page.goto('/admin/products');
    await expect(this.addButton).toBeVisible();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.page.getByTestId('product-search-submit').click();
  }

  row(productId: string): Locator {
    return this.page.locator('tr').filter({ has: this.page.getByTestId(`product-edit-${productId}`) });
  }

  /**
   * Opens the edit form and waits until it has received the product.
   * The form fills its fields when that response arrives; typing earlier gets
   * overwritten by the loaded values.
   */
  async edit(productId: string) {
    const loaded = this.page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().endsWith(`/products/${productId}`),
    );
    await this.page.getByTestId(`product-edit-${productId}`).click();
    await expect(this.page).toHaveURL(new RegExp(`/admin/products/edit/${productId}$`));
    await loaded;
  }

  /** Deletes through the UI and waits for the API to confirm it. */
  async delete(productId: string) {
    this.page.once('dialog', (d) => d.accept());
    const response = this.page.waitForResponse(
      (r) => r.request().method() === 'DELETE' && r.url().endsWith(`/products/${productId}`),
    );
    await this.page.getByTestId(`product-delete-${productId}`).click();
    expect((await response).status()).toBe(204);
    await expect(this.row(productId)).toHaveCount(0);
  }
}
