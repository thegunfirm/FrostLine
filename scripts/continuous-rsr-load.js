/**
 * Continuous RSR Loading - Automatically restarts until all 29k products loaded
 */

const { spawn } = require('child_process');
const { Client } = require('pg');

async function getCurrentCount() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query("SELECT COUNT(*) as count FROM products WHERE distributor = 'RSR'");
  await client.end();
  return parseInt(result.rows[0].count);
}

async function runBatch() {
  return new Promise((resolve) => {
    console.log('🚀 Starting RSR batch loading...');
    const process = spawn('npx', ['tsx', 'scripts/load-authentic-rsr-final.ts'], {
      stdio: 'inherit'
    });
    
    process.on('exit', (code) => {
      console.log(`📦 Batch completed with code: ${code}`);
      resolve(code);
    });
  });
}

async function continuousLoad() {
  const TARGET = 29887;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    const currentCount = await getCurrentCount();
    console.log(`\n📊 Current: ${currentCount} / ${TARGET} products (${Math.round(currentCount/TARGET*100)}%)`);
    
    if (currentCount >= TARGET * 0.95) { // 95% threshold
      console.log('🎉 Successfully loaded 95%+ of RSR catalog!');
      break;
    }
    
    console.log(`\n🔄 Attempt ${attempts}/${maxAttempts} - Loading more products...`);
    await runBatch();
    
    // Wait a moment between batches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const finalCount = await getCurrentCount();
  console.log(`\n✅ Final count: ${finalCount} authentic RSR products loaded`);
}

continuousLoad().catch(console.error);