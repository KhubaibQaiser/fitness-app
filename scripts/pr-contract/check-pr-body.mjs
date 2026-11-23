#!/usr/bin/env node
// Checks a pull request body against the PR template's required parts: exactly one Track ticked,
// a spec or ADR linked under "Spec / ADR", and the fresh-context reviewer's last line under
// "Review" with no blockers. Docs-only PRs need only the Track. Run in CI with the body in
// PR_BODY. No dependencies.
import { pathToFileURL } from 'node:url';

// Text under a "## Heading" (or "###"), up to the next heading of any level.
const section = (text, heading) => {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^#{2,3}[ \\t]+${heading}[ \\t]*$`, 'i').test(l));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{1,6}[ \t]/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

export const checkPrBody = (body) => {
  // Template guidance (HTML comments) and fenced examples are not the author's answers.
  const text = String(body ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
  const problems = [];

  const ticked = [...section(text, 'Track').matchAll(/^\s*[-*]\s*\[[xX]\]\s*(.+)$/gm)].map((m) =>
    m[1].trim(),
  );
  if (ticked.length !== 1) {
    problems.push(`Tick exactly one box under "## Track" (found ${ticked.length}).`);
  }
  if (ticked.length === 1 && /^Docs-only\b/i.test(ticked[0])) return problems;

  if (!/docs\/(specs|adr)\/[\w.-]+\.md/.test(section(text, 'Spec / ADR'))) {
    problems.push(
      'Link a spec (`docs/specs/<name>.md`) or an ADR (`docs/adr/<name>.md`) under "## Spec / ADR".',
    );
  }
  const reviews = [
    ...section(text, 'Review').matchAll(/^\s*BLOCKERS:\s*(\d+)\s*,\s*NON-BLOCKING:\s*(\d+)\s*$/gm),
  ];
  if (reviews.length === 0) {
    problems.push(
      'Paste the reviewer subagent\'s last line ("BLOCKERS: <n>, NON-BLOCKING: <n>") under "## Review".',
    );
  } else {
    const blockers = Math.max(...reviews.map((m) => Number(m[1])));
    if (blockers > 0) {
      problems.push(`The review reports ${blockers} blocker(s). Fix them and re-run the reviewer.`);
    }
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
    console.error(
      'The PR body does not follow the PR template (.github/pull_request_template.md):',
    );
    for (const p of problems) console.error(`- ${p}`);
    process.exit(1);
  }
  console.log('PR body meets the contract.');
}
