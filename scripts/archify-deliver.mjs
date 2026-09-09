#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, '.agents/skills/archify/bin/archify.mjs');
const spec = path.join(root, 'docs/architecture/gymos.architecture.json');
const out = path.join(root, 'docs/architecture/gymos.html');

const result = spawnSync(
  process.execPath,
  [
    cli,
    'deliver',
    'architecture',
    spec,
    out,
    '--quality',
    'showcase',
    '--repo-root',
    root,
    '--json',
  ],
  { cwd: root, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
