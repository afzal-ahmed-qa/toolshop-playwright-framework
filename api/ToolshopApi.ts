import type { APIRequestContext } from '@playwright/test';
import { AuthApi } from './AuthApi';
import { CartsApi } from './CartsApi';
import { InvoicesApi } from './InvoicesApi';
import { ProductsApi } from './ProductsApi';
import { UsersApi } from './UsersApi';

/**
 * One entry point for all API clients, sharing a request context and token.
 *
 *   const api = new ToolshopApi(request).as(token);
 *   const product = await api.products.get(id);
 */
export class ToolshopApi {
  readonly auth: AuthApi;
  readonly products: ProductsApi;
  readonly carts: CartsApi;
  readonly invoices: InvoicesApi;
  readonly users: UsersApi;

  constructor(
    private readonly request: APIRequestContext,
    readonly token?: string,
  ) {
    this.auth = new AuthApi(request, token);
    this.products = new ProductsApi(request, token);
    this.carts = new CartsApi(request, token);
    this.invoices = new InvoicesApi(request, token);
    this.users = new UsersApi(request, token);
  }

  /** A copy of the client that sends this token. */
  as(token: string): ToolshopApi {
    return new ToolshopApi(this.request, token);
  }

  async loginAs(email: string, password: string): Promise<ToolshopApi> {
    return this.as(await this.auth.login(email, password));
  }
}
