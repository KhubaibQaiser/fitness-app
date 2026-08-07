/** Map kit 0–100% adherence UI ↔ engine 1–5 rating. */
export const adherencePctToRating = (pct: number): 1 | 2 | 3 | 4 | 5 => {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  if (clamped === 0) return 1;
  return Math.min(5, Math.max(1, Math.ceil(clamped / 20))) as 1 | 2 | 3 | 4 | 5;
};

export const adherenceRatingToPct = (rating: 1 | 2 | 3 | 4 | 5 | null | undefined): number => {
  if (rating == null) return 0;
  return Math.min(100, Math.max(0, rating * 20));
};

export const adherenceBarTone = (pct: number): 'danger' | 'warning' | 'success' | 'primary' => {
  if (pct >= 85) return 'success';
  if (pct >= 65) return 'primary';
  if (pct >= 50) return 'warning';
  return 'danger';
};
