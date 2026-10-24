#!/usr/bin/env node
// Stop hook: run the repo's own gates before an agent is allowed to finish.
//   Cursor:      stdin {status, conversation_id, ...}. Reply {followup_message} to send it back.
//   Claude Code: stdin {session_id, stop_hook_active, ...}. Reply {decision: 'block', reason}.
// Docs-only changes skip the gates. After MAX_ATTEMPTS failed attempts in a row it lets the agent
// stop, so a broken environment cannot trap it in a loop. It never rewrites files:
// it runs `format:check`, not `format`.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const tool = argv.includes('--tool') ? argv[argv.indexOf('--tool') + 1] : 'cursor';

const root = process.env.AGENT_STOP_ROOT ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const steps = (process.env.AGENT_STOP_STEPS ?? 'format:check,lint,typecheck,test').split(',');
const pm = process.env.AGENT_STOP_PM ?? 'pnpm';
const maxAttempts = Number(process.env.AGENT_STOP_MAX_ATTEMPTS ?? 3);
const docsOnly = /\.(md|mdx|txt)$|^docs\/|^LICENSE$/;
const maxLogChars = 3500;

const readInput = () => {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
};

const run = (command, args) =>
  spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const tail = (text) => {
  const cleaned = text.replace(/\s+$/u, '');
  return cleaned.length <= maxLogChars ? cleaned : `…(truncated)\n${cleaned.slice(-maxLogChars)}`;
};

const allow = () => {
  if (tool === 'cursor') process.stdout.write('{}\n');
};

const block = (message) => {
  const body =
    tool === 'claude' ? { decision: 'block', reason: message } : { followup_message: message };
  process.stdout.write(`${JSON.stringify(body)}\n`);
};

const input = readInput();
const fromCursor = input.conversation_id || input.generation_id || input.workspace_roots;

if (tool === 'claude' && fromCursor) {
  // Cursor also imports Claude hooks. Its native stop hook already runs, so do not run twice.
  process.exit(0);
}
if (tool === 'cursor' && input.status && input.status !== 'completed') {
  // An aborted or errored stop must not run the gates or start another loop.
  allow();
  process.exit(0);
}

const session = String(input.conversation_id ?? input.session_id ?? 'default');
const counter = join(
  tmpdir(),
  `agent-stop-${createHash('sha1').update(`${root}:${session}`).digest('hex').slice(0, 12)}.json`,
);
const readAttempts = () => {
  try {
    return Number(JSON.parse(readFileSync(counter, 'utf8')).attempts) || 0;
  } catch {
    return 0;
  }
};
const reset = () => rmSync(counter, { force: true });

const status = run('git', ['status', '--porcelain']);
const changed =
  status.status === 0
    ? status.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => line.slice(3).split(' -> ').pop())
    : [];

if (changed.length === 0 || changed.every((file) => docsOnly.test(file))) {
  reset();
  allow();
  process.exit(0);
}

for (const step of steps) {
  const result = run(pm, ['run', step]);
  if (result.status === 0) continue;
  const attempts = readAttempts() + 1;
  if (attempts > maxAttempts) {
    reset();
    allow();
    process.exit(0);
  }
  writeFileSync(counter, JSON.stringify({ attempts }));
  block(
    `${step} failed (attempt ${attempts} of ${maxAttempts}). Fix it, then finish again.\n${tail(
      `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    )}`,
  );
  process.exit(0);
}

reset();
allow();
process.exitCode = 0;
