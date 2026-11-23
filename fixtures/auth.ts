import path from 'node:path';

/** Where the setup project writes the logged-in state for each role. */
export const STORAGE_STATE = {
  admin: path.join(__dirname, '..', '.auth', 'admin.json'),
  customer: path.join(__dirname, '..', '.auth', 'customer.json'),
} as const;

/** The Angular app keeps the JWT in localStorage under this key. */
export const TOKEN_KEY = 'auth-token';

/**
 * A Playwright storage state that makes the app see the user as logged in,
 * without going through the login form.
 */
export function storageStateFor(origin: string, token: string) {
  return {
    cookies: [],
    origins: [{ origin, localStorage: [{ name: TOKEN_KEY, value: token }] }],
  };
}
