import { z } from 'zod';

/**
 * Response contracts for the Toolshop API.
 * Every API client method parses its response with one of these, so a renamed
 * field or a changed type fails the test that hit it, with the path in the message.
 */

const id = z.string().min(1);
const money = z.number().nonnegative();

export const brandSchema = z.object({ id, name: z.string(), slug: z.string() });

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sub_categories: Category[];
};
export const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    id,
    name: z.string(),
    slug: z.string(),
    parent_id: z.string().nullable(),
    sub_categories: z.array(categorySchema),
  }),
);

export const productSchema = z.object({
  id,
  name: z.string().min(1),
  description: z.string(),
  price: money,
  is_location_offer: z.boolean(),
  is_rental: z.boolean(),
  in_stock: z.boolean(),
  co2_rating: z.enum(['A', 'B', 'C', 'D', 'E']).nullable(),
  is_eco_friendly: z.boolean(),
  product_image: z.object({ id, file_name: z.string(), title: z.string() }).nullable(),
  category: z.object({ id, name: z.string(), slug: z.string() }),
  brand: z.object({ id, name: z.string() }),
});

export const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    current_page: z.number().int().positive(),
    data: z.array(item),
    from: z.number().int().nullable(),
    to: z.number().int().nullable(),
    last_page: z.number().int().nonnegative(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  });

export const productPageSchema = pageOf(productSchema);

export const loginResponseSchema = z.object({
  access_token: z.string().min(20),
  token_type: z.literal('bearer'),
  expires_in: z.number().int().positive(),
});

export const addressSchema = z.object({
  street: z.string().nullable(),
  house_number: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postal_code: z.string().nullable(),
});

export const userSchema = z.object({
  id,
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
  dob: z.string().nullable(),
  phone: z.string().nullable(),
  address: addressSchema,
});

export const postcodeLookupSchema = z.object({
  street: z.string(),
  house_number: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string().length(2),
  postcode: z.string(),
});

export const cartSchema = z.object({
  id,
  cart_items: z.array(
    z.object({
      id,
      quantity: z.number().int().positive(),
      discount_percentage: z.number().nullable(),
      product_id: id,
      product: productSchema.pick({ id: true, name: true, price: true }),
    }),
  ),
});

export const invoiceLineSchema = z.object({
  id,
  product_id: id,
  unit_price: money,
  quantity: z.number().int().positive(),
  discount_percentage: z.number().nullable(),
  discounted_price: z.number().nullable(),
});

export const invoiceSchema = z.object({
  id,
  invoice_number: z.string().regex(/^INV-\d+$/),
  invoice_date: z.string(),
  status: z.string().optional(),
  billing_street: z.string(),
  billing_city: z.string(),
  billing_state: z.string().nullable(),
  billing_country: z.string(),
  billing_postal_code: z.string(),
  subtotal: money,
  total: money,
  user_id: id,
  invoicelines: z.array(invoiceLineSchema).optional(),
});

export const invoicePageSchema = pageOf(invoiceSchema);

export const errorSchema = z.object({ error: z.string().optional(), message: z.string().optional() });

export type Product = z.infer<typeof productSchema>;
export type ProductPage = z.infer<typeof productPageSchema>;
export type Brand = z.infer<typeof brandSchema>;
export type User = z.infer<typeof userSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type PostcodeLookup = z.infer<typeof postcodeLookupSchema>;
