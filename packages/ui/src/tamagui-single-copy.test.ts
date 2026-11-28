import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Two copies of Tamagui (two versions, or one version resolved against different peers) split the
// config and theme context: pages fail with "Can't find Tamagui configuration" (found in U4).
const lockfile = readFileSync(new URL('../../../pnpm-lock.yaml', import.meta.url), 'utf8');
const snapshots = lockfile.slice(lockfile.indexOf('\nsnapshots:\n'));

const copiesOf = (name: string) => {
  const key = new RegExp(`^  '?${name.replace('/', '\\/')}@([^:']+)'?:`, 'gm');
  return [...snapshots.matchAll(key)].map((match) => match[1]);
};

describe('Tamagui is installed once', () => {
  it('finds the lockfile snapshots section', () => {
    expect(snapshots.length).toBeGreaterThan(100);
  });

  it.each(['tamagui', '@tamagui/web', '@tamagui/core'])('%s has one resolved copy', (name) => {
    expect(copiesOf(name)).toHaveLength(1);
  });
});
