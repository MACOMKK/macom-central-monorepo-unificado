import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(rootDir, '..');
const source = join(repoRoot, 'packages', 'assets', 'favicon.svg');
const appsDir = join(repoRoot, 'apps');

if (!existsSync(source)) {
  throw new Error(`Shared favicon not found at ${source}`);
}

const appNames = readdirSync(appsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const appName of appNames) {
  const appDir = join(appsDir, appName);
  const indexPath = join(appDir, 'index.html');

  if (!existsSync(indexPath)) continue;

  const publicDir = join(appDir, 'public');
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(source, join(publicDir, 'favicon.svg'));
}
