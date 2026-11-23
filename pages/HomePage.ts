import { expect, type Locator } from '@playwright/test';
import { BasePage, type GridResults } from './BasePage';
import { ProductCard } from './components/ProductCard';

export type SortOption = 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';

/** The shop front: product grid with search, filters, sorting and pagination. */
export class HomePage extends BasePage {
  readonly searchInput = this.page.getByTestId('search-query');
  readonly searchTerm = this.page.getByTestId('search-term');
  readonly searchResultCount = this.page.getByTestId('search-result-count');
  readonly noResults = this.page.getByTestId('no-results');
  readonly sortSelect = this.page.getByTestId('sort');
  readonly nextPage = this.page.getByTestId('pagination-next');
  readonly skeletons = this.page.locator('.card.skeleton');
  readonly cards: Locator = this.page.locator('a[data-test^="product-"]');

  /** Opens the shop and returns the first page of products it loaded. */
  async open(): Promise<GridResults> {
    const results = await this.waitForProducts(() => this.page.goto('/'));
    await this.expectLoaded();
    return results;
  }

  async expectLoaded() {
    await expect(this.cards.first()).toBeVisible();
  }

  card(index: number) {
    return new ProductCard(this.cards.nth(index));
  }

  cardByName(name: string) {
    return new ProductCard(
      this.cards.filter({ has: this.page.getByTestId('product-name').getByText(name, { exact: true }) }),
    );
  }

  /** Everything the grid currently shows, in display order. */
  async readCards() {
    const count = await this.cards.count();
    return Promise.all(Array.from({ length: count }, (_, i) => this.card(i).read()));
  }

  /** The grid shows exactly the products of `results`, in the same order and with the same prices. */
  async expectMatches(results: GridResults) {
    await expect(this.cards).toHaveCount(results.data.length);
    const shown = await this.readCards();
    expect(shown.map(({ id, name, price }) => ({ id, name, price }))).toEqual(
      results.data.map(({ id, name, price }) => ({ id, name: name.trim(), price })),
    );
  }

  async search(term: string): Promise<GridResults> {
    await this.searchInput.fill(term);
    const results = await this.waitForProducts(() => this.page.getByTestId('search-submit').click());
    await expect(this.searchTerm).toHaveText(term);
    return results;
  }

  async sortBy(option: SortOption): Promise<GridResults> {
    return this.waitForProducts(() => this.sortSelect.selectOption(option));
  }

  /** Category and brand filters are checkboxes keyed by their API id. */
  async toggleCategory(categoryId: string): Promise<GridResults> {
    return this.waitForProducts(() => this.page.getByTestId(`category-${categoryId}`).click());
  }

  async toggleBrand(brandId: string): Promise<GridResults> {
    return this.waitForProducts(() => this.page.getByTestId(`brand-${brandId}`).click());
  }

  async goToNextPage(): Promise<GridResults> {
    return this.waitForProducts(() => this.nextPage.click());
  }

  async openProduct(name: string) {
    await this.cardByName(name).root.click();
    await expect(this.page).toHaveURL(/\/product\//);
  }
}
