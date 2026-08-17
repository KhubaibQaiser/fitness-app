import { describe, expect, it } from 'vitest';
import {
  clientHubPath,
  clientHubTabFromSegment,
  isClientHubPath,
  isClientHubTabId,
} from './client-hub-tabs';

describe('client hub tabs', () => {
  it('builds hub paths without colliding with the plan editor', () => {
    expect(clientHubPath('abc', 'overview')).toBe('/clients/abc');
    expect(clientHubPath('abc', 'journey')).toBe('/clients/abc/journey');
    expect(clientHubPath('abc', 'plan')).toBe('/clients/abc/meal-plan');
    expect(clientHubPath('abc', 'history')).toBe('/clients/abc/history');
  });

  it('parses hub segments and rejects the plan editor segment', () => {
    expect(clientHubTabFromSegment(undefined)).toBe('overview');
    expect(clientHubTabFromSegment('')).toBe('overview');
    expect(clientHubTabFromSegment('journey')).toBe('journey');
    expect(clientHubTabFromSegment('meal-plan')).toBe('plan');
    expect(clientHubTabFromSegment('history')).toBe('history');
    expect(clientHubTabFromSegment('plan')).toBeNull();
    expect(clientHubTabFromSegment('check-in')).toBeNull();
  });

  it('recognizes hub paths and ignores subflows', () => {
    expect(isClientHubPath('/clients/abc')).toBe(true);
    expect(isClientHubPath('/clients/abc/journey')).toBe(true);
    expect(isClientHubPath('/clients/abc/meal-plan')).toBe(true);
    expect(isClientHubPath('/clients/abc/history')).toBe(true);
    expect(isClientHubPath('/clients/new')).toBe(false);
    expect(isClientHubPath('/clients/abc/plan')).toBe(false);
    expect(isClientHubPath('/clients/abc/check-in')).toBe(false);
    expect(isClientHubPath('/clients')).toBe(false);
    expect(isClientHubTabId('journey')).toBe(true);
    expect(isClientHubTabId('meal-plan')).toBe(false);
  });
});
