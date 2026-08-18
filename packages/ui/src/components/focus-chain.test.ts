import { describe, expect, it } from 'vitest';
import { invokeOncePerTick, resolveChainAction } from './focus-chain';

const names = ['email', 'phone', 'password'] as const;

describe('resolveChainAction', () => {
  it('moves Next on intermediate single-line fields and keeps the keyboard open', () => {
    const action = resolveChainAction(names, 'email', {
      multiline: new Set(),
      hasSubmit: true,
      submitKey: 'go',
    });
    expect(action.kind).toBe('next');
    expect(action.returnKeyType).toBe('next');
    expect(action.blurOnSubmit).toBe(false);
    expect(action.nextName).toBe('phone');
    expect(action.prevName).toBeNull();
  });

  it('submits from the last single-line field with the requested return key', () => {
    const action = resolveChainAction(names, 'password', {
      multiline: new Set(),
      hasSubmit: true,
      submitKey: 'go',
    });
    expect(action.kind).toBe('submit');
    expect(action.returnKeyType).toBe('go');
    expect(action.enterKeyHint).toBe('go');
    expect(action.blurOnSubmit).toBe(true);
    expect(action.prevName).toBe('phone');
  });

  it('dismisses on the last field when there is no submit handler', () => {
    const action = resolveChainAction(['weight', 'heightCm'], 'heightCm', {
      multiline: new Set(),
      hasSubmit: false,
      submitKey: 'done',
    });
    expect(action.kind).toBe('dismiss');
    expect(action.returnKeyType).toBe('done');
  });

  it('never steals Enter from multiline fields, but they remain focus targets', () => {
    const action = resolveChainAction(['weight', 'notes'], 'notes', {
      multiline: new Set(['notes']),
      hasSubmit: true,
      submitKey: 'done',
    });
    expect(action.kind).toBe('newline');
    expect(action.returnKeyType).toBe('default');
    expect(action.blurOnSubmit).toBe(false);
    expect(action.prevName).toBe('weight');
  });

  it('sends the field before a trailing textarea to that textarea, not submit', () => {
    const action = resolveChainAction(['weight', 'notes'], 'weight', {
      multiline: new Set(['notes']),
      hasSubmit: true,
      submitKey: 'done',
    });
    expect(action.kind).toBe('next');
    expect(action.nextName).toBe('notes');
  });

  it('ignores unknown names instead of submitting from a typo', () => {
    const action = resolveChainAction(names, 'not-a-field', {
      multiline: new Set(),
      hasSubmit: true,
      submitKey: 'go',
    });
    expect(action.kind).toBe('newline');
    expect(action.nextName).toBeNull();
  });
});

describe('invokeOncePerTick', () => {
  it('drops a second submit in the same tick', () => {
    const inflight = { current: false };
    let count = 0;
    invokeOncePerTick(inflight, () => {
      count += 1;
    });
    invokeOncePerTick(inflight, () => {
      count += 1;
    });
    expect(count).toBe(1);
  });

  it('allows another submit on the next microtask', async () => {
    const inflight = { current: false };
    let count = 0;
    invokeOncePerTick(inflight, () => {
      count += 1;
    });
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
    invokeOncePerTick(inflight, () => {
      count += 1;
    });
    expect(count).toBe(2);
  });
});
