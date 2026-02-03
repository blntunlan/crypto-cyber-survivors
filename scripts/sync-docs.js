import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../docs');
const DEST_DIR = path.resolve(__dirname, '../public/docs');

/**
 * Recursively copy folder
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  if (!exists) return;

  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    // Check if destination exists and is same
    if (fs.existsSync(dest)) {
      const srcBuf = fs.readFileSync(src);
      const destBuf = fs.readFileSync(dest);
      if (srcBuf.equals(destBuf)) return;
    }
    fs.copyFileSync(src, dest);
    console.log(`Synced: ${path.relative(path.resolve(__dirname, '..'), dest)}`);
  }
}

console.log('--- STARTING DOC SYNC ---');
try {
  copyRecursiveSync(SRC_DIR, DEST_DIR);

  // Also sync root README.md
  const readmeSrc = path.resolve(__dirname, '../README.md');
  const readmeDest = path.resolve(__dirname, '../public/README.md');
  if (fs.existsSync(readmeSrc)) {
    if (fs.existsSync(readmeDest)) {
      const sBuf = fs.readFileSync(readmeSrc);
      const dBuf = fs.readFileSync(readmeDest);
      if (!sBuf.equals(dBuf)) {
        fs.copyFileSync(readmeSrc, readmeDest);
        console.log('Synced: public/README.md');
      }
    } else {
      fs.copyFileSync(readmeSrc, readmeDest);
      console.log('Synced: public/README.md');
    }
  }
  console.log('--- DOC SYNC COMPLETE ---');
} catch (err) {
  console.error('--- DOC SYNC FAILED ---');
  console.error(err);
  process.exit(1);
}
