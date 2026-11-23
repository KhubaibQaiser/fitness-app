import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config.mjs';

// `next dev` rewrites apps/web/AGENTS.md unless agentRules is false, leaving a
// stray diff in every checkout. The repo-root AGENTS.md is the agent contract.
describe('Next.js agent rules', () => {
  it('turns off the managed AGENTS.md block in next.config', () => {
    expect(nextConfig.agentRules).toBe(false);
  });

  it('keeps no Next-managed block in apps/web/AGENTS.md for next dev to rewrite', () => {
    const agentsMd = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf-8');
    expect(agentsMd).not.toContain('<!-- BEGIN:nextjs-agent-rules -->');
  });
});
