/**
 * Transpile server TypeScript with esbuild (low memory vs tsc on large codebases).
 * Preserves dist/ layout: index.js plus src tree .js files for runtime entry points like seoSsrServer.
 */
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function collectRootTsFiles(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.d.ts') && name !== 'index.ts')
    .map((name) => name.replace(/\\/g, '/'));
}

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

/** Node dynamic import() requires explicit .js for relative paths in emitted CJS output. */
function fixDynamicImportsInDir(dir) {
  let fixed = 0;
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) {
      fixed += fixDynamicImportsInDir(abs);
      continue;
    }
    if (!name.endsWith('.js') || name.endsWith('.js.map')) continue;

    const src = readFileSync(abs, 'utf8');
    const next = src.replace(/import\(\s*(['"])(\.[^'"]+?)\1\s*\)/g, (match, quote, specifier) => {
      if (specifier.endsWith('.js') || specifier.endsWith('.json') || specifier.endsWith('.node')) {
        return match;
      }
      return `import(${quote}${specifier}.js${quote})`;
    });

    if (next !== src) {
      writeFileSync(abs, next);
      fixed += 1;
    }
  }
  return fixed;
}

const entryPoints = ['index.ts', ...collectRootTsFiles(root), ...collectTsFiles(join(root, 'src'))];

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

const importFixCount = fixDynamicImportsInDir(join(root, 'dist'));
console.log(`[build] Transpiled ${entryPoints.length} files -> dist/`);
if (importFixCount) {
  console.log(`[build] Patched ${importFixCount} files with .js dynamic import specifiers`);
}
