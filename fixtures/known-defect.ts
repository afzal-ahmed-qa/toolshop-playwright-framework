import { expect, test } from '@playwright/test';

/**
 * Asserts the CORRECT behaviour for a known defect, and expects that assertion to fail.
 *
 * Why not test.fail()? test.fail() turns ANY error into a pass, so a broken setup
 * step (a bad locator, a contract violation, a failed API call) is silently hidden
 * as "expected failure". Here only `check` is expected to fail:
 *   - setup errors outside `check` fail the test as usual
 *   - if `check` passes, the defect is fixed and the test fails with a clear message
 */
export async function expectKnownDefect(
  id: string,
  summary: string,
  check: () => Promise<void>,
): Promise<void> {
  test.info().annotations.push({ type: 'known defect', description: `${id}: ${summary}` });
  let failure: unknown;
  try {
    await check();
  } catch (error) {
    failure = error;
  }
  expect(
    failure,
    `${id} looks fixed: the correct behaviour was observed. Update docs/defects.md and remove the marker.`,
  ).toBeDefined();
}
