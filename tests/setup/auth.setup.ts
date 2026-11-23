import fs from 'node:fs/promises';
import path from 'node:path';
import { test as setup, expect } from '@playwright/test';
import { env } from '@config/env';
import { ToolshopApi } from '@api/ToolshopApi';
import { STORAGE_STATE, storageStateFor } from '@fixtures/auth';

/**
 * Logs in once per role through the API and saves the browser state.
 * UI tests for these roles start already logged in, so only the dedicated
 * login tests use the login form. This keeps 100+ tests from paying for
 * 100+ form logins.
 */
const roles = [
  { name: 'admin', ...env.admin, file: STORAGE_STATE.admin },
  { name: 'customer', ...env.customer, file: STORAGE_STATE.customer },
] as const;

for (const role of roles) {
  setup(`log in as ${role.name}`, async ({ playwright }) => {
    const request = await playwright.request.newContext({ baseURL: `${env.apiURL}/` });
    const api = await new ToolshopApi(request).loginAs(role.email, role.password);
    expect((await api.auth.me()).email).toBe(role.email);

    await fs.mkdir(path.dirname(role.file), { recursive: true });
    await fs.writeFile(role.file, JSON.stringify(storageStateFor(new URL(env.baseURL).origin, api.token!)));
    await request.dispose();
  });
}
