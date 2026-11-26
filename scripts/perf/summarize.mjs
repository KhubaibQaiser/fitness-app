// Prints the median and min–max of every metric across repeated runs of one script, as a markdown
// table for docs/revamp/reference/perf-baseline.md.
// Usage: node scripts/perf/summarize.mjs <run-1>/results.json <run-2>/results.json ...
import { readFileSync } from 'node:fs';
import { summaryTable } from './lib.mjs';

const paths = process.argv.slice(2);
if (paths.length === 0) throw new Error('usage: summarize.mjs <results.json> [...]');
console.log(summaryTable(paths.map((p) => JSON.parse(readFileSync(p, 'utf8')))));
