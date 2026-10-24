import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const stopCheck = fileURLToPath(new URL('./stop-check.mjs', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'stop-check-test-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

// A fake package manager: logs each step it is asked to run and fails the one named in FAKE_PM_FAIL.
const pm = join(scratch, 'fake-pm.sh');
writeFileSync(
  pm,
  '#!/bin/sh\necho "$2" >> "$FAKE_PM_LOG"\nif [ "$2" = "$FAKE_PM_FAIL" ]; then echo "boom in $2"; exit 1; fi\nexit 0\n',
);
chmodSync(pm, 0o755);

let counter = 0;
const makeRepo = (files) => {
  const dir = mkdtempSync(join(scratch, 'repo-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
};

const runHook = ({ tool = 'cursor', repo, payload, fail = '' }) => {
  const log = join(scratch, `log-${(counter += 1)}.txt`);
  const result = spawnSync(process.execPath, [stopCheck, '--tool', tool], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENT_STOP_ROOT: repo,
      AGENT_STOP_PM: pm,
      FAKE_PM_LOG: log,
      FAKE_PM_FAIL: fail,
    },
  });
  assert.equal(result.status, 0, 'a hook must always exit 0');
  const steps = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
  return { out: result.stdout.trim(), steps };
};

const id = () => `conv-${(counter += 1)}`;

test('Cursor: all gates pass, runs them in order and lets the agent finish', () => {
  const repo = makeRepo({ 'a.ts': 'export const a = 1;\n' });
  const { out, steps } = runHook({ repo, payload: { status: 'completed', conversation_id: id() } });
  assert.equal(out, '{}');
  assert.deepEqual(steps, ['format:check', 'lint', 'typecheck', 'test']);
});

test('Cursor: a failing gate sends the agent back and stops at the first failure', () => {
  const repo = makeRepo({ 'a.ts': 'export const a = 1;\n' });
  const { out, steps } = runHook({
    repo,
    fail: 'lint',
    payload: { status: 'completed', conversation_id: id() },
  });
  const reply = JSON.parse(out);
  assert.match(reply.followup_message, /^lint failed \(attempt 1 of 3\)/);
  assert.match(reply.followup_message, /boom in lint/);
  assert.deepEqual(steps, ['format:check', 'lint']);
});

test('docs-only changes skip the gates', () => {
  const repo = makeRepo({ 'README.md': '# hi\n' });
  const { out, steps } = runHook({ repo, payload: { status: 'completed', conversation_id: id() } });
  assert.equal(out, '{}');
  assert.deepEqual(steps, []);
});

test('an aborted stop does not run the gates', () => {
  const repo = makeRepo({ 'a.ts': 'export const a = 1;\n' });
  const { out, steps } = runHook({ repo, payload: { status: 'aborted', conversation_id: id() } });
  assert.equal(out, '{}');
  assert.deepEqual(steps, []);
});

test('Claude Code: block with a reason on failure, silent on success', () => {
  const repo = makeRepo({ 'a.ts': 'export const a = 1;\n' });
  const failing = runHook({
    tool: 'claude',
    repo,
    fail: 'typecheck',
    payload: { session_id: id(), stop_hook_active: false },
  });
  const reply = JSON.parse(failing.out);
  assert.equal(reply.decision, 'block');
  assert.match(reply.reason, /^typecheck failed/);
  const passing = runHook({ tool: 'claude', repo, payload: { session_id: id() } });
  assert.equal(passing.out, '');
  assert.deepEqual(passing.steps, ['format:check', 'lint', 'typecheck', 'test']);
});

test('Claude mode stays silent for calls Cursor imported', () => {
  const repo = makeRepo({ 'a.ts': 'export const a = 1;\n' });
  const { out, steps } = runHook({
    tool: 'claude',
    repo,
    payload: { conversation_id: id(), session_id: 's' },
  });
  assert.equal(out, '');
  assert.deepEqual(steps, []);
});

test('after three failed attempts in a row the agent is allowed to stop', () => {
  const repo = makeRepo({ 'a.ts': 'export const a = 1;\n' });
  const conversation = id();
  const replies = [1, 2, 3, 4].map(
    () =>
      runHook({
        repo,
        fail: 'test',
        payload: { status: 'completed', conversation_id: conversation },
      }).out,
  );
  assert.match(JSON.parse(replies[0]).followup_message, /attempt 1 of 3/);
  assert.match(JSON.parse(replies[1]).followup_message, /attempt 2 of 3/);
  assert.match(JSON.parse(replies[2]).followup_message, /attempt 3 of 3/);
  assert.equal(replies[3], '{}');
});
