import { BaseApi } from './BaseApi';
import { loginResponseSchema, userSchema, type User } from './schemas';

export type NewUser = {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  email: string;
  password: string;
  address: {
    street: string;
    house_number: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
  };
};

export class AuthApi extends BaseApi {
  async login(email: string, password: string): Promise<string> {
    const res = await this.request.post('users/login', {
      headers: this.headers(),
      data: { email, password },
    });
    return (await this.parse(res, loginResponseSchema)).access_token;
  }

  /** Raw response, for negative tests that check status codes. */
  loginRaw(email: string, password: string) {
    return this.request.post('users/login', { headers: this.headers(), data: { email, password } });
  }

  async register(user: NewUser): Promise<User> {
    const res = await this.request.post('users/register', { headers: this.headers(), data: user });
    return this.parse(res, userSchema, 201);
  }

  async me(): Promise<User> {
    return this.parse(await this.request.get('users/me', { headers: this.headers() }), userSchema);
  }
}
