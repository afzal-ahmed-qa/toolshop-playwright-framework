import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** A known violation: the axe rule, a CSS selector that matches the element, and the defect it belongs to. */
export type KnownViolation = { rule: string; selector: string; defect: string };

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Scans the page for WCAG 2.1 A/AA problems and fails on anything that is not
 * a known, documented defect. Known violations stay visible in the report as
 * annotations, so they are tracked rather than forgotten.
 *
 * The full axe result is attached to the test, so the report shows every node.
 */
export async function expectNoNewViolations(page: Page, known: KnownViolation[] = [], include?: string) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();

  await test.info().attach('axe-results.json', {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });

  const isKnown = (rule: string, target: string) =>
    known.some((k) => k.rule === rule && target.includes(k.selector));

  const unexpected = results.violations.flatMap((v) =>
    v.nodes
      .map((n) => n.target.join(' '))
      .filter((target) => !isKnown(v.id, target))
      .map((target) => `${v.impact ?? 'unknown'} | ${v.id} | ${target} | ${v.help}`),
  );

  for (const k of known) {
    if (results.violations.some((v) => v.id === k.rule)) {
      test
        .info()
        .annotations.push({ type: 'known defect', description: `${k.defect}: ${k.rule} on ${k.selector}` });
    }
  }

  expect(unexpected, `New accessibility violations:\n${unexpected.join('\n')}`).toEqual([]);
}
