import { BaseApi } from './BaseApi';
import { postcodeLookupSchema, type PostcodeLookup } from './schemas';

export type RemoveResult = 'deleted' | 'not-found' | 'kept-has-orders';

export class UsersApi extends BaseApi {
  /**
   * Admin only. The shop refuses to delete a customer who has orders (409),
   * which is correct: invoices must keep their customer. Callers decide what
   * to do with that; any other status is a real failure.
   */
  async remove(userId: string): Promise<RemoveResult> {
    const res = await this.request.delete(`users/${userId}`, { headers: this.headers() });
    switch (res.status()) {
      case 204:
        return 'deleted';
      case 404:
        return 'not-found';
      case 409:
        return 'kept-has-orders';
      default:
        throw new Error(`Deleting user ${userId} returned ${res.status()}: ${await res.text()}`);
    }
  }

  /**
   * The API checks that city and state belong to the country + postcode,
   * using this same lookup. Test addresses are built from it, so they are always valid.
   */
  async lookupPostcode(country: string, postcode: string): Promise<PostcodeLookup> {
    const res = await this.request.get(`postcode-lookup?country=${country}&postcode=${postcode}`, {
      headers: this.headers(),
    });
    return this.parse(res, postcodeLookupSchema);
  }
}
