// Maps a Chrome .cpuprofile (from vitals-flow.mjs) onto the web build's source maps and sums self
// time by package and by top functions. Needs a build with browser source maps (README, "Hotspots").
// Usage: node scripts/perf/attribute-cpu.mjs <profile.cpuprofile> <apps/web/.next/static/chunks>
import { existsSync, readFileSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { join } from 'node:path';

const [profPath, chunks] = process.argv.slice(2);
if (!profPath || !chunks) {
  throw new Error('usage: attribute-cpu.mjs <profile.cpuprofile> <chunksDir>');
}
if (!existsSync(chunks)) throw new Error(`chunks folder not found: ${chunks}`);

const prof = JSON.parse(readFileSync(profPath, 'utf8'));
const selfTime = new Map();
for (let i = 0; i < prof.samples.length; i += 1) {
  selfTime.set(prof.samples[i], (selfTime.get(prof.samples[i]) ?? 0) + (prof.timeDeltas[i] ?? 0));
}

const maps = new Map();
let mapped = 0;
const mapFor = (url) => {
  const file = url.split('/chunks/')[1];
  if (!file) return null;
  if (!maps.has(file)) {
    // Turbopack names maps differently from chunks, so follow the sourceMappingURL comment.
    const js = existsSync(join(chunks, file)) ? readFileSync(join(chunks, file), 'utf8') : '';
    const ref = js.match(/sourceMappingURL=(\S+)\s*$/)?.[1];
    const mapPath = ref ? join(chunks, ref) : null;
    maps.set(
      file,
      mapPath && existsSync(mapPath)
        ? new SourceMap(JSON.parse(readFileSync(mapPath, 'utf8')))
        : null,
    );
  }
  return maps.get(file);
};

const packageOf = (src) => {
  const dep = src.match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/);
  if (dep) return dep[1];
  const pkg = src.match(/packages\/([^/]+)/);
  if (pkg) return `gymos:${pkg[1]}`;
  return src.includes('apps/web') ? 'gymos:apps/web' : src.slice(0, 30) || '(unknown)';
};

const byPkg = new Map();
const byFn = new Map();
let total = 0;
const VM = new Set(['(idle)', '(program)', '(garbage collector)']);
for (const node of prof.nodes) {
  const us = selfTime.get(node.id) ?? 0;
  if (!us) continue;
  total += us;
  const cf = node.callFrame;
  let pkg = '(native)';
  let fn = cf.functionName || '(anon)';
  if (VM.has(cf.functionName)) {
    pkg = cf.functionName;
  } else if (cf.url) {
    const map = mapFor(cf.url);
    if (map) {
      // Profile positions and SourceMap offsets are both zero-based.
      const o = map.findEntry(cf.lineNumber, cf.columnNumber);
      pkg = o.originalSource ? packageOf(o.originalSource) : '(unmapped)';
      if (o.originalSource) mapped += us;
      const where = (o.originalSource ?? '').split('/').slice(-2).join('/');
      fn = `${o.name || cf.functionName || '(anon)'} @ ${where}:${(o.originalLine ?? -1) + 1}`;
    } else {
      pkg = cf.url.includes('/chunks/')
        ? '(chunk without map)'
        : cf.url.split('/').pop().slice(0, 30);
    }
  }
  byPkg.set(pkg, (byPkg.get(pkg) ?? 0) + us);
  byFn.set(fn, (byFn.get(fn) ?? 0) + us);
}

const top = (m, n) =>
  [...m]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(
      ([k, v]) =>
        `${(v / 1000).toFixed(0).padStart(6)} ms  ${((100 * v) / total).toFixed(1).padStart(5)}%  ${k}`,
    )
    .join('\n');
console.log(
  `total sampled ${(total / 1000).toFixed(0)} ms, mapped to source ${(mapped / 1000).toFixed(0)} ms\n` +
    `-- self time by package\n${top(byPkg, 14)}\n-- top functions\n${top(byFn, 16)}`,
);
if (maps.size > 0 && [...maps.values()].every((m) => m === null)) {
  // A build without browser source maps attributes nothing; say so instead of printing noise.
  console.error('no chunk had a source map: rebuild with browser source maps (README)');
  process.exit(1);
}
