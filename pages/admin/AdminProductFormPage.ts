import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import type { NewProduct } from '@api/ProductsApi';

/** The add and edit product form; both use the same fields. */
export class AdminProductFormPage extends BasePage {
  readonly fields = {
    name: this.page.getByTestId('name'),
    description: this.page.getByTestId('description'),
    stock: this.page.getByTestId('stock'),
    price: this.page.getByTestId('price'),
    brand: this.page.getByTestId('brand-id'),
    category: this.page.getByTestId('category-id'),
    image: this.page.getByTestId('product-image-id'),
    co2: this.page.getByTestId('co2-rating'),
  };
  readonly saved = this.page.getByRole('alert').filter({ hasText: 'Product saved!' });

  async openNew() {
    await this.page.goto('/admin/products/add');
    await expect(this.fields.name).toBeVisible();
  }

  async fill(product: NewProduct) {
    await this.fields.name.fill(product.name);
    await this.fields.description.fill(product.description);
    await this.fields.stock.fill(String(product.stock ?? 10));
    await this.fields.price.fill(product.price.toFixed(2));
    await this.fields.brand.selectOption(product.brand_id);
    await this.fields.category.selectOption(product.category_id);
    await this.fields.image.selectOption(product.product_image_id);
    await this.fields.co2.selectOption(product.co2_rating);
  }

  /** Waits until the edit form has loaded the product. */
  async expectLoaded() {
    await expect(this.fields.name).not.toHaveValue('');
  }

  async setPrice(price: number) {
    await this.expectLoaded();
    await expect(this.fields.price).not.toHaveValue('');
    await this.fields.price.fill(price.toFixed(2));
  }

  /**
   * The edit form loads name, description and price, but leaves stock, brand,
   * category and image empty. They are required, so Save silently does nothing
   * until they are entered again (DEF-02 in docs/defects.md).
   */
  async reenterFieldsNotLoadedOnEdit(product: NewProduct) {
    await this.fields.stock.fill(String(product.stock ?? 10));
    await this.fields.brand.selectOption(product.brand_id);
    await this.fields.category.selectOption(product.category_id);
    await this.fields.image.selectOption(product.product_image_id);
  }

  /** Saves and returns the product id from the API response (POST for new, PUT for edit). */
  async save(): Promise<string> {
    const response = this.page.waitForResponse(
      (r) => /\/products(\/[\w]+)?$/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()),
    );
    await this.page.getByTestId('product-submit').click();
    const res = await response;
    expect(res.ok(), `save returned ${res.status()}: ${await res.text()}`).toBe(true);
    await expect(this.saved).toBeVisible();
    if (res.request().method() === 'PUT') return res.url().split('/').pop()!;
    return ((await res.json()) as { id: string }).id;
  }
}
