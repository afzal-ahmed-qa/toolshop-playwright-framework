import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { z } from 'zod';

/**
 * Shared plumbing for the API clients: auth header, status check and schema parsing.
 * A failed status or contract shows the method, URL and body in the error,
 * so the report is enough to understand what went wrong.
 */
export abstract class BaseApi {
  constructor(
    /** Raw access for negative tests that check status codes. */
    readonly request: APIRequestContext,
    protected token?: string,
  ) {}

  withToken(token: string): this {
    this.token = token;
    return this;
  }

  protected headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Accept: 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra,
    };
  }

  protected async parse<S extends z.ZodTypeAny>(
    response: APIResponse,
    schema: S,
    expectedStatus = 200,
  ): Promise<z.infer<S>> {
    const body = await response.text();
    expect(response.status(), `${response.url()} returned ${response.status()}: ${body.slice(0, 500)}`).toBe(
      expectedStatus,
    );
    const result = schema.safeParse(JSON.parse(body));
    if (!result.success) {
      throw new Error(`Contract violation for ${response.url()}:\n${result.error.message}`);
    }
    return result.data;
  }
}
