/** "$1,234.50" → 1234.5. Throws on anything that is not a price, so a broken label fails loudly. */
export function parseMoney(text: string): number {
  const match = text.replace(/,/g, '').match(/-?\$?\s*(-?\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Not a price: "${text}"`);
  return Number(match[1]);
}

/** Rounds to cents, the way the shop does, so sums can be compared exactly. */
export const cents = (value: number) => Math.round(value * 100) / 100;
