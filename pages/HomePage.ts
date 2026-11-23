import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { ProductCard } from './components/ProductCard';

export type SortOption = 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';

/** The shop front: product grid with search, filters, sorting and pagination. */
export class HomePage extends BasePage {
  readonly searchInput = this.page.getByTestId('search-query');
  readonly searchCaption = this.page.getByTestId('search-caption');
  readonly searchResultCount = this.page.getByTestId('search-result-count');
  readonly sortSelect = this.page.getByTestId('sort');
  readonly nextPage = this.page.getByTestId('pagination-next');
  readonly previousPage = this.page.getByTestId('pagination-prev');
  readonly cards: Locator = this.page.locator('a[data-test^="product-"]');

  async open() {
    await this.waitForProducts(() => this.page.goto('/'));
    await this.expectLoaded();
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
    await this.expectLoaded();
    const count = await this.cards.count();
    return Promise.all(Array.from({ length: count }, (_, i) => this.card(i).read()));
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.waitForProducts(() => this.page.getByTestId('search-submit').click());
    await expect(this.page.getByTestId('search-term')).toHaveText(term);
  }

  async sortBy(option: SortOption) {
    await this.waitForProducts(() => this.sortSelect.selectOption(option));
  }

  /** Category and brand filters are checkboxes keyed by their API id. */
  async toggleCategory(categoryId: string) {
    await this.waitForProducts(() => this.page.getByTestId(`category-${categoryId}`).click());
  }

  async toggleBrand(brandId: string) {
    await this.waitForProducts(() => this.page.getByTestId(`brand-${brandId}`).click());
  }

  async goToNextPage() {
    await this.waitForProducts(() => this.nextPage.click());
  }

  async openProduct(name: string) {
    await this.cardByName(name).root.click();
    await expect(this.page).toHaveURL(/\/product\//);
  }
}
