/**
 * Ensures react-modal-sheet (+ motion peer) are installed.
 * Run: node scripts/ensure-react-modal-sheet.mjs
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sheetDir = join(root, 'node_modules', 'react-modal-sheet');
const motionDir = join(root, 'node_modules', 'motion');

const missing = [];
if (!existsSync(join(sheetDir, 'package.json'))) missing.push('react-modal-sheet@5.6.0');
if (!existsSync(join(motionDir, 'package.json'))) missing.push('motion@11.18.2');

if (missing.length === 0) {
  console.log('react-modal-sheet and motion are already installed.');
  process.exit(0);
}

console.log(`Installing ${missing.join(', ')}…`);
execSync(`npm install ${missing.join(' ')}`, { cwd: root, stdio: 'inherit' });
console.log('Done.');
