import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkPrBody } from './check-pr-body.mjs';

const template = readFileSync(
  new URL('../../.github/pull_request_template.md', import.meta.url),
  'utf8',
);
const tick = (body, label, mark = 'x') => body.replace(`- [ ] ${label}`, `- [${mark}] ${label}`);
const SPEC_PLACEHOLDER = '- Link: `docs/specs/…` or `docs/adr/…`';
const REVIEW_PLACEHOLDER = 'BLOCKERS: , NON-BLOCKING:';

const filled = tick(template, 'Bugfix / hotfix')
  .replace(SPEC_PLACEHOLDER, '- Link: `docs/specs/fr-c6-plan-publish.md`')
  .replace(REVIEW_PLACEHOLDER, 'BLOCKERS: 0, NON-BLOCKING: 2');

test('the untouched template fails on every rule, all reported at once', () => {
  const problems = checkPrBody(template);
  assert.equal(problems.length, 3);
  assert.match(problems[0], /exactly one box under "## Track" \(found 0\)/);
  assert.match(problems[1], /spec .* or an ADR .* under "## Spec \/ ADR"/);
  assert.match(problems[2], /reviewer subagent/);
});

test('a filled-in body passes, also with CRLF line endings and a capital X', () => {
  assert.deepEqual(checkPrBody(filled), []);
  assert.deepEqual(checkPrBody(filled.replace(/\n/g, '\r\n')), []);
  assert.deepEqual(
    checkPrBody(
      filled.replace('- [x] Bugfix', '- [X] Bugfix').replace('fr-c6-plan-publish', '0017-x'),
    ),
    [],
  );
});

test('heading spacing and level do not matter', () => {
  assert.deepEqual(checkPrBody(filled.replace('## Track\n', '## Track  \n')), []);
  assert.deepEqual(checkPrBody(filled.replace('## Track\n', '### Track\n')), []);
});

test('exactly one Track: none or several fail, and docs-only cannot ride along', () => {
  const two = tick(filled, 'Infra / deploy');
  assert.match(checkPrBody(two)[0], /found 2/);
  const docsPlusCode = tick(tick(template, 'Bugfix / hotfix'), 'Docs-only (no executable change)');
  const problems = checkPrBody(docsPlusCode);
  assert.match(problems[0], /found 2/);
  assert.ok(
    problems.some((p) => /spec/.test(p)),
    'docs-only beside another track still needs a spec',
  );
});

test('docs-only alone needs only the Track', () => {
  assert.deepEqual(checkPrBody(tick(template, 'Docs-only (no executable change)')), []);
});

test('the review line must be exact, under "Review", and every copy must report zero blockers', () => {
  assert.match(checkPrBody(filled.replace('BLOCKERS: 0', 'BLOCKERS: 2'))[0], /2 blocker/);
  const twoLines = filled.replace(
    'BLOCKERS: 0, NON-BLOCKING: 2',
    'BLOCKERS: 0, NON-BLOCKING: 2\nBLOCKERS: 3, NON-BLOCKING: 0',
  );
  assert.match(checkPrBody(twoLines)[0], /3 blocker/);
  const lower = filled.replace('BLOCKERS: 0, NON-BLOCKING: 2', 'blockers: 0, non-blocking: 2');
  assert.match(checkPrBody(lower)[0], /reviewer subagent/);
  const fenced = filled.replace(
    'BLOCKERS: 0, NON-BLOCKING: 2',
    '```\nBLOCKERS: 0, NON-BLOCKING: 2\n```',
  );
  assert.match(checkPrBody(fenced)[0], /reviewer subagent/);
  assert.match(checkPrBody(fenced.replace(/```/g, '~~~'))[0], /reviewer subagent/);
  const inProse = filled.replace(
    'BLOCKERS: 0, NON-BLOCKING: 2',
    'The template says BLOCKERS: 0, NON-BLOCKING: 2',
  );
  assert.match(checkPrBody(inProse)[0], /reviewer subagent/);
});

test('template guidance, placeholders and links outside "Spec / ADR" do not count', () => {
  const noLink = tick(template, 'Bugfix / hotfix').replace(
    REVIEW_PLACEHOLDER,
    'BLOCKERS: 0, NON-BLOCKING: 0',
  );
  assert.match(checkPrBody(noLink)[0], /spec/);
  const linkInSummary = noLink.replace(
    '## Summary\n',
    '## Summary\n\nSee docs/specs/fr-c6-plan-publish.md\n',
  );
  assert.match(checkPrBody(linkInSummary)[0], /spec/);
  const linkInComment = noLink.replace(
    SPEC_PLACEHOLDER,
    '<!-- docs/specs/fr-c6-plan-publish.md -->',
  );
  assert.match(checkPrBody(linkInComment)[0], /spec/);
  assert.equal(checkPrBody('').length, 3);
  assert.equal(checkPrBody(undefined).length, 3);
});

test('a ticked box outside "Track" does not count as a Track', () => {
  const body = filled
    .replace('- [x] Bugfix / hotfix', '- [ ] Bugfix / hotfix')
    .replace('- [ ] Low —', '- [x] Low —');
  assert.match(checkPrBody(body)[0], /found 0/);
});
