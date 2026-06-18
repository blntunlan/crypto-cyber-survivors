import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const WHITELIST_PATH = path.join(
  ROOT,
  'config',
  'architecture',
  'singleton-whitelist.json'
);

const SCAN_DIRS = [
  'components',
  'config',
  'contexts',
  'factories',
  'hooks',
  'services',
  'stores',
  'types',
  'utils',
];

const SINGLETON_PATTERNS = [
  /\bprivate\s+static\s+instance\b/,
  /\bstatic\s+getInstance\s*\(/,
  /\bexport\s+const\s+\w+\s*=\s*\w+(?:Class)?\.getInstance\(\)/,
];

const toPosixPath = filePath => filePath.split(path.sep).join('/');

const isSourceFile = filePath =>
  (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
  !filePath.endsWith('.d.ts');

const walk = async directory => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
      continue;
    }

    if (entry.isFile() && isSourceFile(absolutePath)) {
      files.push(absolutePath);
    }
  }

  return files;
};

const readWhitelist = async () => {
  const raw = await fs.readFile(WHITELIST_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.allowedFiles)) {
    throw new Error('singleton-whitelist.json must contain allowedFiles array');
  }

  return new Set(parsed.allowedFiles);
};

const findSingletonFiles = async () => {
  const sourceFiles = [];

  for (const scanDir of SCAN_DIRS) {
    const absoluteDir = path.join(ROOT, scanDir);
    try {
      sourceFiles.push(...(await walk(absoluteDir)));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const matches = [];

  for (const file of sourceFiles) {
    const source = await fs.readFile(file, 'utf8');
    if (SINGLETON_PATTERNS.some(pattern => pattern.test(source))) {
      matches.push(toPosixPath(path.relative(ROOT, file)));
    }
  }

  return new Set(matches.sort());
};

const formatList = values => values.map(value => `  - ${value}`).join('\n');

const main = async () => {
  const whitelist = await readWhitelist();
  const singletonFiles = await findSingletonFiles();

  const newSingletons = [...singletonFiles].filter(file => !whitelist.has(file));
  const staleWhitelistEntries = [...whitelist].filter(
    file => !singletonFiles.has(file)
  );

  if (newSingletons.length === 0 && staleWhitelistEntries.length === 0) {
    console.log(
      `Singleton regression check passed (${singletonFiles.size} baseline files).`
    );
    return;
  }

  if (newSingletons.length > 0) {
    console.error('New singleton files detected:');
    console.error(formatList(newSingletons));
    console.error('');
    console.error(
      'Use GameRuntime or explicit dependency injection for session state. Updating the whitelist requires architecture review.'
    );
  }

  if (staleWhitelistEntries.length > 0) {
    console.error('Stale singleton whitelist entries detected:');
    console.error(formatList(staleWhitelistEntries));
    console.error('');
    console.error('Remove retired entries from config/architecture/singleton-whitelist.json.');
  }

  process.exit(1);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
