import type { Page } from '@playwright/test';
import { z } from 'zod';
import { pageOf } from '@api/schemas';
import { Header } from './components/Header';

/**
 * The part of a product the grid needs. The list and search endpoints differ
 * in other fields, so the UI tests only rely on these.
 */
const gridProduct = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  in_stock: z.boolean(),
  category: z.object({ id: z.string() }),
  brand: z.object({ id: z.string() }),
});
export const gridResultsSchema = pageOf(gridProduct);
export type GridResults = z.infer<typeof gridResultsSchema>;

export abstract class BasePage {
  readonly header: Header;

  constructor(readonly page: Page) {
    this.header = new Header(page);
  }

  /**
   * Runs an action and returns the product list the browser received for it.
   * The shop uses GET for search and the HTTP QUERY method for the list, so both count.
   * Tests compare the grid with this exact response, which keeps them correct
   * even while other people change data on the shared site.
   */
  protected async waitForProducts(action: () => Promise<unknown>): Promise<GridResults> {
    const responsePromise = this.page.waitForResponse(
      (r) =>
        /\/products(\/search)?(\?|$)/.test(r.url()) &&
        ['GET', 'QUERY'].includes(r.request().method()) &&
        r.status() === 200,
    );
    await action();
    return gridResultsSchema.parse(await (await responsePromise).json());
  }
}
