#!/usr/bin/env node
// Guard for agent tool calls. One script serves Cursor hooks (beforeShellExecution,
// beforeReadFile) and Claude Code PreToolUse hooks. No dependencies.
//
// Input that is not what a hook sends, or an internal error, makes it ask the human instead of
// deciding: a failure is never silent and never a lockout. It is a seatbelt, not a sandbox. It
// matches command text, so a script that builds a file name at run time, a bare "*" or ".*" glob,
// or deliberate quoting tricks can still get past it.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOOLS = new Set(['claude', 'cursor']);
const argv = process.argv.slice(2);
const tool = argv.includes('--tool') ? argv[argv.indexOf('--tool') + 1] : 'cursor';
if (!TOOLS.has(tool)) {
  process.stderr.write(`[agent-guard] unknown --tool "${tool}": use claude or cursor\n`);
  process.exit(2);
}

// Policy switches. Dependency adds are denied for agents (supply-chain risk, and hallucinated
// package names): a human runs them. Set AGENT_GUARD_ALLOW_INSTALL=1 in the environment of the
// Cursor or Claude Code process to turn the deny into a confirmation.
const POLICY = {
  denyDependencyAdds: process.env.AGENT_GUARD_ALLOW_INSTALL !== '1',
  denyPushToMain: true,
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
const GIT_GLOBAL_OPTS = /\bgit((?:\s+(?:-[Cc]\s*\S+|--[\w-]+(?:=\S+)?|-[pP]))+)(?=\s+[a-z])/g;
const GUARDRAIL_PATH =
  /(scripts\/agent-hooks\/|scripts\/pr-contract\/|\.claude\/settings(\.local)?\.json|\.cursor\/hooks\.json|lefthook\.yml|\.github\/workflows\/)/;
const SHELL_WRITE =
  /(>{1,2}|\bsed\s+-[a-zA-Z]*i|\btee\b|\bmv\b|\bcp\b|\brm\b|\btruncate\b|\bchmod\b|\bperl\s+-[a-zA-Z]*i|\bgit\s+(checkout|restore)\b)/;
// A quoted string, double or single. Unbalanced quotes are left alone.
const QUOTED = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
// "sh -c '...'" and the like: the quoted script is checked as a command of its own.
const SHELL_STRING = /\b(?:ba|z|da|k)?sh\s+-[a-zA-Z]*c\s+("(?:[^"\\]|\\.)*"|'[^']*'|[^\s;&|'"]+)/g;
const MAX_TOKEN = 512;
// Names a glob is tested against: if a glob could expand to one of these, it can reach a secret.
const SECRET_SAMPLES = [
  '.env',
  '.env.local',
  '.env.production',
  'id_rsa',
  'id_ed25519',
  'server.pem',
  'server.key',
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
  // macOS file systems ignore case, so .ENV is the same file as .env.
  if (/^\.env(\..+)?$/i.test(base)) return !SAFE_EXAMPLE.test(base);
  if (/(^|\/)\.(ssh|gnupg)\//i.test(s) && !/\.pub$/i.test(base)) return true;
  if (/(^|\/)\.aws\/(credentials|config)$/i.test(s)) return true;
  if (/^id_(rsa|ed25519|ecdsa|dsa)$/i.test(base)) return true;
  if (/\.(pem|key|p12|pfx|keystore)$/i.test(base)) return true;
  if (/^\.(netrc|pgpass)$/i.test(base)) return true;
  if (/\.tfstate(\..+)?$/i.test(base) || /\.tfvars$/i.test(base)) return true;
  return false;
};

// Shell-style glob match (* ? [...]) without building a RegExp from the token, so a long or
// malformed token can neither hang nor throw. Case-insensitive, like the file systems it guards.
const globMatch = (pattern, name) => {
  const p = pattern.toLowerCase();
  const s = name.toLowerCase();
  const classAt = (i, ch) => {
    const end = p.indexOf(']', i + 2);
    if (end === -1) return undefined;
    let body = p.slice(i + 1, end);
    const negate = body[0] === '!' || body[0] === '^';
    if (negate) body = body.slice(1);
    let hit = false;
    for (let k = 0; k < body.length; k += 1) {
      if (body[k + 1] === '-' && k + 2 < body.length) {
        if (ch >= body[k] && ch <= body[k + 2]) hit = true;
        k += 2;
      } else if (body[k] === ch) hit = true;
    }
    return [hit !== negate, end + 1];
  };
  let pi = 0;
  let si = 0;
  let starP = -1;
  let starS = 0;
  while (si < s.length) {
    const pc = p[pi];
    if (pc === '*') {
      starP = pi;
      pi += 1;
      starS = si;
      continue;
    }
    let matched = false;
    let next = pi + 1;
    if (pc === '?') matched = true;
    else if (pc === '[') {
      const c = classAt(pi, s[si]);
      if (c) [matched, next] = c;
      else matched = s[si] === '[';
    } else matched = pc !== undefined && pc === s[si];
    if (matched) {
      pi = next;
      si += 1;
    } else if (starP !== -1) {
      pi = starP + 1;
      starS += 1;
      si = starS;
    } else return false;
  }
  while (p[pi] === '*') pi += 1;
  return pi === p.length;
};

// A glob that could expand to a secret file: one with at least two literal characters, such as
// ".en*" or "*.pem", or any glob inside ~/.ssh, ~/.aws or ~/.gnupg. Bare "*" and ".*" are left
// alone: they match too much to block safely.
const secretGlob = (token) => {
  if (token.length > MAX_TOKEN || !/[*?[]/.test(token)) return false;
  if (/(^|\/)\.(ssh|aws|gnupg)\//i.test(token)) return true;
  const base = token.split('/').pop();
  if (!/[*?[]/.test(base) || base.replace(/[*?]|\[[^\]]*\]/g, '').length < 2) return false;
  return SECRET_SAMPLES.some(
    (name) => (name.startsWith('.') ? base.startsWith('.') : true) && globMatch(base, name),
  );
};

// Bash brace expansion, as in .e{n,m}v, .env{,.bak} or .{a,{e,f}}nv: expanded innermost group
// first so the secrets checks see what the shell would. ${VAR} is not a brace group. Returns
// undefined when the expansion is too large to check, so the caller can ask instead of guessing.
const MAX_EXPANSIONS = 256;
const BRACE_GROUP = /(?<!\$)\{([^{}]*,[^{}]*)\}/;
const expandBraces = (token) => {
  if (token.length > MAX_TOKEN) return undefined;
  let out = [token];
  for (let round = 0; round < 16; round += 1) {
    let changed = false;
    const next = [];
    for (const w of out) {
      const m = BRACE_GROUP.exec(w);
      if (!m) next.push(w);
      else {
        changed = true;
        const before = w.slice(0, m.index);
        const after = w.slice(m.index + m[0].length);
        for (const part of m[1].split(',')) next.push(`${before}${part}${after}`);
      }
    }
    if (next.length > MAX_EXPANSIONS) return undefined;
    out = next;
    if (!changed) return out;
  }
  return undefined;
};
// 'secret', 'unknown' (too large to expand) or undefined.
const secretToken = (t) => {
  const words = t.includes('{') ? expandBraces(t) : [t];
  if (words === undefined) return 'unknown';
  return words.some((w) => sensitivePath(w) || secretGlob(w)) ? 'secret' : undefined;
};

// Commands an env dump may hide behind, and an optional path such as /usr/bin/.
const ENV_PREFIX = String.raw`(?:(?:time|nohup|exec|command|builtin|sudo|xargs|npx)\s+|(?:pnpm|npm|yarn)\s+exec\s+)*\\?(?:\S*\/)?`;
const STATEMENT = String.raw`(?:^|[;&|(\x60]\s*|\$\(\s*)`;

// Checked against the command with quoted strings blanked out, so a commit message or PR text that
// mentions one of these does not trip it.
const DENY = [
  [
    /\bgit\s+push\b[^;&|\n]*\s(--force(?!-with-lease)(?:\s|=|$|[;&|)])|-[a-zA-Z]*f[a-zA-Z]*(?:\s|$|[;&|)]))/,
    'force push (use --force-with-lease, and only on your own branch)',
  ],
  [/core\.hookspath/i, 'changing where git hooks live (turns off gitleaks, format and lint)'],
  [/\bLEFTHOOK=0\b/, 'turning off lefthook (gitleaks, format and lint)'],
  [/\bgit\b[^;&|\n]*\s--no-veri(?:fy?)?\b/, 'skipping git hooks (gitleaks, format and lint)'],
  [
    /\bgit\s+commit\b[^;&|\n]*\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/,
    'skipping git hooks with commit -n (gitleaks, format and lint)',
  ],
  [
    new RegExp(
      `${STATEMENT}${ENV_PREFIX}(printenv\\b|env\\s*($|[|;&>)])|export\\s+-p\\b|declare\\s+-[xp]\\b|set\\s*($|[|;&>)]))|\\/proc\\/[^\\s/]+\\/environ\\b`,
    ),
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
  [/\b(ba|z|da|k)?sh\s+<\(/, 'running a script from a process substitution'],
  [/\bchmod\b[^;&|\n]*\b0?777\b/, 'chmod 777'],
  [/\bdd\b[^;&|\n]*\bof=\/dev\//, 'writing to a block device'],
];

// A gh command, allowing "-R owner/repo" or "--repo owner/repo" before the subcommand.
const GH = String.raw`\bgh\s+(?:(?:-R|--repo)(?:\s+|=)\S+\s+)*`;
const GITHUB_STATE = 'changing GitHub state (the owner decides)';

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
  [new RegExp(`${GH}(repo|release)\\s+delete\\b`), 'deleting a GitHub repo or release'],
  [/\bvercel\b[^;&|\n]*--prod\b/, 'production deploy'],
  [/\bdrop\s+(table|database|schema)\b/i, 'SQL DROP'],
  [
    /\bgrep\s+(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)\b[^;&|\n]*\s\.\/?\s*($|[;&|>)])/,
    'recursive grep from the repo root also reads ignored secret files (use rg, the Grep tool or a narrower path)',
  ],
  [
    /\brg\b[^;&|\n]*\s(-u{2,}|--no-ignore(?:-vcs)?)\b/,
    'rg that ignores .gitignore also reads secret files',
  ],
  [new RegExp(`${GH}pr\\s+merge\\b`), 'merging a pull request (the owner decides)'],
  [
    new RegExp(`${GH}api\\b[^;&|\\n]*(-X|--method)[\\s=]*(DELETE|PUT|PATCH|POST)\\b`, 'i'),
    GITHUB_STATE,
  ],
  [
    new RegExp(
      `${GH}(secret\\s+(set|delete)|variable\\s+(set|delete)|workflow\\s+(run|enable|disable)|release\\s+(create|edit|upload)|alias\\s+set|repo\\s+(edit|rename|archive))\\b`,
    ),
    GITHUB_STATE,
  ],
  [new RegExp(`${GH}auth\\s+(token|status\\s+(-t|--show-token))\\b`), 'printing a GitHub token'],
  [new RegExp(`${GH}api\\b[^;&|\\n]*\\s(-f|-F|--field|--raw-field|--input)\\b`), GITHUB_STATE],
  [
    new RegExp(
      `${GH}(pr\\s+(close|reopen)|issue\\s+(close|delete|transfer)|extension\\s+install)\\b`,
    ),
    GITHUB_STATE,
  ],
  [
    /\bgit\s+config\b[^;&|\n]*\s(alias\.|remote\.\S+\.push\b|push\.default\b)/,
    'changing git aliases or where git pushes',
  ],
  [/\b(brew|apt|apt-get|dnf|yum|pacman)\s+(install|add|upgrade)\b/, 'installing system packages'],
  [/(^|[;&|(]\s*)eval\b/, 'eval runs text built at run time'],
  [
    /\b(npm|pnpm|yarn|bun)\s+(up|update|upgrade)\b[^;&|\n]*--latest\b/,
    'upgrading dependencies to their latest versions',
  ],
  [
    /\bnpx\b|\bbunx\b|\bbun\s+x\b|\b(pnpm|yarn)\s+dlx\b|\bnpm\s+exec\b|\b(pnpm|npm|yarn|bun)\s+create\b|\bnpm\s+init\s+[^-\s]/,
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
  const r = spawnSync('git', ['-C', cwd, 'symbolic-ref', '--short', '-q', 'HEAD'], {
    encoding: 'utf8',
    timeout: 3000,
  });
  if (r.status === 0) return { branch: r.stdout.trim() };
  const cause =
    r.error?.message ??
    (r.signal ? `killed by ${r.signal}` : r.stderr.trim() || 'detached HEAD or not a repository');
  process.stderr.write(`[agent-guard] could not read the branch in ${cwd}: ${cause}\n`);
  return { cause };
};

// cmd: quote characters removed, so "main" reads as main. structural: quoted strings blanked, so
// text inside a commit message is not taken for a push.
const checkPush = (cmd, structural, cwd, written) => {
  if (!/\bgit\s+push\b/.test(structural)) return undefined;
  for (const m of cmd.matchAll(/\bgit\s+push\b([^;&|\n]*)/g)) {
    const args = m[1]
      .replace(REDIRECTION, ' ')
      .split(/\s+/)
      .map((t) => t.replace(/^[(\x60]+|[)\x60;]+$/g, ''))
      .filter(Boolean);
    const refspecs = args.filter((t) => !t.startsWith('-')).slice(1); // the first one is the remote
    if (refspecs.some((r) => r.startsWith('+'))) {
      return ['deny', 'force push through a +refspec (use --force-with-lease on your own branch)'];
    }
    if (!POLICY.denyPushToMain) continue;
    if (args.includes('--all') || args.includes('--mirror')) {
      return ['deny', 'pushing every branch, main included'];
    }
    if (refspecs.some((r) => isMainRef(r.split(':').pop()))) return ['deny', PUSH_TO_MAIN];
    if (refspecs.some((r) => r.includes('$'))) {
      return [
        'ask',
        'git push to a branch named by a variable (the target is not known until it runs)',
      ];
    }
    // No refspec, or plain HEAD, pushes the branch that is checked out.
    if (refspecs.length === 0 || refspecs.includes('HEAD')) {
      const before = cmd.slice(0, m.index);
      if (/(^|[;&|(]\s*)cd\s|\bgit\s+(checkout|switch)\b/.test(before)) {
        return [
          'ask',
          'git push without a branch name after a cd or branch change in the same command',
        ];
      }
      const dir = written.match(/\bgit\s+(?:-c\s*\S+\s+)*-C\s*(\S+)[^;&|\n]*\bpush\b/)?.[1];
      const where = resolve(cwd ?? process.cwd(), dir ?? '.');
      const { branch, cause } = currentBranch(where);
      if (branch === undefined) {
        return [
          'ask',
          `git push without a branch name, and the current branch could not be read (${cause})`,
        ];
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
  for (const m of cmd.matchAll(/\b(?:pip3?|uv|poetry)\s+([^;&|\n]*)/g)) {
    found.push(...addedPackages(m[1], PY_ADD, PIP_VALUE_FLAGS));
  }
  for (const m of cmd.matchAll(/\b(?:cargo\s+add|go\s+get)\s+([^;&|\n]*)/g)) {
    found.push(...m[1].split(/\s+/).filter((t) => t && !t.startsWith('-')));
  }
  if (found.length === 0) return undefined;
  const what = `adding or upgrading dependency ${found.slice(0, 3).join(', ')}`;
  return POLICY.denyDependencyAdds
    ? ['deny', `${what}. Dependencies are added by a human: ask the user to run it`]
    : ['ask', `${what}: confirm it exists and is intended`];
};

const SECRETS = '(.env, SSH or AWS keys, PEM, Terraform state)';
// The one command that may name a secrets file: a lone, single-line echo or printf appending to a
// file named .gitignore (or dir/.gitignore), as in "echo .env >> .gitignore". Nothing else rides
// along, and an escaped ">>" is not an append.
const IGNORE_APPEND =
  /^[ \t]*(?:echo|printf)[ \t][^;&|<>`$()\n]*(?<!\\)>>[ \t]*(['"]?)(?:[\w./-]*\/)?\.gitignore\1[ \t]*$/;
const words = (s) => s.split(/[\s'"`=<>|;&()@:]+/).filter(Boolean);

const decide = ({ command: written, paths, globs = [], writing = false, cwd }, depth = 0) => {
  for (const p of paths) {
    if (sensitivePath(p))
      return ['deny', `${writing ? 'writing' : 'reading'} a secrets file ${SECRETS}`];
  }
  for (const g of globs) {
    if (sensitivePath(g) || secretGlob(g)) return ['deny', `searching secrets files ${SECRETS}`];
  }
  if (!written) return ['allow'];
  // A backslash at the end of a line joins it to the next one, even in the middle of a word.
  const raw = written.replace(/\\\r?\n/g, '');
  const command = raw.replace(GIT_GLOBAL_OPTS, 'git');
  // Three views: as written, with quote characters removed (".e""nv" reads as .env), and with
  // quoted strings blanked out (a commit message is not a command).
  const plain = raw.replace(/["'`\\]/g, '');
  const unquoted = plain.replace(GIT_GLOBAL_OPTS, 'git');
  const blanked = raw.replace(QUOTED, 'Q');
  const structural = blanked.replace(GIT_GLOBAL_OPTS, 'git');

  const tokens = [...words(command), ...words(unquoted)];
  if (!IGNORE_APPEND.test(raw)) {
    const found = tokens.map(secretToken);
    if (found.includes('secret')) return ['deny', `touching a secrets file ${SECRETS}`];
    if (found.includes('unknown')) {
      return ['ask', 'a brace expansion too large to check for secrets files'];
    }
  }
  if (depth < 2) {
    for (const m of raw.matchAll(SHELL_STRING)) {
      const quoted = /^["']/.test(m[1]);
      const script = quoted ? m[1].slice(1, -1).replace(/\\(["\\])/g, '$1') : m[1];
      const inner = decide({ command: script, paths: [], cwd }, depth + 1);
      if (inner[0] !== 'allow') return inner;
    }
  }
  const rm = checkRm(command);
  if (rm) return rm;
  // Before normalising too: "git -c core.hooksPath=... commit" would lose the option.
  for (const [re, why] of DENY) if (re.test(structural) || re.test(blanked)) return ['deny', why];
  // In a git config command a quoted key is still the key: core.hooks""Path is core.hooksPath.
  if (/\bgit\s+config\b/.test(structural) && /core\.hookspath/i.test(unquoted)) {
    return ['deny', 'changing where git hooks live (turns off gitleaks, format and lint)'];
  }
  const push = checkPush(unquoted, structural, cwd, plain);
  if (push) return push;
  const install = checkInstall(structural);
  if (install) return install;
  if (GUARDRAIL_PATH.test(unquoted) && SHELL_WRITE.test(structural.replace(/\d*>&\d+/g, ''))) {
    return ['ask', 'changing the agent guardrails (hooks, agent settings, git hooks or workflows)'];
  }
  // The GraphQL merge sits inside a quoted query, so look for it in the text as written.
  if (/\bgh\s+api\b/.test(structural) && /mergePullRequest/i.test(raw))
    return ['ask', GITHUB_STATE];
  for (const [re, why] of ASK) if (re.test(structural)) return ['ask', why];
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

// The hook input is a trust boundary: anything that is not the shape a hook sends is an error.
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (value, name, required = false) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string') throw new Error(`${name} is not a string`);
  return value;
};
const parseInput = () => {
  const raw = readFileSync(0, 'utf8');
  if (raw.trim() === '') throw new Error('empty hook input');
  const input = JSON.parse(raw);
  if (!isObject(input)) throw new Error('hook input is not a JSON object');
  return input;
};
const FILE_WRITERS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

try {
  const input = parseInput();
  const cwd = str(input.cwd, 'cwd');
  const call = { command: '', paths: [], globs: [], writing: false, cwd };
  if (tool === 'cursor') {
    call.command = str(input.command, 'command') ?? '';
    const file = str(input.file_path, 'file_path');
    if (file !== undefined) call.paths.push(file);
    if (input.command === undefined && file === undefined) {
      throw new Error('neither command nor file_path in the hook input');
    }
  } else {
    // Cursor also imports Claude hooks and translates tool names. Its native hooks already cover
    // that call, so stay silent instead of running twice.
    const fromCursor =
      input.conversation_id || input.generation_id || input.model_id || input.workspace_roots;
    if (fromCursor || input.tool_name === 'Shell') process.exit(0);
    const name = str(input.tool_name, 'tool_name', true);
    const toolInput = input.tool_input ?? {};
    if (!isObject(toolInput)) throw new Error('tool_input is not an object');
    if (name === 'Bash') call.command = str(toolInput.command, 'command', true);
    if (name === 'Read' || name === 'Grep' || name === 'Glob') {
      const p = str(toolInput.file_path, 'file_path') ?? str(toolInput.path, 'path');
      if (p !== undefined) call.paths.push(p);
    }
    if (name === 'Grep' || name === 'Glob') {
      for (const key of ['glob', 'pattern']) {
        const g = str(toolInput[key], key);
        if (g !== undefined && (name === 'Glob' || key === 'glob')) call.globs.push(g);
      }
    }
    if (FILE_WRITERS.has(name)) {
      const p =
        str(toolInput.file_path, 'file_path') ?? str(toolInput.notebook_path, 'notebook_path');
      if (p !== undefined) call.paths.push(p);
      call.writing = true;
    }
  }
  const [decision, why] = decide(call);
  respond(decision, why);
} catch (error) {
  // Never silent and never a lockout: say what broke and let the human decide.
  const why = `the guard could not check this call (${error instanceof Error ? error.message : String(error)})`;
  process.stderr.write(`[agent-guard] ${why}\n`);
  respond('ask', why);
}
process.exitCode = 0;
