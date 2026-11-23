import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Claude Code settings are a guardrail too. These tests pin the parts that must not drift
// (ADR-0017): secret files denied, merges asked, the guard on every file tool and failing closed.
const root = new URL('../../', import.meta.url);
const settings = JSON.parse(readFileSync(new URL('.claude/settings.json', root), 'utf8'));
const { deny = [], ask = [] } = settings.permissions ?? {};

test('secret files are denied, with committed examples carved out after the rule they narrow', () => {
  for (const rule of [
    'Read(.env*)',
    'Read(*.pem)',
    'Read(*.key)',
    'Read(*.tfstate)',
    'Read(*.tfvars)',
    'Read(backend.hcl)',
  ]) {
    assert.ok(deny.includes(rule), `missing deny rule ${rule}`);
  }
  // A "!" rule carves nothing out unless it comes after the rule it narrows. Both carved files are
  // committed and hold no secrets, so agents may read them.
  assert.ok(deny.indexOf('Read(!.env.example)') > deny.indexOf('Read(.env*)'));
  assert.ok(deny.indexOf('Read(!ci.auto.tfvars)') > deny.indexOf('Read(*.tfvars)'));
});

test('merging and editing the guardrails always ask', () => {
  for (const rule of [
    'Bash(gh pr merge *)',
    'Edit(scripts/agent-hooks/**)',
    'Edit(scripts/pr-contract/**)',
    'Edit(.claude/**)',
    'Edit(.github/workflows/**)',
  ]) {
    assert.ok(ask.includes(rule), `missing ask rule ${rule}`);
  }
});

test('the guard runs on the shell and every file tool, and blocks when it cannot run', () => {
  const entries = settings.hooks?.PreToolUse ?? [];
  const guard = entries.find((e) => e.hooks?.some((h) => h.command?.includes('guard.mjs')));
  assert.ok(guard, 'guard hook is not wired');
  const tools = guard.matcher.split('|');
  for (const tool of ['Bash', 'Read', 'Grep', 'Glob', 'Write', 'Edit']) {
    assert.ok(tools.includes(tool), `guard does not run on ${tool}`);
  }
  const hook = guard.hooks.find((h) => h.command.includes('guard.mjs'));
  assert.equal(hook.onFailure, 'block');
});

test('local agent files stay out of git', () => {
  const ignore = readFileSync(new URL('.gitignore', root), 'utf8').split('\n');
  for (const entry of [
    '.specstory/',
    '.impeccable/',
    'CLAUDE.local.md',
    '.claude/settings.local.json',
  ]) {
    assert.ok(ignore.includes(entry), `${entry} is not ignored`);
  }
});
