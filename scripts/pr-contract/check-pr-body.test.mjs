import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkPrBody } from './check-pr-body.mjs';

const template = readFileSync(
  new URL('../../.github/pull_request_template.md', import.meta.url),
  'utf8',
);
const tick = (body, label) => body.replace(`- [ ] ${label}`, `- [x] ${label}`);

const filled = tick(template, 'Bugfix / hotfix')
  .replace('- Link: `docs/specs/…` or `docs/adr/…`', '- Link: `docs/specs/fr-c6-plan-publish.md`')
  .replace('BLOCKERS: , NON-BLOCKING:', 'BLOCKERS: 0, NON-BLOCKING: 2');

test('the untouched template fails on every rule, all reported at once', () => {
  const problems = checkPrBody(template);
  assert.equal(problems.length, 3);
  assert.match(problems[0], /Track/);
  assert.match(problems[1], /spec .* or an ADR/);
  assert.match(problems[2], /reviewer subagent/);
});

test('a filled-in body passes', () => {
  assert.deepEqual(checkPrBody(filled), []);
  assert.deepEqual(
    checkPrBody(filled.replace('docs/specs/fr-c6-plan-publish.md', 'docs/adr/0017-x.md')),
    [],
  );
});

test('docs-only needs only the Track', () => {
  assert.deepEqual(checkPrBody(tick(template, 'Docs-only (no executable change)')), []);
});

test('a review with blockers fails', () => {
  const problems = checkPrBody(filled.replace('BLOCKERS: 0', 'BLOCKERS: 2'));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /2 blocker/);
});

test('template guidance and placeholders do not count', () => {
  // The comment under "Track" mentions boxes, and the link line is a placeholder.
  const body = tick(template, 'Bugfix / hotfix').replace(
    'BLOCKERS: , NON-BLOCKING:',
    'BLOCKERS: 0, NON-BLOCKING: 0',
  );
  assert.deepEqual(checkPrBody(body), [
    'Link a spec (`docs/specs/<name>.md`) or an ADR (`docs/adr/<name>.md`).',
  ]);
  assert.equal(checkPrBody('').length, 3);
  assert.equal(checkPrBody(undefined).length, 3);
});

test('a ticked box outside "Track" does not count as a Track', () => {
  const body = filled
    .replace('- [x] Bugfix / hotfix', '- [ ] Bugfix / hotfix')
    .replace('- [ ] Low —', '- [x] Low —');
  assert.match(checkPrBody(body)[0], /Track/);
});
