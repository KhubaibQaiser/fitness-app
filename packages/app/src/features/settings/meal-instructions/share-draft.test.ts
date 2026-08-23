import { describe, expect, it } from 'vitest';
import { draftToShares, emptyShareDraft, sharesToDraft } from './share-draft';

describe('ADR-0015 D7 — share-draft', () => {
  it('round-trips a 10% breakfast and leaves unset slots blank', () => {
    const draft = sharesToDraft({ breakfast: 0.1 });
    expect(draft).toEqual({ breakfast: '10', lunch: '', dinner: '', snack: '' });
    expect(draftToShares(draft)).toEqual({ shares: { breakfast: 0.1 }, error: null });
  });

  it('treats an empty draft as "use the template defaults"', () => {
    expect(draftToShares(emptyShareDraft())).toEqual({ shares: null, error: null });
    expect(sharesToDraft(null)).toEqual(emptyShareDraft());
    expect(sharesToDraft(undefined)).toEqual(emptyShareDraft());
  });

  it('rejects a share outside 5–80% or a non-numeric value', () => {
    expect(draftToShares({ ...emptyShareDraft(), breakfast: '3' }).error).toMatch(/5%/);
    expect(draftToShares({ ...emptyShareDraft(), breakfast: '90' }).error).toMatch(/80%/);
    expect(draftToShares({ ...emptyShareDraft(), breakfast: 'ten' }).error).toMatch(/number/);
  });

  it('rejects a set of shares that sum past 100%', () => {
    expect(draftToShares({ breakfast: '50', lunch: '40', dinner: '20', snack: '' }).error).toMatch(
      /100%/,
    );
  });
});
