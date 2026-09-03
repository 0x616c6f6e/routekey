import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const version = process.argv[2];

if (!version || !/^\d+(?:\.\d+){2,3}$/.test(version)) {
  console.error('Usage: npm run version:set -- <major.minor.patch>');
  process.exit(1);
}

const parts = version.split('.').map(Number);
if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 65535)) {
  console.error('Each Chrome extension version component must be between 0 and 65535.');
  process.exit(1);
}

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'));
}

async function writeJson(path, value) {
  await writeFile(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
}

const [packageJson, packageLock, manifest] = await Promise.all([
  readJson('package.json'),
  readJson('package-lock.json'),
  readJson('public/manifest.json'),
]);

packageJson.version = version;
packageLock.version = version;
if (packageLock.packages?.['']) packageLock.packages[''].version = version;
manifest.version = version;

await Promise.all([
  writeJson('package.json', packageJson),
  writeJson('package-lock.json', packageLock),
  writeJson('public/manifest.json', manifest),
]);

console.log(`Updated project version to ${version}.`);
