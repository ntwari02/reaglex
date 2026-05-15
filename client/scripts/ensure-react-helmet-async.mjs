/**
 * Ensures react-helmet-async is installed (listed in package.json but may be missing from node_modules).
 * Run: node scripts/ensure-react-helmet-async.mjs
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', 'react-helmet-async');

if (existsSync(join(pkgDir, 'package.json'))) {
  console.log('react-helmet-async is already installed.');
  process.exit(0);
}

console.log('Installing react-helmet-async…');
execSync('npm install react-helmet-async@2.0.5', { cwd: root, stdio: 'inherit' });
console.log('Done.');
