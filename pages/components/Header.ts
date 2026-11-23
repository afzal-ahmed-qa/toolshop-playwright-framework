import { expect, type Locator, type Page } from '@playwright/test';

/** Top navigation, shown on every page. */
export class Header {
  readonly cartLink: Locator;
  readonly cartQuantity: Locator;
  readonly signInLink: Locator;
  readonly userMenu: Locator;

  constructor(private readonly page: Page) {
    this.cartLink = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
    this.signInLink = page.getByTestId('nav-sign-in');
    this.userMenu = page.getByTestId('nav-menu');
  }

  async openCart() {
    await this.cartLink.click();
    await expect(this.page).toHaveURL(/\/checkout$/);
  }

  async signOut() {
    await this.userMenu.click();
    await this.page.getByTestId('nav-sign-out').click();
    await expect(this.signInLink).toBeVisible();
  }
}
