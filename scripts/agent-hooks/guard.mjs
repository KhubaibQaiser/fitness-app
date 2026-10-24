#!/usr/bin/env node
// Guard for agent tool calls. One script serves Cursor hooks (beforeShellExecution,
// beforeReadFile) and Claude Code PreToolUse hooks. No dependencies.
//
// It fails OPEN on internal errors, so a bug here can never lock anyone out of their tools.
// It is a seatbelt, not a sandbox: an agent with shell access can still edit this file.
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const tool = argv.includes('--tool') ? argv[argv.indexOf('--tool') + 1] : 'cursor';

// Policy switches. Dependency adds are denied for agents (supply-chain risk, and hallucinated
// package names): a human runs them. Set AGENT_GUARD_ALLOW_INSTALL=1 in the environment of the
// Cursor or Claude Code process to turn the deny into a confirmation.
const POLICY = {
  denyDependencyAdds: process.env.AGENT_GUARD_ALLOW_INSTALL !== '1',
  denyPushToMain: true,
};

const readInput = () => {
  try {
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
};

const SAFE_EXAMPLE = /\.(example|sample|template|dist)$/i;
const SAFE_RM_TARGETS =
  /^(\.\/)?(node_modules|dist|build|out|coverage|\.next|\.turbo|\.cache|\.expo|\.vercel|tmp|\.tmp|playwright-report|test-results)\/?$/;
const VALUE_FLAGS = new Set([
  '--filter',
  '-F',
  '--cwd',
  '-C',
  '--prefix',
  '--registry',
  '--workspace',
  '-w',
]);

const sensitivePath = (p) => {
  if (!p) return false;
  const s = String(p)
    .replace(/^['"]|['"]$/g, '')
    .replace(/^~(?=\/|$)/, '$HOME');
  const base = s.split('/').pop();
  if (/^\.env(\..+)?$/.test(base)) return !SAFE_EXAMPLE.test(base);
  if (/(^|\/)\.(ssh|gnupg)\//.test(s) && !/\.pub$/.test(base)) return true;
  if (/(^|\/)\.aws\/(credentials|config)$/.test(s)) return true;
  if (/^id_(rsa|ed25519|ecdsa|dsa)$/.test(base)) return true;
  if (/\.(pem|p12|pfx|keystore)$/i.test(base)) return true;
  if (/^\.(netrc|pgpass)$/.test(base)) return true;
  if (/\.tfstate(\..+)?$/.test(base) || /\.tfvars$/.test(base)) return true;
  return false;
};

const DENY = [
  [
    /\bgit\s+push\b[^;&|\n]*(\s--force(?!-with-lease)(\s|=|$)|\s-f(\s|$))/,
    'force push (use --force-with-lease, and only on your own branch)',
  ],
  [
    /\b(curl|wget)\b[^|\n]*\|\s*(sudo\s+)?(ba|z|da|k)?sh\b/,
    'piping a download straight into a shell',
  ],
  [/\bchmod\b[^;&|\n]*\b0?777\b/, 'chmod 777'],
  [/\bdd\b[^;&|\n]*\bof=\/dev\//, 'writing to a block device'],
];

const ASK = [
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard discards local changes'],
  [/\bgit\s+clean\s+-[a-zA-Z]*f/, 'git clean deletes untracked files'],
  [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, 'discarding all working-tree changes'],
  [/\bgit\s+branch\s+-D\b/, 'force-deleting a branch'],
  [/(^|[;&|]\s*)sudo\b/, 'sudo'],
  [/\b(npm|pnpm|yarn)\s+(publish|unpublish)\b/, 'publishing a package'],
  [/\bcdk\s+(destroy|deploy)\b/, 'CDK deploy or destroy'],
  [/\bterraform\s+(destroy|apply)\b/, 'Terraform apply or destroy'],
  [/\baws\b[^;&|\n]*\b(delete|terminate|remove|rb)\b/, 'destructive AWS CLI call'],
  [/\baws\s+s3\s+rm\b[^;&|\n]*--recursive/, 'recursive S3 delete'],
  [/\bkubectl\s+delete\b/, 'kubectl delete'],
  [/\bdocker\s+(system|volume|image)\s+prune\b/, 'docker prune'],
  [/\bgh\s+(repo|release)\s+delete\b/, 'deleting a GitHub repo or release'],
  [/\bvercel\b[^;&|\n]*--prod\b/, 'production deploy'],
  [/\bdrop\s+(table|database|schema)\b/i, 'SQL DROP'],
];

const checkRm = (cmd) => {
  for (const m of cmd.matchAll(/(?:^|[;&|(]\s*|\s)rm\s+([^;&|\n]*)/g)) {
    const toks = m[1].trim().split(/\s+/).filter(Boolean);
    const flags = toks.filter((t) => t.startsWith('-')).join('');
    const targets = toks
      .filter((t) => !t.startsWith('-'))
      .map((t) => t.replace(/^['"]|['"]$/g, ''));
    if (!/-[a-zA-Z]*[rR]|--recursive/.test(flags)) continue;
    if (targets.some((t) => /^(\/|~|\$HOME|\/\*|~\/\*|\.|\.\.|\*|\.\/\*)$/.test(t))) {
      return ['deny', 'recursive delete of root, home, current or parent directory'];
    }
    if (!targets.every((t) => SAFE_RM_TARGETS.test(t))) {
      return ['ask', 'recursive delete outside build and cache folders'];
    }
  }
  return undefined;
};

const checkPushToMain = (cmd) => {
  if (!POLICY.denyPushToMain) return undefined;
  for (const m of cmd.matchAll(/\bgit\s+push\b([^;&|\n]*)/g)) {
    const refs = m[1]
      .trim()
      .split(/\s+/)
      .filter((t) => t && !t.startsWith('-'))
      .flatMap((t) => t.split(':'));
    if (refs.some((r) => /^(refs\/heads\/)?(main|master)$/.test(r))) {
      return ['deny', 'pushing to main or master (open a pull request from a branch instead)'];
    }
  }
  return undefined;
};

const checkInstall = (cmd) => {
  const found = [];
  const scan = (re) => {
    for (const m of cmd.matchAll(re)) {
      const toks = m[1].trim().split(/\s+/).filter(Boolean);
      for (let i = 0; i < toks.length; i += 1) {
        if (VALUE_FLAGS.has(toks[i])) {
          i += 1;
        } else if (!toks[i].startsWith('-')) {
          found.push(toks[i]);
        }
      }
    }
  };
  scan(/\b(?:npm|pnpm|yarn|bun)\s+(?:add|install|i)\b([^;&|\n]*)/g);
  scan(/\b(?:pip3?|uv)\s+(?:pip\s+)?(?:install|add)\b([^;&|\n]*)/g);
  if (found.length === 0) return undefined;
  const what = `adding dependency ${found.slice(0, 3).join(', ')}`;
  return POLICY.denyDependencyAdds
    ? ['deny', `${what}. Dependencies are added by a human: ask the user to run it`]
    : ['ask', `${what}: confirm it exists and is intended`];
};

const decide = ({ command, paths }) => {
  for (const p of paths) {
    if (sensitivePath(p))
      return ['deny', 'reading a secrets file (.env, SSH or AWS keys, PEM, Terraform state)'];
  }
  if (!command) return ['allow'];
  const tokens = command.split(/[\s'"`=<>|;&()]+/).filter(Boolean);
  if (!/\.gitignore\b/.test(command) && tokens.some(sensitivePath)) {
    return ['deny', 'touching a secrets file (.env, SSH or AWS keys, PEM, Terraform state)'];
  }
  const early = checkRm(command) ?? checkPushToMain(command);
  if (early) return early;
  for (const [re, why] of DENY) if (re.test(command)) return ['deny', why];
  const install = checkInstall(command);
  if (install) return install;
  for (const [re, why] of ASK) if (re.test(command)) return ['ask', why];
  return ['allow'];
};

const respond = (decision, why) => {
  const msg =
    decision === 'deny'
      ? `Blocked by guard: ${why}. If this is intended, ask the user to run it manually.`
      : `Confirm: ${why}`;
  if (tool === 'claude') {
    if (decision === 'allow') return;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: decision,
          permissionDecisionReason: msg,
        },
      }),
    );
    return;
  }
  process.stdout.write(
    JSON.stringify(
      decision === 'allow'
        ? { permission: 'allow' }
        : { permission: decision, user_message: msg, agent_message: msg },
    ),
  );
};

try {
  const input = readInput();
  let command = '';
  const paths = [];
  if (tool === 'cursor') {
    if (typeof input.command === 'string') command = input.command;
    if (typeof input.file_path === 'string') paths.push(input.file_path);
  } else {
    // Cursor also imports Claude hooks and translates tool names. Its native hooks already cover
    // that call, so stay silent instead of running twice.
    const fromCursor =
      input.conversation_id || input.generation_id || input.model_id || input.workspace_roots;
    if (fromCursor || input.tool_name === 'Shell') process.exit(0);
    const toolInput = input.tool_input ?? {};
    if (input.tool_name === 'Bash') command = String(toolInput.command ?? '');
    if (input.tool_name === 'Read' || input.tool_name === 'Grep') {
      paths.push(String(toolInput.file_path ?? toolInput.path ?? ''));
    }
  }
  const [decision, why] = decide({ command, paths });
  respond(decision, why);
} catch {
  if (tool === 'cursor') process.stdout.write(JSON.stringify({ permission: 'allow' }));
}
process.exitCode = 0;
