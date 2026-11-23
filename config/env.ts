import 'dotenv/config';

/**
 * One place that decides which Toolshop the suite talks to.
 *
 *   ENV=local      the app started with Docker Compose (used in CI)
 *   ENV=public     https://practicesoftwaretesting.com (default for quick local runs)
 *   ENV=with-bugs  the public build with planted defects
 *
 * BASE_URL / API_URL override the preset, e.g. for a different port.
 */
const presets = {
  local: { baseURL: 'http://localhost:4200', apiURL: 'http://localhost:8091' },
  public: {
    baseURL: 'https://practicesoftwaretesting.com',
    apiURL: 'https://api.practicesoftwaretesting.com',
  },
  'with-bugs': {
    baseURL: 'https://with-bugs.practicesoftwaretesting.com',
    apiURL: 'https://api-with-bugs.practicesoftwaretesting.com',
  },
} as const;

export type EnvName = keyof typeof presets;

function readEnvName(): EnvName {
  const value = process.env.ENV ?? 'public';
  if (!(value in presets)) {
    throw new Error(`Unknown ENV "${value}". Use one of: ${Object.keys(presets).join(', ')}`);
  }
  return value as EnvName;
}

const name = readEnvName();
const orDefault = (value: string | undefined, fallback: string) => (value && value.trim() ? value : fallback);

export const env = {
  name,
  baseURL: orDefault(process.env.BASE_URL, presets[name].baseURL),
  apiURL: orDefault(process.env.API_URL, presets[name].apiURL),
  /** Seeded demo accounts, published in the Toolshop README. Not secrets. */
  admin: {
    email: orDefault(process.env.ADMIN_EMAIL, 'admin@practicesoftwaretesting.com'),
    password: orDefault(process.env.ADMIN_PASSWORD, 'welcome01'),
  },
  customer: {
    email: orDefault(process.env.CUSTOMER_EMAIL, 'customer@practicesoftwaretesting.com'),
    password: orDefault(process.env.CUSTOMER_PASSWORD, 'welcome01'),
  },
} as const;
