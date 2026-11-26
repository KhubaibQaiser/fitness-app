import { describe, expect, it, vi } from 'vitest';
import { backOrReplace } from './back-navigation';

describe('backOrReplace', () => {
  it('goes back when there is a screen to go back to', () => {
    const back = vi.fn();
    const replace = vi.fn();

    backOrReplace({ canGoBack: () => true, back, replace }, '/clients/client-1');

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('replaces to the parent screen when there is no history (a deep link, or Expo Router 58)', () => {
    const back = vi.fn();
    const replace = vi.fn();

    backOrReplace({ canGoBack: () => false, back, replace }, '/clients/client-1');

    expect(replace).toHaveBeenCalledWith('/clients/client-1');
    expect(back).not.toHaveBeenCalled();
  });
});
