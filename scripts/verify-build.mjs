import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const failures = [];

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'));
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function checkFile(path) {
  try {
    const details = await stat(new URL(path, root));
    check(details.isFile() && details.size > 0, `${path} is empty or is not a file`);
  } catch {
    failures.push(`${path} is missing`);
  }
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else files.push(path);
  }
  return files;
}

const packageJson = await readJson('package.json');
const sourceManifest = await readJson('public/manifest.json');
const builtManifest = await readJson('dist/manifest.json');
const releaseTag = process.env.RELEASE_TAG;

check(sourceManifest.manifest_version === 3, 'source manifest must use Manifest V3');
check(builtManifest.manifest_version === 3, 'built manifest must use Manifest V3');
check(
  packageJson.version === sourceManifest.version,
  'package.json and source manifest versions differ',
);
check(
  sourceManifest.version === builtManifest.version,
  'source and built manifest versions differ',
);
check(
  /^\d+(?:\.\d+){0,3}$/.test(sourceManifest.version),
  'manifest version is not Chrome-compatible',
);
check(
  sourceManifest.version.split('.').every((part) => Number(part) <= 65535),
  'manifest version component exceeds 65535',
);
check(
  builtManifest.background?.service_worker === 'background.js' &&
    builtManifest.background?.type === 'module',
  'background service worker is missing or is not an ES module',
);
check(!builtManifest.permissions?.includes('webRequestBlocking'), 'forbidden MV2 permission found');
check(
  !JSON.stringify(builtManifest.content_security_policy ?? {}).includes('unsafe-eval'),
  'unsafe-eval found in content security policy',
);

if (releaseTag) {
  check(
    releaseTag === `v${packageJson.version}`,
    `tag ${releaseTag} does not match v${packageJson.version}`,
  );
}

const requiredFiles = [
  'dist/manifest.json',
  'dist/background.js',
  'dist/popup.html',
  'dist/options.html',
  'dist/icons/icon16.png',
  'dist/icons/icon32.png',
  'dist/icons/icon48.png',
  'dist/icons/icon128.png',
];
await Promise.all(requiredFiles.map(checkFile));

for (const path of await collectFiles(fileURLToPath(new URL('dist/', root)))) {
  if (!path.endsWith('.js') && !path.endsWith('.html')) continue;
  const content = await readFile(path, 'utf8');
  check(!/\beval\s*\(/.test(content), `${path} contains eval()`);
  check(!/\bnew\s+Function\s*\(/.test(content), `${path} contains new Function()`);
  if (path.endsWith('.html')) {
    check(!/<script[^>]+src=["']https?:\/\//i.test(content), `${path} loads a remote script`);
  }
}

if (failures.length > 0) {
  console.error('Build verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Verified routekey ${packageJson.version} production build.`);
}
