import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');

const excludeDirs = new Set([
  'node_modules',
  'dist',
  '.git',
  '.agent',
  '.agents',
  '.gemini',
  '.windsurf',
  'test-results',
  'coverage',
  'docs',
  'playwright-report',
  'remotion-video',
]);
const excludeFiles = new Set([
  'package-lock.json',
  '.env.example',
  'yarn.lock',
  'pnpm-lock.yaml',
]);

const sensitivePatterns = [
  /api_key/i,
  /secret/i,
  /password/i,
  /private_key/i,
  // 'token' is very common (e.g. JWT, design tokens), removing it to reduce noise unless specifically requested, but original grep had it.
  // I'll include it but maybe restrict context? No, keep original behavior.
  /token/i,
];

// Helper to check if a file is binary (simple heuristic)
function isBinary(buffer) {
  // Check first 8000 bytes for null byte
  for (let i = 0; i < Math.min(buffer.length, 8000); i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function scan(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.error(`Error reading directory ${dir}:`, e);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!excludeDirs.has(entry.name)) {
        scan(fullPath);
      }
    } else if (entry.isFile()) {
      if (excludeFiles.has(entry.name)) continue;

      try {
        const buffer = fs.readFileSync(fullPath);
        if (isBinary(buffer)) continue;

        const content = buffer.toString('utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Skip lines that are too long (minified code)
          if (line.length > 500) return;

          for (const pattern of sensitivePatterns) {
            if (pattern.test(line)) {
              // Simple heuristic to skip variable usages vs definitions?
              // No, original grep was dumb, so we keep it simple.
              console.log(
                `[POSSIBLE SECRET] ${path.relative(rootDir, fullPath)}:${index + 1}: ${line.trim()}`
              );
              break;
            }
          }
        });
      } catch (e) {
        console.error(`Error reading ${fullPath}:`, e);
      }
    }
  }
}

console.log('Scanning for secrets...');
scan(rootDir);
