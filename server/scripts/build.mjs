/**
 * Transpile server TypeScript with esbuild (low memory vs tsc on large codebases).
 * Preserves dist/ layout: index.js plus src tree .js files for runtime entry points like seoSsrServer.
 */
import { readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function collectTsFiles(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) {
      if (name === 'scripts') continue;
      collectTsFiles(abs, files);
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      files.push(relative(root, abs).replace(/\\/g, '/'));
    }
  }
  return files;
}

const entryPoints = ['index.ts', ...collectTsFiles(join(root, 'src'))];

rmSync(join(root, 'dist'), { recursive: true, force: true });

await esbuild.build({
  entryPoints,
  outbase: root,
  outdir: join(root, 'dist'),
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
});

console.log(`[build] Transpiled ${entryPoints.length} files -> dist/`);
