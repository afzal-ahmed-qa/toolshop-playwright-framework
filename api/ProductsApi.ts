import { z } from 'zod';
import { BaseApi } from './BaseApi';
import {
  brandSchema,
  categorySchema,
  productPageSchema,
  productSchema,
  searchPageSchema,
  type Product,
  type ProductPage,
} from './schemas';

export type ProductQuery = {
  page?: number;
  sort?: 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';
  byCategory?: string[];
  byBrand?: string[];
  /** Inclusive price range, e.g. [10, 50]. */
  price?: [number, number];
};

export class ProductsApi extends BaseApi {
  async list(query: ProductQuery = {}): Promise<ProductPage> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.sort) params.set('sort', query.sort);
    if (query.byCategory?.length) params.set('by_category', query.byCategory.join(','));
    if (query.byBrand?.length) params.set('by_brand', query.byBrand.join(','));
    if (query.price) params.set('between', `price,${query.price[0]},${query.price[1]}`);
    const res = await this.request.get(`products?${params}`, { headers: this.headers() });
    return this.parse(res, productPageSchema);
  }

  /** Every product across all pages. Use sparingly: one request per page. */
  async listAll(query: Omit<ProductQuery, 'page'> = {}): Promise<Product[]> {
    const first = await this.list({ ...query, page: 1 });
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, first.last_page - 1) }, (_, i) =>
        this.list({ ...query, page: i + 2 }),
      ),
    );
    return [first, ...rest].flatMap((p) => p.data);
  }

  async get(id: string): Promise<Product> {
    return this.parse(await this.request.get(`products/${id}`, { headers: this.headers() }), productSchema);
  }

  async search(q: string, page = 1) {
    const res = await this.request.get(`products/search?q=${encodeURIComponent(q)}&page=${page}`, {
      headers: this.headers(),
    });
    return this.parse(res, searchPageSchema);
  }

  async brands() {
    return this.parse(await this.request.get('brands', { headers: this.headers() }), z.array(brandSchema));
  }

  async categoryTree() {
    return this.parse(
      await this.request.get('categories/tree', { headers: this.headers() }),
      z.array(categorySchema),
    );
  }

  /** Admin only. */
  async create(product: NewProduct): Promise<Product> {
    const res = await this.request.post('products', { headers: this.headers(), data: product });
    return this.parse(res, productSchema.partial().extend({ id: z.string() }), 201) as Promise<Product>;
  }

  /** Admin only. */
  async remove(id: string): Promise<void> {
    const res = await this.request.delete(`products/${id}`, { headers: this.headers() });
    if (![204, 404].includes(res.status())) {
      throw new Error(`Deleting product ${id} returned ${res.status()}: ${await res.text()}`);
    }
  }
}

export type NewProduct = {
  name: string;
  description: string;
  price: number;
  category_id: string;
  brand_id: string;
  product_image_id: string;
  is_location_offer: boolean;
  is_rental: boolean;
  co2_rating: 'A' | 'B' | 'C' | 'D' | 'E';
  stock?: number;
};
