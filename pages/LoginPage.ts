import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly email = this.page.getByTestId('email');
  readonly password = this.page.getByTestId('password');
  readonly submit = this.page.getByTestId('login-submit');
  readonly error = this.page.getByTestId('login-error');

  async open() {
    await this.page.goto('/auth/login');
    await expect(this.submit).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
