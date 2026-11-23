import { BaseApi } from './BaseApi';
import { invoicePageSchema, invoiceSchema, type Invoice } from './schemas';

export type BillingAddress = {
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postal_code: string;
};

export type PaymentMethod =
  | 'bank-transfer'
  | 'cash-on-delivery'
  | 'credit-card'
  | 'buy-now-pay-later'
  | 'gift-card';

export class InvoicesApi extends BaseApi {
  async create(cartId: string, address: BillingAddress, payment: PaymentMethod = 'cash-on-delivery') {
    const res = await this.request.post('invoices', {
      headers: this.headers(),
      data: { ...address, payment_method: payment, payment_details: {}, cart_id: cartId },
    });
    return this.parse(res, invoiceSchema.omit({ invoicelines: true }), 201);
  }

  async list(page = 1) {
    return this.parse(
      await this.request.get(`invoices?page=${page}`, { headers: this.headers() }),
      invoicePageSchema,
    );
  }

  async get(id: string): Promise<Invoice> {
    return this.parse(await this.request.get(`invoices/${id}`, { headers: this.headers() }), invoiceSchema);
  }
}
