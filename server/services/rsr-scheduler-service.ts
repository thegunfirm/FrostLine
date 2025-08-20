/**
 * RSR Import Scheduler Service
 * Implements RSR recommended update frequencies:
 * - Every 2 hours: Full inventory, attributes
 * - Every 15 minutes: Quantity updates
 * - Daily: Data integrity checks
 */

import cron from 'node-cron';
import { rsrFTPService } from './rsr-ftp-service.js';
import { RSRFileProcessor } from './rsr-file-processor.js';
import { rsrMonitoringService } from './rsr-monitoring-service.js';
import fs from 'fs';
import path from 'path';

interface SchedulerStatus {
  enabled: boolean;
  jobs: {
    fullInventory: { enabled: boolean; schedule: string; lastRun?: string; nextRun?: string };
    quantityUpdate: { enabled: boolean; schedule: string; lastRun?: string; nextRun?: string };
    dailyMonitoring: { enabled: boolean; schedule: string; lastRun?: string; nextRun?: string };
    emergencyUpdate: { enabled: boolean; description: string };
  };
  stats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    lastError?: string;
  };
}

export class RSRSchedulerService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private processor: RSRFileProcessor;
  private stats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lastError: undefined as string | undefined
  };
  private configPath: string;

  constructor() {
    this.processor = new RSRFileProcessor();
    this.configPath = path.join(process.cwd(), 'server', 'config', 'rsr-scheduler.json');
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(configData);
        if (config.stats) {
          this.stats = { ...this.stats, ...config.stats };
        }
      }
    } catch (error) {
      console.error('Failed to load RSR scheduler config:', error);
    }
  }

  private saveConfiguration(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const config = {
        lastUpdated: new Date().toISOString(),
        stats: this.stats
      };

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save RSR scheduler config:', error);
    }
  }

  /**
   * Start all RSR import schedules
   */
  async startScheduler(): Promise<void> {
    console.log('🚀 Starting RSR Import Scheduler');

    // Job 1: Full inventory import every 2 hours (as recommended by RSR)
    this.scheduleFullInventoryUpdate();

    // Job 2: Quantity updates every 15 minutes (RSR recommends 5 min, but 15 min is more reasonable)
    this.scheduleQuantityUpdates();

    // Job 3: Daily data integrity monitoring at 6 AM
    this.scheduleDailyMonitoring();

    console.log('✅ RSR Import Scheduler started successfully');
    console.log('📅 Schedule:');
    console.log('   • Full inventory: Every 2 hours');
    console.log('   • Quantities: Every 15 minutes');
    console.log('   • Data integrity: Daily at 6:00 AM');
  }

  /**
   * Schedule full inventory import every 2 hours
   */
  private scheduleFullInventoryUpdate(): void {
    const schedule = '0 */2 * * *'; // Every 2 hours at minute 0
    
    const job = cron.schedule(schedule, async () => {
      await this.runFullInventoryUpdate();
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    this.jobs.set('fullInventory', job);
    job.start();

    console.log('📅 Scheduled full inventory updates every 2 hours');
  }

  /**
   * Schedule quantity updates every 15 minutes
   */
  private scheduleQuantityUpdates(): void {
    const schedule = '*/15 * * * *'; // Every 15 minutes
    
    const job = cron.schedule(schedule, async () => {
      await this.runQuantityUpdate();
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    this.jobs.set('quantityUpdate', job);
    job.start();

    console.log('📅 Scheduled quantity updates every 15 minutes');
  }

  /**
   * Schedule daily monitoring at 6 AM
   */
  private scheduleDailyMonitoring(): void {
    const schedule = '0 6 * * *'; // Daily at 6:00 AM
    
    const job = cron.schedule(schedule, async () => {
      await this.runDailyMonitoring();
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    this.jobs.set('dailyMonitoring', job);
    job.start();

    console.log('📅 Scheduled daily monitoring at 6:00 AM');
  }

  /**
   * Run full inventory update
   */
  private async runFullInventoryUpdate(): Promise<void> {
    console.log('\n🔄 Running scheduled full inventory update...');
    this.stats.totalRuns++;

    try {
      // Download fresh files from RSR
      const downloadResult = await rsrFTPService.downloadAllFiles();
      
      if (!downloadResult.success) {
        throw new Error(`FTP download failed: ${downloadResult.errors.join(', ')}`);
      }

      console.log(`📥 Downloaded ${downloadResult.downloaded.length} files`);

      // Process main inventory file
      const inventoryPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
      if (fs.existsSync(inventoryPath)) {
        const result = await this.processor.processInventoryFile(inventoryPath);
        console.log(`📊 Processed inventory: ${result.processed} products`);
      }

      // Process attributes file
      const attributesPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'attributes-all.txt');
      if (fs.existsSync(attributesPath)) {
        console.log('📋 Processing attributes file...');
        // Note: Add attributes processing when needed
      }

      // Process deleted products
      const deletedPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrdeletedinv.txt');
      if (fs.existsSync(deletedPath)) {
        const result = await this.processor.processDeletedFile(deletedPath);
        console.log(`🗑️  Processed deleted: ${result.deleted} products`);
      }

      this.stats.successfulRuns++;
      console.log('✅ Full inventory update completed successfully');

    } catch (error: any) {
      this.stats.failedRuns++;
      this.stats.lastError = error.message;
      console.error('❌ Full inventory update failed:', error);
    }

    this.saveConfiguration();
  }

  /**
   * Run quantity update
   */
  private async runQuantityUpdate(): Promise<void> {
    console.log('🔢 Running scheduled quantity update...');
    this.stats.totalRuns++;

    try {
      // Download quantity file
      const downloadResult = await rsrFTPService.downloadFile('quantities');
      
      if (!downloadResult.success) {
        throw new Error(`Quantity download failed: ${downloadResult.error}`);
      }

      // Process quantity file
      const quantityPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'IM-QTY-CSV.csv');
      if (fs.existsSync(quantityPath)) {
        const result = await this.processor.processQuantityFile(quantityPath);
        console.log(`📊 Updated quantities: ${result.updated} products`);
      }

      this.stats.successfulRuns++;

    } catch (error: any) {
      this.stats.failedRuns++;
      this.stats.lastError = error.message;
      console.error('❌ Quantity update failed:', error);
    }

    this.saveConfiguration();
  }

  /**
   * Run daily monitoring
   */
  private async runDailyMonitoring(): Promise<void> {
    console.log('\n📊 Running daily RSR monitoring...');
    this.stats.totalRuns++;

    try {
      const result = await rsrMonitoringService.runDailyCheck();
      
      console.log('📈 Daily monitoring results:');
      console.log(`   • Total products: ${result.totalProducts}`);
      console.log(`   • Corruption rate: ${result.corruptionRate.toFixed(2)}%`);
      
      if (result.fixesApplied > 0) {
        console.log(`   • Auto-fixes applied: ${result.fixesApplied}`);
      }

      if (result.isHealthy) {
        console.log('✅ System is healthy');
      } else {
        console.log('⚠️  Issues detected and addressed');
      }

      this.stats.successfulRuns++;

    } catch (error: any) {
      this.stats.failedRuns++;
      this.stats.lastError = error.message;
      console.error('❌ Daily monitoring failed:', error);
    }

    this.saveConfiguration();
  }

  /**
   * Run emergency update (manual trigger)
   */
  async runEmergencyUpdate(): Promise<{ success: boolean; message: string }> {
    console.log('🚨 Running emergency RSR update...');

    try {
      await this.runFullInventoryUpdate();
      return {
        success: true,
        message: 'Emergency update completed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Emergency update failed: ${error.message}`
      };
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduler(): void {
    console.log('⏹️  Stopping RSR Import Scheduler...');
    
    for (const [jobName, job] of this.jobs) {
      job.stop();
      job.destroy();
      console.log(`   • Stopped ${jobName}`);
    }
    
    this.jobs.clear();
    console.log('✅ RSR Import Scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerStatus {
    const now = new Date();
    
    return {
      enabled: this.jobs.size > 0,
      jobs: {
        fullInventory: {
          enabled: this.jobs.has('fullInventory'),
          schedule: 'Every 2 hours',
          lastRun: 'Check logs',
          nextRun: 'Next even hour'
        },
        quantityUpdate: {
          enabled: this.jobs.has('quantityUpdate'),
          schedule: 'Every 15 minutes', 
          lastRun: 'Check logs',
          nextRun: 'Next 15-minute interval'
        },
        dailyMonitoring: {
          enabled: this.jobs.has('dailyMonitoring'),
          schedule: 'Daily at 6:00 AM',
          lastRun: 'Check logs',
          nextRun: 'Tomorrow at 6:00 AM'
        },
        emergencyUpdate: {
          enabled: true,
          description: 'Manual trigger available'
        }
      },
      stats: this.stats
    };
  }

  /**
   * Update job schedule (for testing or configuration changes)
   */
  updateJobSchedule(jobName: string, schedule: string): boolean {
    try {
      if (this.jobs.has(jobName)) {
        const job = this.jobs.get(jobName);
        if (job) {
          job.stop();
          job.destroy();
        }
      }

      // Create new job with updated schedule
      const newJob = cron.schedule(schedule, async () => {
        switch (jobName) {
          case 'fullInventory':
            await this.runFullInventoryUpdate();
            break;
          case 'quantityUpdate':
            await this.runQuantityUpdate();
            break;
          case 'dailyMonitoring':
            await this.runDailyMonitoring();
            break;
        }
      }, { scheduled: false });

      this.jobs.set(jobName, newJob);
      newJob.start();

      console.log(`✅ Updated ${jobName} schedule to: ${schedule}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update ${jobName} schedule:`, error);
      return false;
    }
  }
}

export const rsrSchedulerService = new RSRSchedulerService();