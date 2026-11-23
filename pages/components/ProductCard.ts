import type { Locator } from '@playwright/test';
import { parseMoney } from '../money';

/** One product tile in the shop grid: <a data-test="product-{id}">. */
export class ProductCard {
  readonly name: Locator;
  readonly price: Locator;
  readonly outOfStock: Locator;

  constructor(readonly root: Locator) {
    this.name = root.getByTestId('product-name');
    this.price = root.getByTestId('product-price');
    this.outOfStock = root.getByTestId('out-of-stock');
  }

  async id(): Promise<string> {
    const attr = await this.root.getAttribute('data-test');
    return attr!.replace(/^product-/, '');
  }

  async read() {
    return {
      id: await this.id(),
      name: (await this.name.innerText()).trim(),
      price: parseMoney(await this.price.innerText()),
      inStock: (await this.outOfStock.count()) === 0,
    };
  }
}
