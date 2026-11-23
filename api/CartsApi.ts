import { z } from 'zod';
import { BaseApi } from './BaseApi';
import { cartSchema, type Cart } from './schemas';

export class CartsApi extends BaseApi {
  async create(): Promise<string> {
    const res = await this.request.post('carts', { headers: this.headers() });
    return (await this.parse(res, z.object({ id: z.string() }), 201)).id;
  }

  async add(cartId: string, productId: string, quantity = 1): Promise<void> {
    const res = await this.request.post(`carts/${cartId}`, {
      headers: this.headers(),
      data: { product_id: productId, quantity },
    });
    await this.parse(res, z.object({ result: z.string() }));
  }

  async get(cartId: string): Promise<Cart> {
    return this.parse(await this.request.get(`carts/${cartId}`, { headers: this.headers() }), cartSchema);
  }
}
