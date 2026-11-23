#!/usr/bin/env node
// Checks a pull request body against the PR contract in AGENTS.md: one Track ticked, a spec or ADR
// linked, and the fresh-context reviewer's last line with no blockers. Docs-only PRs need only the
// Track. Run in CI with the body in PR_BODY. No dependencies.
import { pathToFileURL } from 'node:url';

const section = (text, heading) =>
  text.split(/^## /m).find((s) => s.startsWith(`${heading}\n`) || s.startsWith(`${heading}\r\n`)) ??
  '';

export const checkPrBody = (body) => {
  // The template's own guidance lives in HTML comments; only what the author wrote counts.
  const text = String(body ?? '').replace(/<!--[\s\S]*?-->/g, '');
  const problems = [];

  const ticked = [...section(text, 'Track').matchAll(/^\s*-\s*\[[xX]\]\s*(.+)$/gm)].map((m) =>
    m[1].trim(),
  );
  if (ticked.length === 0) problems.push('Tick one box under "Track".');
  if (ticked.some((t) => /^Docs-only\b/i.test(t))) return problems;

  if (!/docs\/(specs|adr)\/[\w.-]+\.md/.test(text)) {
    problems.push('Link a spec (`docs/specs/<name>.md`) or an ADR (`docs/adr/<name>.md`).');
  }
  const review = text.match(/BLOCKERS:\s*(\d+)\s*,\s*NON-BLOCKING:\s*(\d+)/i);
  if (!review) {
    problems.push(
      'Paste the reviewer subagent\'s last line ("BLOCKERS: <n>, NON-BLOCKING: <n>") under "Review".',
    );
  } else if (Number(review[1]) > 0) {
    problems.push(`The review reports ${review[1]} blocker(s). Fix them and re-run the reviewer.`);
  }
  return problems;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.PR_BODY === undefined) {
    console.error('PR_BODY is not set: run this from the pull_request workflow.');
    process.exit(2);
  }
  const problems = checkPrBody(process.env.PR_BODY);
  if (problems.length > 0) {
    console.error('The PR body does not meet the PR contract (AGENTS.md, "Required outputs"):');
    for (const p of problems) console.error(`- ${p}`);
    process.exit(1);
  }
  console.log('PR body meets the contract.');
}
