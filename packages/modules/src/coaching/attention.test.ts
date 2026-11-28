import { describe, expect, it } from 'vitest';
import { ATTENTION_CODES, attentionStatus } from './attention';

const reason = (code: string, weight = 60) => ({ code, weight, since: '2026-08-06T00:00:00.000Z' });

describe('attentionStatus (the server copy of B1 rule, shared by Today and the roster)', () => {
  it.each(['CHECKIN_OVERDUE', 'OFF_TRACK', 'RED_FLAG'])('%s needs attention', (code) => {
    expect(attentionStatus([reason(code)])).toEqual({
      needsAttention: true,
      reason: reason(code),
    });
  });

  it.each(['CHECKIN_DUE', 'NEW_CLIENT', 'SOMETHING_ELSE'])(
    '%s does not, but is still the status reason',
    (code) => {
      expect(attentionStatus([reason(code)])).toEqual({
        needsAttention: false,
        reason: reason(code),
      });
    },
  );

  it('is on track with no reasons', () => {
    expect(attentionStatus([])).toEqual({ needsAttention: false, reason: null });
  });

  it('shows the most urgent attention reason, ahead of heavier non-attention ones', () => {
    const status = attentionStatus([
      reason('NEW_CLIENT', 90),
      reason('OFF_TRACK', 60),
      reason('CHECKIN_OVERDUE', 80),
      reason('RED_FLAG', 100),
    ]);
    expect(status.reason?.code).toBe('RED_FLAG');
    expect(attentionStatus([reason('CHECKIN_DUE', 60), reason('OFF_TRACK', 60)]).reason?.code).toBe(
      'OFF_TRACK',
    );
  });

  it('picks the heaviest other reason when none needs attention', () => {
    expect(
      attentionStatus([reason('NEW_CLIENT', 50), reason('CHECKIN_DUE', 60)]).reason?.code,
    ).toBe('CHECKIN_DUE');
  });

  it('lists the same codes as the client copy, most urgent first', () => {
    expect(ATTENTION_CODES).toEqual(['RED_FLAG', 'CHECKIN_OVERDUE', 'OFF_TRACK']);
  });
});
