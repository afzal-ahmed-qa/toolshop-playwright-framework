import type { APIRequestContext, APIResponse } from '@playwright/test';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * A plain request for negative tests, where the point is the status code and
 * the error body, not a parsed result. Always asks for JSON: without that
 * header Laravel answers validation errors with an HTML redirect (302).
 */
export function raw(
  request: APIRequestContext,
  method: HttpMethod,
  path: string,
  options: { token?: string; data?: unknown } = {},
): Promise<APIResponse> {
  return request.fetch(path.replace(/^\//, ''), {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.data !== undefined ? { data: options.data } : {}),
  });
}
