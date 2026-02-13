import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const marketServerDir = path.resolve(__dirname, '../railway-market-server');

// We explicitly ignore arguments passed by lint-staged to run check on the whole project
console.log('Running typecheck for railway-market-server (ignoring file args)...');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const child = spawn(npm, ['run', 'typecheck'], {
  cwd: marketServerDir,
  stdio: 'inherit',
  shell: true,
});

child.on('close', code => {
  process.exit(code);
});
