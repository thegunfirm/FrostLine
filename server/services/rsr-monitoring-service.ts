/**
 * RSR Monitoring Service
 * Provides daily monitoring of RSR field mapping integrity
 */

import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { products } from '../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';

interface MonitoringConfig {
  enabled: boolean;
  schedule: string;
  rsrDataPath: string;
  checkFields: string[];
  alertOnCorruption: boolean;
  autoFix: boolean;
  lastRun: string | null;
  createdAt: string;
  description: string;
}

interface MonitoringResult {
  timestamp: string;
  totalProducts: number;
  corruptedProducts: number;
  corruptionRate: number;
  fixesApplied: number;
  errors: string[];
  isHealthy: boolean;
}

export class RSRMonitoringService {
  private configPath: string;
  private config: MonitoringConfig | null = null;

  constructor() {
    this.configPath = path.join(process.cwd(), 'server', 'config', 'rsr-monitoring.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      console.error('Failed to load RSR monitoring config:', error);
    }
  }

  private saveConfig(): void {
    try {
      if (this.config) {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      }
    } catch (error) {
      console.error('Failed to save RSR monitoring config:', error);
    }
  }

  /**
   * Check for field mapping corruption
   */
  async checkFieldIntegrity(): Promise<MonitoringResult> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    let fixesApplied = 0;

    try {
      // Count total products
      const totalProductsResult = await db.select({ count: sql<number>`count(*)` }).from(products);
      const totalProducts = totalProductsResult[0]?.count || 0;

      // Find corrupted products (where SKU equals RSR stock number)
      const corruptedProductsResult = await db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(sql`sku = rsr_stock_number`);
      
      const corruptedProducts = corruptedProductsResult[0]?.count || 0;
      const corruptionRate = totalProducts > 0 ? (corruptedProducts / totalProducts) * 100 : 0;

      console.log(`🔍 RSR Field Integrity Check:`);
      console.log(`   Total products: ${totalProducts}`);
      console.log(`   Corrupted products: ${corruptedProducts}`);
      console.log(`   Corruption rate: ${corruptionRate.toFixed(2)}%`);

      // Auto-fix if enabled and corruption detected
      if (this.config?.autoFix && corruptedProducts > 0) {
        console.log('🔧 Auto-fix enabled, attempting to repair corruption...');
        fixesApplied = await this.autoFixCorruption();
      }

      // Update last run timestamp
      if (this.config) {
        this.config.lastRun = timestamp;
        this.saveConfig();
      }

      const isHealthy = corruptedProducts === 0;
      
      return {
        timestamp,
        totalProducts,
        corruptedProducts,
        corruptionRate,
        fixesApplied,
        errors,
        isHealthy
      };

    } catch (error: any) {
      errors.push(`Integrity check failed: ${error.message}`);
      console.error('❌ RSR field integrity check failed:', error);
      
      return {
        timestamp,
        totalProducts: 0,
        corruptedProducts: 0,
        corruptionRate: 0,
        fixesApplied: 0,
        errors,
        isHealthy: false
      };
    }
  }

  /**
   * Auto-fix detected corruption using RSR data
   */
  private async autoFixCorruption(): Promise<number> {
    let fixesApplied = 0;

    try {
      const rsrDataPath = path.join(process.cwd(), this.config?.rsrDataPath || 'server/data/rsr/downloads/rsrinventory-new.txt');
      
      if (!fs.existsSync(rsrDataPath)) {
        console.log('⚠️  RSR data file not found, cannot auto-fix');
        return 0;
      }

      const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());

      console.log(`🔄 Processing ${lines.length} RSR records for auto-fix...`);

      for (const line of lines) {
        const fields = line.split(';');
        if (fields.length < 12) continue;

        const rsrStockNumber = fields[0]?.trim();
        const manufacturerPartNumber = fields[11]?.trim();

        if (!rsrStockNumber || !manufacturerPartNumber || rsrStockNumber === manufacturerPartNumber) {
          continue;
        }

        // Find and fix corrupted products
        const corruptedProducts = await db.select()
          .from(products)
          .where(eq(products.sku, rsrStockNumber));

        for (const product of corruptedProducts) {
          await db.update(products)
            .set({
              sku: manufacturerPartNumber,                    // Customer-facing SKU
              rsrStockNumber: rsrStockNumber,                 // RSR ordering code
              manufacturerPartNumber: manufacturerPartNumber,  // Manufacturer part number
              updatedAt: new Date()
            })
            .where(eq(products.id, product.id));

          fixesApplied++;
          console.log(`✅ Auto-fixed: ${rsrStockNumber} → ${manufacturerPartNumber}`);
        }
      }

      console.log(`🎉 Auto-fix complete: ${fixesApplied} products corrected`);
      return fixesApplied;

    } catch (error: any) {
      console.error('❌ Auto-fix failed:', error);
      return fixesApplied;
    }
  }

  /**
   * Run daily monitoring check
   */
  async runDailyCheck(): Promise<MonitoringResult> {
    console.log('📅 Running daily RSR field integrity check...');
    
    if (!this.config?.enabled) {
      console.log('⚠️  RSR monitoring is disabled');
      return {
        timestamp: new Date().toISOString(),
        totalProducts: 0,
        corruptedProducts: 0,
        corruptionRate: 0,
        fixesApplied: 0,
        errors: ['Monitoring disabled'],
        isHealthy: false
      };
    }

    const result = await this.checkFieldIntegrity();
    
    if (result.isHealthy) {
      console.log('✅ Daily check: RSR field mapping is healthy');
    } else {
      console.log(`⚠️  Daily check: Found ${result.corruptedProducts} corrupted products`);
      if (result.fixesApplied > 0) {
        console.log(`🔧 Applied ${result.fixesApplied} automatic fixes`);
      }
    }

    return result;
  }

  /**
   * Get current monitoring status
   */
  getStatus(): { enabled: boolean; lastRun: string | null; config: MonitoringConfig | null } {
    return {
      enabled: this.config?.enabled || false,
      lastRun: this.config?.lastRun || null,
      config: this.config
    };
  }

  /**
   * Enable monitoring
   */
  enable(): void {
    if (this.config) {
      this.config.enabled = true;
      this.saveConfig();
      console.log('✅ RSR monitoring enabled');
    }
  }

  /**
   * Disable monitoring
   */
  disable(): void {
    if (this.config) {
      this.config.enabled = false;
      this.saveConfig();
      console.log('❌ RSR monitoring disabled');
    }
  }
}

export const rsrMonitoringService = new RSRMonitoringService();