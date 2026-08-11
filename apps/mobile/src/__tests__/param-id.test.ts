import { paramId } from '../param-id';

describe('paramId', () => {
  it('returns a single string id', () => {
    expect(paramId('abc')).toBe('abc');
  });

  it('takes the first value when Expo returns an array', () => {
    expect(paramId(['first', 'second'])).toBe('first');
  });

  it('returns empty string for missing params', () => {
    expect(paramId(undefined)).toBe('');
    expect(paramId([])).toBe('');
  });
});
