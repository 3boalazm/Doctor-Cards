import { spawn } from 'node:child_process';
import net from 'node:net';

const root = new URL('../', import.meta.url);
const reserve = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const run = (command, args, env = process.env) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
});
const port = await reserve();
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, DATABASE_URL: '', POSTGRES_URL: '', PORT: String(port) };
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
server.stdout.on('data', (data) => { logs += data.toString(); });
server.stderr.on('data', (data) => { logs += data.toString(); });
const stop = () => { if (server.exitCode === null) server.kill('SIGTERM'); };
try {
  let ready = false;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline && server.exitCode === null) {
    try { const response = await fetch(`${base}/api/auth`); if (response.ok) { ready = true; break; } } catch { /* Next is still compiling */ }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  if (!ready) throw new Error(`Next dev server did not become ready.\n${logs}`);
  await run(process.execPath, ['scripts/smoke-test.mjs'], { ...env, TEST_BASE_URL: base });
  await run(process.execPath, ['scripts/print-layout-test.mjs'], env);
  await run(process.execPath, ['scripts/profile-test.mjs'], env);
  await run(process.execPath, ['scripts/portrait-test.mjs'], env);
} finally {
  stop();
}
