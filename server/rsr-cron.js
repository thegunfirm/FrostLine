// server/rsr-cron.js
// Runs your FTP→Hetzner sync every 15 minutes and prevents overlap.
import cron from 'node-cron';
import { exec } from 'child_process';

let running = false;

function runSync() {
  if (running) {
    console.log('[rsr-cron] Previous sync still running, skipping.');
    return;
  }
  running = true;
  console.log('[rsr-cron] Starting sync…');
  const child = exec('node scripts/sync-rsr-to-hetzner.mjs', { env: process.env });
  child.stdout.on('data', d => process.stdout.write(`[rsr-sync] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[rsr-sync] ${d}`));
  child.on('exit', code => { console.log(`[rsr-cron] Sync finished with code ${code}`); running = false; });
}

// run once at boot, then every 15 min (UTC)
runSync();
cron.schedule('*/15 * * * *', runSync, { timezone: 'UTC' });
