// Client mirror of family-command-center-api's src/utils/merchantKey.ts —
// must stay byte-identical so a locally-typed record's key matches what the
// server's detector computed for the same merchant.
export function normalizeMerchantKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}
