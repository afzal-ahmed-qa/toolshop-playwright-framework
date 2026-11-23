import { test, expect } from '@fixtures/index';
import type { GridResults } from '@pages/BasePage';
import type { Category } from '@api/schemas';

/**
 * Search, filters, sorting and pagination.
 * Each test checks two things:
 *   1. the rule itself (sorted, filtered, matching) on the data the shop returned, and
 *   2. that the grid shows exactly that data.
 * Nothing is hard-coded, so the tests hold on the shared public site and on a fresh Docker copy.
 */

const ids = (r: GridResults) => r.data.map((p) => p.id).sort();

/** Depth-first search through the category tree. */
function findCategory(tree: Category[], name: string): Category {
  const flatten = (nodes: Category[]): Category[] => nodes.flatMap((c) => [c, ...flatten(c.sub_categories)]);
  const match = flatten(tree).find((c) => c.name === name);
  if (!match) throw new Error(`Category "${name}" not found`);
  return match;
}

test.describe('Search', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  const terms = [
    { id: 'SRCH-01', term: 'pliers' },
    { id: 'SRCH-02', term: 'hammer' },
    { id: 'SRCH-03', term: 'saw' },
    { id: 'SRCH-04', term: 'plie', note: 'part of a word' },
  ];

  for (const { id, term, note } of terms) {
    test(`${id} search "${term}"${note ? ` (${note})` : ''} shows only matching products`, async ({
      homePage,
    }) => {
      const results = await homePage.search(term);
      expect(results.total).toBeGreaterThan(0);
      for (const p of results.data) expect(p.name.toLowerCase()).toContain(term);
      await expect(homePage.searchResultCount).toHaveText(
        new RegExp(`^\\s*${results.total} products? found for '${term}'\\s*$`),
      );
      await homePage.expectMatches(results);
    });
  }

  test('SRCH-05 search ignores upper and lower case', async ({ homePage, api }) => {
    const results = await homePage.search('PLIERS');
    expect(ids(results)).toEqual((await api.products.search('pliers')).data.map((p) => p.id).sort());
    await homePage.expectMatches(results);
  });

  test('SRCH-06 a term without matches says so', async ({ homePage }) => {
    const results = await homePage.search('zzqxw');
    expect(results.total).toBe(0);
    await expect(homePage.noResults).toHaveText('There are no products found.');
    await expect(homePage.searchResultCount).toContainText("0 products found for 'zzqxw'");
    await expect(homePage.cards).toHaveCount(0);
  });

  test('SRCH-07 HTML in the search term is shown as text, not run', async ({ page, homePage }) => {
    const payload = '<img src=x onerror=alert(1)>';
    let dialogOpened = false;
    page.on('dialog', async (d) => {
      dialogOpened = true;
      await d.dismiss();
    });
    await homePage.search(payload);
    await expect(homePage.searchTerm).toHaveText(payload);
    expect(dialogOpened).toBe(false);
  });
});

test.describe('Filters', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  for (const [id, name] of [
    ['FLT-01', 'Pliers'],
    ['FLT-02', 'Hammer'],
    ['FLT-03', 'Hand Saw'],
  ] as const) {
    test(`${id} category "${name}" shows only products of that category`, async ({ homePage, api }) => {
      const category = findCategory(await api.products.categoryTree(), name);
      const results = await homePage.toggleCategory(category.id);
      expect(results.total).toBeGreaterThan(0);
      for (const p of results.data) expect(p.category.id).toBe(category.id);
      await homePage.expectMatches(results);
    });
  }

  test('FLT-04 a brand filter shows only that brand', async ({ homePage, api }) => {
    const [brand] = await api.products.brands();
    const results = await homePage.toggleBrand(brand!.id);
    for (const p of results.data) expect(p.brand.id).toBe(brand!.id);
    await homePage.expectMatches(results);
  });

  test('FLT-05 category and brand together narrow the list to both', async ({ homePage, api }) => {
    const category = findCategory(await api.products.categoryTree(), 'Pliers');
    const [brand] = await api.products.brands();
    const byCategory = await homePage.toggleCategory(category.id);
    const both = await homePage.toggleBrand(brand!.id);
    expect(both.total).toBeLessThanOrEqual(byCategory.total);
    for (const p of both.data) {
      expect(p.category.id).toBe(category.id);
      expect(p.brand.id).toBe(brand!.id);
    }
    await homePage.expectMatches(both);
  });
});

test.describe('Sorting and pagination', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  const byName = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' });
  const sorts = [
    {
      id: 'SORT-01',
      option: 'name,asc',
      ordered: (r: GridResults) => r.data.map((p) => p.name),
      cmp: byName,
    },
    {
      id: 'SORT-02',
      option: 'name,desc',
      ordered: (r: GridResults) => r.data.map((p) => p.name),
      cmp: (a: string, b: string) => byName(b, a),
    },
    {
      id: 'SORT-03',
      option: 'price,asc',
      ordered: (r: GridResults) => r.data.map((p) => p.price),
      cmp: (a: number, b: number) => a - b,
    },
    {
      id: 'SORT-04',
      option: 'price,desc',
      ordered: (r: GridResults) => r.data.map((p) => p.price),
      cmp: (a: number, b: number) => b - a,
    },
  ] as const;

  for (const { id, option, ordered, cmp } of sorts) {
    test(`${id} sort by ${option.replace(',', ' ')}`, async ({ homePage }) => {
      const results = await homePage.sortBy(option);
      const values = ordered(results) as (string | number)[];
      const compare = cmp as (a: string | number, b: string | number) => number;
      expect(values).toEqual([...values].sort(compare));
      await homePage.expectMatches(results);
    });
  }

  test('PAGE-01 the second page shows the next products, none repeated', async ({ homePage }) => {
    const first = await homePage.sortBy('name,asc');
    test.skip(first.last_page < 2, 'Needs more than one page of products');
    const second = await homePage.goToNextPage();
    expect(second.current_page).toBe(2);
    expect(ids(second).filter((id) => ids(first).includes(id))).toEqual([]);
    await homePage.expectMatches(second);
  });
});
