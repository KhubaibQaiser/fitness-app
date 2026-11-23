#!/usr/bin/env node
// Guard for agent tool calls. One script serves Cursor hooks (beforeShellExecution,
// beforeReadFile) and Claude Code PreToolUse hooks. No dependencies.
//
// On an internal error or unreadable input it asks the human instead of deciding, so a failure is
// never silent and never locks anyone out. It is a seatbelt, not a sandbox: an interpreter or a broad
// glob can still reach a secret, and changing this file through the shell only asks.
import { spawnSync } from 'node:child_process';
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
  const raw = readFileSync(0, 'utf8');
  if (raw.trim() === '') throw new Error('empty hook input');
  return JSON.parse(raw);
};

const SAFE_EXAMPLE = /\.(example|sample|template|dist)$/i;
const SAFE_RM_TARGETS =
  /^(\.\/)?(node_modules|dist|build|out|coverage|\.next|\.turbo|\.cache|\.expo|\.vercel|tmp|\.tmp|playwright-report|test-results)\/?$/;
// Flags whose next token is a value, not a package name.
const VALUE_FLAGS = new Set([
  '--filter',
  '-F',
  '--cwd',
  '-C',
  '--dir',
  '--prefix',
  '--registry',
  '--workspace',
]);
// pip: requirement files, constraints, editable paths and indexes are not package names.
const PIP_VALUE_FLAGS = new Set([
  '-r',
  '--requirement',
  '-c',
  '--constraint',
  '-e',
  '--editable',
  '-i',
  '--index-url',
  '--extra-index-url',
  '-t',
  '--target',
  '--prefix',
  '--root',
  '--python',
]);
// Upgrading a named package pulls a new version in, so it counts as an add.
const JS_ADD = new Set(['add', 'install', 'i', 'up', 'update', 'upgrade']);
const PY_ADD = new Set(['add', 'install']);
const REDIRECTION = /\d*[<>]+&?\d*\s*[^\s;&|]*/g;
// Git options that may sit between "git" and its subcommand, as in "git -C dir push".
const GIT_GLOBAL_OPTS = /\bgit((?:\s+(?:-[Cc]\s+\S+|--[\w-]+(?:=\S+)?|-[pP]))+)(?=\s+[a-z])/g;
const GUARDRAIL_PATH =
  /(scripts\/agent-hooks\/|\.claude\/settings(\.local)?\.json|\.cursor\/hooks\.json|lefthook\.yml|\.github\/workflows\/)/;
const SHELL_WRITE =
  /(>{1,2}|\bsed\s+-[a-zA-Z]*i|\btee\b|\bmv\b|\bcp\b|\brm\b|\btruncate\b|\bchmod\b|\bperl\s+-[a-zA-Z]*i|\bgit\s+(checkout|restore)\b)/;
// Names a glob is tested against: if a glob could expand to one of these, it can reach a secret.
const SECRET_SAMPLES = [
  '.env',
  '.env.local',
  '.env.production',
  'id_rsa',
  'id_ed25519',
  'server.pem',
  'cert.p12',
  'terraform.tfstate',
  'prod.tfvars',
  '.netrc',
  '.pgpass',
];

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

// A glob with at least two literal characters, such as ".en*" or "*.pem", that could expand to a
// secret file. Bare "*" and ".*" are left alone: they match too much to block safely.
const secretGlob = (token) => {
  const base = token.split('/').pop();
  if (!/[*?[]/.test(base) || base.replace(/[*?]|\[[^\]]*\]/g, '').length < 2) return false;
  const re = new RegExp(
    `^${base
      .replace(/[.+^${}()|\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')}$`,
  );
  return SECRET_SAMPLES.some(
    (name) => (name.startsWith('.') ? base.startsWith('.') : true) && re.test(name),
  );
};

const DENY = [
  [
    /\bgit\s+push\b[^;&|\n]*(\s--force(?!-with-lease)(\s|=|$)|\s-f(\s|$))/,
    'force push (use --force-with-lease, and only on your own branch)',
  ],
  [/\bcore\.hooksPath\b/, 'changing where git hooks live (turns off gitleaks, format and lint)'],
  [/\bLEFTHOOK=0\b/, 'turning off lefthook (gitleaks, format and lint)'],
  [/\bgit\b[^;&|\n]*\s--no-verify\b/, 'skipping git hooks (gitleaks, format and lint)'],
  [
    /\bgit\s+commit\b[^;&|\n]*\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/,
    'skipping git hooks with commit -n (gitleaks, format and lint)',
  ],
  [
    /(^|[;&|(`]\s*|\$\(\s*)(printenv\b|env\s*($|[|;&>)]))|\/proc\/[^\s/]+\/environ\b/,
    'printing environment variables (they hold secrets)',
  ],
  [
    /\b(curl|wget)\b[^|\n]*\|\s*(sudo\s+)?(ba|z|da|k)?sh\b/,
    'piping a download straight into a shell',
  ],
  [
    /\|\s*(sudo\s+)?(ba|z|da|k)?sh(\s+-s)?\s*($|[;&|)])/,
    'piping text into a shell (it hides what actually runs)',
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
  [
    /\bgrep\s+(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)\b[^;&|\n]*\s\.\/?\s*($|[;&|>)])/,
    'recursive grep from the repo root also reads ignored secret files (use rg, the Grep tool or a narrower path)',
  ],
  [/\bgh\s+pr\s+merge\b/, 'merging a pull request (the owner decides)'],
  [
    /\bgh\s+api\b[^;&|\n]*(-X|--method)[\s=]*(DELETE|PUT|PATCH)\b/i,
    'changing GitHub state through the API',
  ],
  [
    /\b(npm|pnpm|yarn|bun)\s+(up|update|upgrade)\b[^;&|\n]*--latest\b/,
    'upgrading dependencies to their latest versions',
  ],
  [
    /\bnpx\b|\bbunx\b|\b(pnpm|yarn)\s+dlx\b|\bnpm\s+exec\b/,
    'running a package that may be downloaded from the registry (use pnpm exec for repo tools)',
  ],
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

const isMainRef = (r) => /^(refs\/heads\/)?(main|master)$/.test(r);
const PUSH_TO_MAIN = 'pushing to main or master (open a pull request from a branch instead)';

const currentBranch = (cwd) => {
  // symbolic-ref also works before the first commit; a detached HEAD has no branch.
  const r = spawnSync(
    'git',
    ['-C', cwd || process.cwd(), 'symbolic-ref', '--short', '-q', 'HEAD'],
    {
      encoding: 'utf8',
      timeout: 3000,
    },
  );
  return r.status === 0 ? r.stdout.trim() : undefined;
};

const checkPush = (cmd, cwd) => {
  for (const m of cmd.matchAll(/\bgit\s+push\b([^;&|\n]*)/g)) {
    const args = m[1].replace(REDIRECTION, ' ').trim().split(/\s+/).filter(Boolean);
    const refspecs = args.filter((t) => !t.startsWith('-')).slice(1); // the first one is the remote
    if (refspecs.some((r) => r.startsWith('+'))) {
      return ['deny', 'force push through a +refspec (use --force-with-lease on your own branch)'];
    }
    if (!POLICY.denyPushToMain) continue;
    if (args.includes('--all') || args.includes('--mirror')) {
      return ['deny', 'pushing every branch, main included'];
    }
    if (refspecs.some((r) => isMainRef(r.split(':').pop()))) return ['deny', PUSH_TO_MAIN];
    // No refspec, or plain HEAD, pushes the branch that is checked out.
    if (refspecs.length === 0 || refspecs.includes('HEAD')) {
      const branch = currentBranch(cwd);
      if (branch === undefined) {
        return ['ask', 'git push without a branch name, and the current branch could not be read'];
      }
      if (isMainRef(branch)) return ['deny', PUSH_TO_MAIN];
    }
  }
  return undefined;
};

// Package names an install command would add. Flags (with their values) may come before the
// subcommand, as in "pnpm --filter web add zod". Redirections, local paths and requirement files
// are not packages, so restoring from a lockfile adds nothing.
const addedPackages = (args, subcommands, valueFlags) => {
  const toks = args.replace(REDIRECTION, ' ').trim().split(/\s+/).filter(Boolean);
  let i = 0;
  const skipFlags = () => {
    while (toks[i]?.startsWith('-')) i += valueFlags.has(toks[i]) ? 2 : 1;
  };
  skipFlags();
  if (toks[i] === 'pip') {
    i += 1; // "uv pip install"
    skipFlags();
  }
  if (!subcommands.has(toks[i])) return [];
  const names = [];
  for (i += 1; i < toks.length; i += 1) {
    if (valueFlags.has(toks[i])) i += 1;
    else if (!/^[-./~]/.test(toks[i])) names.push(toks[i]);
  }
  return names;
};

const checkInstall = (cmd) => {
  const found = [];
  for (const m of cmd.matchAll(/\b(?:npm|pnpm|yarn|bun)\s+([^;&|\n]*)/g)) {
    found.push(...addedPackages(m[1], JS_ADD, VALUE_FLAGS));
  }
  for (const m of cmd.matchAll(/\b(?:pip3?|uv)\s+([^;&|\n]*)/g)) {
    found.push(...addedPackages(m[1], PY_ADD, PIP_VALUE_FLAGS));
  }
  if (found.length === 0) return undefined;
  const what = `adding or upgrading dependency ${found.slice(0, 3).join(', ')}`;
  return POLICY.denyDependencyAdds
    ? ['deny', `${what}. Dependencies are added by a human: ask the user to run it`]
    : ['ask', `${what}: confirm it exists and is intended`];
};

const SECRETS = '(.env, SSH or AWS keys, PEM, Terraform state)';

const decide = ({ command: raw, paths, writing, cwd }) => {
  for (const p of paths) {
    if (sensitivePath(p))
      return ['deny', `${writing ? 'writing' : 'reading'} a secrets file ${SECRETS}`];
  }
  if (!raw) return ['allow'];
  const command = raw.replace(GIT_GLOBAL_OPTS, 'git');
  // Quotes and backslashes join a word back together in the shell, as in .e""nv or .e\nv.
  const words = (s) => s.split(/[\s'"`=<>|;&()]+/).filter(Boolean);
  const tokens = [...words(command), ...words(command.replace(/["'`\\]/g, ''))];
  if (!/\.gitignore\b/.test(command) && tokens.some((t) => sensitivePath(t) || secretGlob(t))) {
    return ['deny', `touching a secrets file ${SECRETS}`];
  }
  const rm = checkRm(command);
  if (rm) return rm;
  // Raw too: normalising "git -c core.hooksPath=... commit" would hide the option.
  for (const [re, why] of DENY) if (re.test(command) || re.test(raw)) return ['deny', why];
  const push = checkPush(command, cwd);
  if (push) return push;
  const install = checkInstall(command);
  if (install) return install;
  if (GUARDRAIL_PATH.test(command) && SHELL_WRITE.test(command.replace(/\d*>&\d+/g, ''))) {
    return ['ask', 'changing the agent guardrails (hooks, agent settings, git hooks or workflows)'];
  }
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
  let writing = false;
  const cwd = typeof input.cwd === 'string' ? input.cwd : undefined;
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
    if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(input.tool_name)) {
      paths.push(String(toolInput.file_path ?? toolInput.notebook_path ?? ''));
      writing = true;
    }
  }
  const [decision, why] = decide({ command, paths, writing, cwd });
  respond(decision, why);
} catch (error) {
  // Never silent and never a lockout: say what broke and let the human decide.
  const why = `the guard could not check this call (${error instanceof Error ? error.message : String(error)})`;
  process.stderr.write(`[agent-guard] ${why}\n`);
  respond('ask', why);
}
process.exitCode = 0;
