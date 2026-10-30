import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--webpack', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, WATCHPACK_POLLING: process.env.WATCHPACK_POLLING ?? 'true' },
});
child.on('error', error => { console.error(error.message); process.exit(1); });
child.on('exit', code => { process.exit(code ?? 0); });
