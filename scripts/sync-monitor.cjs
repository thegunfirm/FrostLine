/**
 * Real-time RSR Sync Monitor
 * Tracks sync progress and provides continuous status updates
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class SyncMonitor {
  constructor() {
    this.syncProcess = null;
    this.statusFile = path.join(process.cwd(), 'sync-status.json');
    this.logFile = path.join(process.cwd(), 'sync-log.txt');
    this.startTime = new Date();
    this.lastProgress = {
      processed: 0,
      total: 0,
      dropShippable: 0,
      warehouseOnly: 0,
      errors: 0
    };
  }

  async startSync() {
    console.log('🚀 Starting RSR Sync with Real-time Monitoring');
    console.log('═'.repeat(60));
    
    // Clear previous logs
    if (fs.existsSync(this.logFile)) {
      fs.unlinkSync(this.logFile);
    }
    
    // Start sync process
    this.syncProcess = spawn('node', ['scripts/complete-rsr-sync.cjs'], {
      stdio: 'pipe'
    });
    
    // Monitor stdout
    this.syncProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.processOutput(output);
    });
    
    // Monitor stderr
    this.syncProcess.stderr.on('data', (data) => {
      const error = data.toString();
      this.logError(error);
    });
    
    // Handle process completion
    this.syncProcess.on('close', (code) => {
      this.logFinal(code);
    });
    
    // Start monitoring interval
    this.startMonitoring();
  }

  processOutput(output) {
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      // Log to file
      fs.appendFileSync(this.logFile, `[${new Date().toISOString()}] ${line}\n`);
      
      // Parse progress
      const progressMatch = line.match(/✅ Processed (\\d+) of (\\d+) records/);
      if (progressMatch) {
        this.lastProgress.processed = parseInt(progressMatch[1]);
        this.lastProgress.total = parseInt(progressMatch[2]);
        this.displayProgress();
      }
      
      // Parse drop ship counts
      const dropShipMatch = line.match(/📦 Drop Ship: (\\d+) \\| 🏭 Warehouse: (\\d+)/);
      if (dropShipMatch) {
        this.lastProgress.dropShippable = parseInt(dropShipMatch[1]);
        this.lastProgress.warehouseOnly = parseInt(dropShipMatch[2]);
      }
      
      // Parse errors
      if (line.includes('❌ Error')) {
        this.lastProgress.errors++;
      }
      
      // Show important messages
      if (line.includes('🚀') || line.includes('✅') || line.includes('❌') || line.includes('📊')) {
        console.log(line);
      }
    });
  }

  displayProgress() {
    const elapsed = Math.round((new Date() - this.startTime) / 1000);
    const progress = this.lastProgress.total > 0 ? 
      Math.round((this.lastProgress.processed / this.lastProgress.total) * 100) : 0;
    
    console.clear();
    console.log('🔄 RSR Sync Monitor - Real-time Progress');
    console.log('═'.repeat(60));
    console.log(`⏱️  Elapsed: ${elapsed}s`);
    console.log(`📊 Progress: ${progress}% (${this.lastProgress.processed}/${this.lastProgress.total})`);
    console.log(`📦 Drop Shippable: ${this.lastProgress.dropShippable}`);
    console.log(`🏭 Warehouse Only: ${this.lastProgress.warehouseOnly}`);
    console.log(`❌ Errors: ${this.lastProgress.errors}`);
    console.log('');
    
    // Progress bar
    const barLength = 50;
    const filledLength = Math.round(barLength * (progress / 100));
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(`[${bar}] ${progress}%`);
    console.log('');
    
    // ETA calculation
    if (this.lastProgress.processed > 0) {
      const rate = this.lastProgress.processed / elapsed;
      const remaining = this.lastProgress.total - this.lastProgress.processed;
      const eta = remaining / rate;
      console.log(`🕐 ETA: ${Math.round(eta)}s`);
    }
    
    console.log('═'.repeat(60));
  }

  startMonitoring() {
    setInterval(() => {
      if (this.syncProcess && !this.syncProcess.killed) {
        this.displayProgress();
      }
    }, 2000); // Update every 2 seconds
  }

  logError(error) {
    console.log(`❌ Error: ${error}`);
    fs.appendFileSync(this.logFile, `[${new Date().toISOString()}] ERROR: ${error}\n`);
  }

  logFinal(code) {
    console.log('');
    console.log('═'.repeat(60));
    if (code === 0) {
      console.log('✅ Sync completed successfully!');
    } else {
      console.log(`❌ Sync failed with code: ${code}`);
    }
    console.log('═'.repeat(60));
    
    // Show final stats
    if (this.lastProgress.total > 0) {
      console.log(`📊 Final Statistics:`);
      console.log(`   Processed: ${this.lastProgress.processed}`);
      console.log(`   Drop Shippable: ${this.lastProgress.dropShippable}`);
      console.log(`   Warehouse Only: ${this.lastProgress.warehouseOnly}`);
      console.log(`   Errors: ${this.lastProgress.errors}`);
    }
  }
}

// Start monitoring
const monitor = new SyncMonitor();
monitor.startSync().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping sync monitor...');
  if (monitor.syncProcess) {
    monitor.syncProcess.kill();
  }
  process.exit(0);
});