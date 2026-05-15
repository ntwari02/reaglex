/**
 * Ensures web-push is installed (listed in package.json but may be missing from node_modules).
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', 'web-push');

if (existsSync(join(pkgDir, 'package.json'))) {
  console.log('web-push is already installed.');
  process.exit(0);
}

console.log('Installing web-push…');
execSync('npm install web-push@3.6.7', { cwd: root, stdio: 'inherit' });
