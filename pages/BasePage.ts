import type { Page, Response } from '@playwright/test';
import { Header } from './components/Header';

export abstract class BasePage {
  readonly header: Header;

  constructor(readonly page: Page) {
    this.header = new Header(page);
  }

  /**
   * Runs an action and waits for the product list API call it triggers.
   * The shop calls GET /products/... or the newer HTTP QUERY method, so both count.
   */
  protected async waitForProducts(action: () => Promise<unknown>): Promise<Response> {
    const response = this.page.waitForResponse(
      (r) => /\/products(\/search)?(\?|$)/.test(r.url()) && ['GET', 'QUERY'].includes(r.request().method()),
    );
    await action();
    return response;
  }
}
