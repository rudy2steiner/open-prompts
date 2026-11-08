import { emptyCreditAccount, spendCredits, type CreditAccount, type CreditSpend } from './ledger';
import { atlasModelSlug, quoteImageCredits, type ImagePath } from './quotes';

export type GenerationDecision =
  | { action: 'byok'; slug: string }
  | { action: 'charge'; slug: string; credits: number; account: CreditAccount; spent: CreditSpend }
  | { action: 'reject'; status: number; error: 'missing_reference' | 'unpriced' | 'no_identity' | 'insufficient'; credits?: number };

export function decideGeneration(input: {
  byok: boolean;
  ownerId: string | null;
  account?: CreditAccount | null;
  model: string;
  path: ImagePath;
  quality?: string;
  width?: number;
  height?: number;
  count: number;
  hasReference: boolean;
  now: number;
}): GenerationDecision {
  if (input.path !== 'text-to-image' && !input.hasReference) return { action: 'reject', status: 400, error: 'missing_reference' };
  const slug = atlasModelSlug(input.model, input.path);
  if (!slug) return { action: 'reject', status: 400, error: 'unpriced' };
  const quote = quoteImageCredits(input);
  if (input.byok) return { action: 'byok', slug };
  if (!quote) return { action: 'reject', status: 400, error: 'unpriced' };
  if (!input.ownerId) return { action: 'reject', status: 402, error: 'no_identity', credits: quote.credits };
  const account = input.account ?? emptyCreditAccount();
  const spent = spendCredits(account, quote.credits, input.now);
  if (spent === 'insufficient') return { action: 'reject', status: 402, error: 'insufficient', credits: quote.credits };
  return { action: 'charge', slug: quote.slug, credits: quote.credits, account: spent.account, spent: spent.spent };
}

export function shouldOpenPricing(input: { byok: boolean; credits: number | null; balance: number }): boolean {
  if (input.byok || input.credits == null) return false;
  return input.balance < input.credits;
}

export function generateButtonCredits(input: {
  byok?: boolean;
  model: string;
  path: ImagePath;
  quality?: string;
  width?: number;
  height?: number;
  count: number;
}): number | null {
  if (input.byok) return null;
  return quoteImageCredits(input)?.credits ?? null;
}
