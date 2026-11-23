import { describe, expect, it } from 'vitest';
import type { ClientListItem } from '@gymos/contracts';
import { badgeReasons, isAttentionCode, needsAttention } from './attention';

const client = (name: string, ...codes: string[]): ClientListItem => ({
  id: name,
  name,
  status: 'active',
  attentionScore: 0,
  attentionReasons: codes.map((code) => ({ code, weight: 80, since: '2026-08-06T00:00:00.000Z' })),
  latestWeightKg: null,
  goalPreset: null,
});

describe('needsAttention (Home and roster share it)', () => {
  it('counts five overdue clients as needing attention, so no all-clear', () => {
    const roster = ['A', 'B', 'C', 'D', 'E'].map((n) => client(n, 'CHECKIN_OVERDUE'));
    expect(roster.filter((c) => needsAttention(c.attentionReasons))).toHaveLength(5);
  });

  it.each(['CHECKIN_OVERDUE', 'OFF_TRACK', 'RED_FLAG'])('%s needs attention', (code) => {
    expect(isAttentionCode(code)).toBe(true);
    expect(needsAttention([{ code }])).toBe(true);
  });

  it.each(['CHECKIN_DUE', 'NEW_CLIENT'])('%s alone does not', (code) => {
    expect(isAttentionCode(code)).toBe(false);
    expect(needsAttention([{ code }])).toBe(false);
  });

  it('a client with no reasons is on track', () => {
    expect(needsAttention([])).toBe(false);
  });

  it('any attention reason among others is enough', () => {
    expect(needsAttention([{ code: 'NEW_CLIENT' }, { code: 'CHECKIN_OVERDUE' }])).toBe(true);
  });
});

describe('badgeReasons (roster row reason badges)', () => {
  it('skips codes the status badges cover before taking two', () => {
    const reasons = [{ code: 'OFF_TRACK' }, { code: 'RED_FLAG' }, { code: 'CHECKIN_DUE' }];
    expect(badgeReasons(reasons)).toEqual([{ code: 'CHECKIN_DUE' }]);
  });

  it('drops CHECKIN_OVERDUE and NEW_CLIENT and keeps at most two others', () => {
    const reasons = ['CHECKIN_OVERDUE', 'NEW_CLIENT', 'CHECKIN_DUE', 'OTHER_A', 'OTHER_B'].map(
      (code) => ({ code }),
    );
    expect(badgeReasons(reasons)).toEqual([{ code: 'CHECKIN_DUE' }, { code: 'OTHER_A' }]);
  });
});
