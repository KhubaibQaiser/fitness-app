import { describe, expect, it, vi } from 'vitest';

const events: string[] = [];

// expo-file-system 58 made File.write async; the share sheet must open only after the bytes land.
vi.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: class {
    uri = 'file:///cache/plan.pdf';
    create = () => undefined;
    write() {
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          events.push('written');
          resolve();
        }, 0),
      );
    }
  },
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: () => {
    events.push('shared');
    return Promise.resolve();
  },
}));

const { downloadBlob } = await import('./download-blob.native');

describe('downloadBlob (native)', () => {
  it('waits for the file write before opening the share sheet', async () => {
    downloadBlob(new Blob(['%PDF'], { type: 'application/pdf' }), 'plan.pdf');

    await vi.waitFor(() => expect(events).toContain('shared'));
    expect(events).toEqual(['written', 'shared']);
  });
});
