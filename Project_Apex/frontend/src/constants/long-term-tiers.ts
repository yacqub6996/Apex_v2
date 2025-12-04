export type LongTermTier = 'FOUNDATION' | 'GROWTH' | 'ELITE';

export const LONG_TERM_TIER_RANGES: Record<LongTermTier, { min: number; max: number }> = {
  FOUNDATION: { min: 5_000, max: 15_000 },
  GROWTH: { min: 15_000, max: 50_000 },
  ELITE: { min: 50_000, max: 200_000 },
};

export const normalizeTier = (tier?: string): LongTermTier | null => {
  if (!tier) return null;
  const t = tier.toUpperCase();
  if (t === 'FOUNDATION' || t === 'GROWTH' || t === 'ELITE') return t;
  return null;
};

export const getTierRange = (tier?: string) => {
  const key = normalizeTier(tier);
  return key ? LONG_TERM_TIER_RANGES[key] : null;
};

