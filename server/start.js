const { spawn } = require('child_process');

function spawnProc(cmd, args) {
  const p = spawn(cmd, args, { stdio: 'inherit' });
  p.on('error', (err) => {
    console.error(`${cmd} ${args.join(' ')} error:`, err);
  });
  return p;
}

const crawler = spawnProc('node', ['dist/crawler/index.js']);
const api = spawnProc('node', ['dist/api/server.js']);

function shutdown() {
  try { crawler.kill('SIGTERM'); } catch (e) {}
  try { api.kill('SIGTERM'); } catch (e) {}
}

process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });

// API exit drives the container lifecycle
api.on('exit', (code) => {
  shutdown();
  process.exit(code ?? 0);
});

// Crawler is a one-shot job — log its result but keep the API alive
crawler.on('exit', (code) => {
  if (code === 0) {
    console.log('[supervisor] Crawler completed successfully');
  } else {
    console.error(`[supervisor] Crawler exited with code ${code}`);
  }
});
