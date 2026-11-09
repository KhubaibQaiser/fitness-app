// Bundles the API into a self-contained Vercel Build Output (ADR-0016). Run by the Vercel project build command
// from apps/api. The workspace packages ship TypeScript source, which Vercel's zero-config functions cannot run,
// so everything (workspace + third-party) is bundled into one file; pdfkit uses its standalone build because the
// regular one reads font files from disk.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FUNCTION_NAME, functionConfig, outputConfig } from './vercel-output.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
// ponytail: esbuild comes from tsx (a dependency); declare esbuild itself when dependency changes are approved.
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild');

const out = path.join(root, '.vercel/output');
const fn = path.join(out, `functions/${FUNCTION_NAME}.func`);
rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });

await build({
  entryPoints: [path.join(root, 'src/vercel-node.ts')],
  outfile: path.join(fn, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  alias: {
    pdfkit: path.join(
      path.dirname(require.resolve('pdfkit/package.json')),
      'js/pdfkit.standalone.js',
    ),
  },
  // CommonJS dependencies inside an ESM bundle need require/__dirname.
  banner: {
    js: "import { createRequire as __cr } from 'node:module';const require = __cr(import.meta.url);",
  },
  logLevel: 'warning',
});

const tenants = path.resolve(root, '../../infra/tenants');
mkdirSync(path.join(fn, 'tenants'), { recursive: true });
for (const f of readdirSync(tenants).filter((n) => n.endsWith('.json'))) {
  cpSync(path.join(tenants, f), path.join(fn, 'tenants', f));
}
writeFileSync(path.join(fn, '.vc-config.json'), JSON.stringify(functionConfig(), null, 2));
writeFileSync(path.join(out, 'config.json'), JSON.stringify(outputConfig(), null, 2));
console.log(`Vercel output written to ${out}`);
