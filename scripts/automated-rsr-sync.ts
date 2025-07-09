/**
 * Automated RSR Sync Monitor
 * Handles complete RSR sync pipeline with 5-minute monitoring intervals
 * FTP → Database → Algolia with automatic restart on failures
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, count } from 'drizzle-orm';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SyncStatus {
  phase: 'ftp' | 'database' | 'algolia' | 'complete';
  ftpProgress: number;
  dbProgress: number;
  algoliaProgress: number;
  totalProducts: number;
  errors: string[];
  startTime: Date;
  lastActivity: Date;
  isStalled: boolean;
}

class AutomatedRSRSync {
  private status: SyncStatus;
  private monitorInterval: NodeJS.Timeout | null = null;
  private statusFile = join(process.cwd(), 'sync-status.json');
  private logFile = join(process.cwd(), 'sync-log.txt');

  constructor() {
    this.status = {
      phase: 'ftp',
      ftpProgress: 0,
      dbProgress: 0,
      algoliaProgress: 0,
      totalProducts: 0,
      errors: [],
      startTime: new Date(),
      lastActivity: new Date(),
      isStalled: false
    };
  }

  /**
   * Start the automated sync process
   */
  async start(): Promise<void> {
    this.log('🚀 Starting automated RSR sync process');
    
    // Load previous status if exists
    this.loadStatus();
    
    // Start monitoring
    this.startMonitoring();
    
    // Begin sync process
    await this.executeSync();
  }

  /**
   * Monitor progress every 5 minutes
   */
  private startMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      this.checkProgress();
    }, 5 * 60 * 1000); // 5 minutes
    
    this.log('📊 Monitoring started - checking every 5 minutes');
  }

  /**
   * Check if sync is stalled and restart if needed
   */
  private async checkProgress(): Promise<void> {
    const now = new Date();
    const timeSinceActivity = now.getTime() - this.status.lastActivity.getTime();
    const stalledThreshold = 10 * 60 * 1000; // 10 minutes
    
    if (timeSinceActivity > stalledThreshold) {
      this.log('⚠️  Sync appears stalled - restarting from current phase');
      this.status.isStalled = true;
      await this.restartCurrentPhase();
    }
    
    // Log current status
    this.logStatus();
    this.saveStatus();
  }

  /**
   * Execute the complete sync process
   */
  private async executeSync(): Promise<void> {
    try {
      if (this.status.phase === 'ftp') {
        await this.syncFTP();
      }
      
      if (this.status.phase === 'database') {
        await this.syncDatabase();
      }
      
      if (this.status.phase === 'algolia') {
        await this.syncAlgolia();
      }
      
      this.status.phase = 'complete';
      this.log('✅ Complete RSR sync finished successfully');
      
    } catch (error) {
      this.log(`❌ Sync failed: ${error.message}`);
      this.status.errors.push(error.message);
      this.saveStatus();
    }
  }

  /**
   * Phase 1: FTP Download
   */
  private async syncFTP(): Promise<void> {
    this.log('📥 Starting FTP download phase');
    this.status.phase = 'ftp';
    this.status.lastActivity = new Date();
    
    return new Promise((resolve, reject) => {
      const ftpScript = spawn('node', ['-e', `
        const { Client } = require('basic-ftp');
        const fs = require('fs');
        
        async function downloadRSR() {
          const client = new Client();
          
          try {
            await client.access({
              host: 'ftps.rsrgroup.com',
              port: 2222,
              user: '60742',
              password: '2SSinQ58',
              secure: true,
              secureOptions: { rejectUnauthorized: false }
            });
            
            console.log('FTP: Connected successfully');
            
            // Download main inventory file
            await client.downloadTo('./server/data/rsr/downloads/rsrinventory-new.txt', '/ftpdownloads/rsrinventory-new.txt');
            console.log('FTP: Downloaded main inventory file');
            
            // Download fulfillment inventory
            await client.downloadTo('./server/data/rsr/downloads/fulfillment-inv-new.txt', '/ftpdownloads/fulfillment-inv-new.txt');
            console.log('FTP: Downloaded fulfillment inventory');
            
            await client.close();
            console.log('FTP: Download complete');
            
          } catch (error) {
            console.error('FTP: Error:', error.message);
            process.exit(1);
          }
        }
        
        downloadRSR();
      `]);
      
      ftpScript.stdout.on('data', (data) => {
        const output = data.toString();
        this.log(output);
        if (output.includes('Download complete')) {
          this.status.ftpProgress = 100;
          this.status.phase = 'database';
          this.status.lastActivity = new Date();
          resolve();
        }
      });
      
      ftpScript.stderr.on('data', (data) => {
        const error = data.toString();
        this.log(`FTP Error: ${error}`);
        this.status.errors.push(error);
      });
      
      ftpScript.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FTP process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Phase 2: Database Population
   */
  private async syncDatabase(): Promise<void> {
    this.log('🗄️  Starting database population phase');
    this.status.phase = 'database';
    this.status.lastActivity = new Date();
    
    return new Promise((resolve, reject) => {
      const dbScript = spawn('tsx', ['scripts/complete-rsr-sync.js']);
      
      dbScript.stdout.on('data', (data) => {
        const output = data.toString();
        this.log(output);
        
        // Parse progress from output
        const progressMatch = output.match(/Processed (\d+) of (\d+)/);
        if (progressMatch) {
          const processed = parseInt(progressMatch[1]);
          const total = parseInt(progressMatch[2]);
          this.status.dbProgress = Math.round((processed / total) * 100);
          this.status.totalProducts = total;
          this.status.lastActivity = new Date();
        }
        
        if (output.includes('Database sync complete')) {
          this.status.dbProgress = 100;
          this.status.phase = 'algolia';
          this.status.lastActivity = new Date();
          resolve();
        }
      });
      
      dbScript.stderr.on('data', (data) => {
        const error = data.toString();
        this.log(`DB Error: ${error}`);
        this.status.errors.push(error);
      });
      
      dbScript.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Database process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Phase 3: Algolia Sync
   */
  private async syncAlgolia(): Promise<void> {
    this.log('🔍 Starting Algolia sync phase');
    this.status.phase = 'algolia';
    this.status.lastActivity = new Date();
    
    return new Promise((resolve, reject) => {
      const algoliaScript = spawn('tsx', ['scripts/complete-algolia-sync.ts']);
      
      algoliaScript.stdout.on('data', (data) => {
        const output = data.toString();
        this.log(output);
        
        // Parse progress from output
        const progressMatch = output.match(/Synced (\d+) of (\d+)/);
        if (progressMatch) {
          const synced = parseInt(progressMatch[1]);
          const total = parseInt(progressMatch[2]);
          this.status.algoliaProgress = Math.round((synced / total) * 100);
          this.status.lastActivity = new Date();
        }
        
        if (output.includes('Algolia sync complete')) {
          this.status.algoliaProgress = 100;
          this.status.phase = 'complete';
          this.status.lastActivity = new Date();
          resolve();
        }
      });
      
      algoliaScript.stderr.on('data', (data) => {
        const error = data.toString();
        this.log(`Algolia Error: ${error}`);
        this.status.errors.push(error);
      });
      
      algoliaScript.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Algolia process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Restart current phase if stalled
   */
  private async restartCurrentPhase(): Promise<void> {
    this.log(`🔄 Restarting ${this.status.phase} phase`);
    this.status.isStalled = false;
    this.status.lastActivity = new Date();
    
    switch (this.status.phase) {
      case 'ftp':
        await this.syncFTP();
        break;
      case 'database':
        await this.syncDatabase();
        break;
      case 'algolia':
        await this.syncAlgolia();
        break;
    }
  }

  /**
   * Log message with timestamp
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    
    // Append to log file
    try {
      writeFileSync(this.logFile, logEntry + '\n', { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log current status
   */
  private logStatus(): void {
    const elapsed = new Date().getTime() - this.status.startTime.getTime();
    const elapsedMinutes = Math.round(elapsed / 60000);
    
    this.log(`
📊 SYNC STATUS (${elapsedMinutes}m elapsed)
Phase: ${this.status.phase.toUpperCase()}
FTP: ${this.status.ftpProgress}%
Database: ${this.status.dbProgress}%
Algolia: ${this.status.algoliaProgress}%
Total Products: ${this.status.totalProducts}
Errors: ${this.status.errors.length}
${this.status.isStalled ? '⚠️  STALLED - Restarting' : '✅ Active'}
    `);
  }

  /**
   * Save status to file
   */
  private saveStatus(): void {
    try {
      writeFileSync(this.statusFile, JSON.stringify(this.status, null, 2));
    } catch (error) {
      console.error('Failed to save status:', error);
    }
  }

  /**
   * Load status from file
   */
  private loadStatus(): void {
    try {
      if (existsSync(this.statusFile)) {
        const statusData = readFileSync(this.statusFile, 'utf-8');
        const savedStatus = JSON.parse(statusData);
        this.status = { ...this.status, ...savedStatus };
        this.log('📂 Loaded previous sync status');
      }
    } catch (error) {
      this.log('⚠️  Could not load previous status, starting fresh');
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.log('🛑 Monitoring stopped');
  }

  /**
   * Get current status
   */
  getStatus(): SyncStatus {
    return this.status;
  }
}

// Start the automated sync
const automatedSync = new AutomatedRSRSync();
automatedSync.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  automatedSync.stop();
  process.exit(0);
});

export { AutomatedRSRSync };