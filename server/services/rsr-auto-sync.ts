/**
 * RSR Auto Sync Service
 * Simple 2-hour incremental sync using existing infrastructure
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../db';
import { products } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class RSRAutoSync {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSyncTime = new Date();

  /**
   * Start the 2-hour sync schedule
   */
  start(): void {
    if (this.intervalId) {
      console.log('⚠️ RSR auto-sync already running');
      return;
    }

    console.log('🚀 Starting RSR 2-hour auto-sync...');
    
    // Run initial sync after 5 minutes to let system stabilize
    setTimeout(() => {
      this.runIncrementalSync();
    }, 5 * 60 * 1000);
    
    // Schedule every 2 hours
    this.intervalId = setInterval(() => {
      this.runIncrementalSync();
    }, 2 * 60 * 60 * 1000);

    console.log('✅ RSR auto-sync started - will sync every 2 hours');
  }

  /**
   * Stop the auto-sync
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ RSR auto-sync stopped');
    }
  }

  /**
   * Run incremental sync with change detection
   */
  private async runIncrementalSync(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ RSR sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log(`🔄 RSR incremental sync starting at ${startTime.toISOString()}`);
      
      // Check if RSR inventory file exists
      const inventoryPath = join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
      
      const fs = await import('fs');
      if (!fs.existsSync(inventoryPath)) {
        console.log('📂 No RSR inventory file found, skipping sync');
        return;
      }

      // Get current product state for comparison
      const existingProducts = await this.getCurrentProductState();
      console.log(`📊 Found ${existingProducts.size} existing RSR products`);

      // Process inventory file for changes
      const changes = await this.detectChanges(inventoryPath, existingProducts);
      
      if (changes.updates.length === 0 && changes.adds.length === 0) {
        console.log('✅ No changes detected in RSR inventory');
        return;
      }

      // Apply changes
      let updated = 0;
      let added = 0;

      // Update existing products
      for (const update of changes.updates) {
        try {
          await db
            .update(products)
            .set({
              quantity: update.quantity,
              priceWholesale: update.rsrPrice,
              priceMsrp: update.retailPrice,
              priceMap: update.mapPrice,
              updatedAt: new Date()
            })
            .where(eq(products.sku, update.stockNo));
          updated++;
        } catch (error) {
          console.error(`Failed to update ${update.stockNo}:`, error);
        }
      }

      // Add new products (simplified)
      for (const add of changes.adds.slice(0, 50)) { // Limit to 50 new products per cycle
        try {
          await db.insert(products).values({
            name: add.description,
            sku: add.stockNo,
            category: this.mapDepartmentToCategory(add.departmentNumber),
            departmentNumber: add.departmentNumber,
            manufacturer: add.fullManufacturerName,
            priceWholesale: add.rsrPrice,
            quantity: add.quantity,
            distributor: 'RSR',
            requiresFFL: this.requiresFFL(add.departmentNumber),
            tags: [],
            images: [{ url: `/api/rsr-image/${add.stockNo}`, alt: add.description, isPrimary: true }],
            createdAt: new Date(),
            updatedAt: new Date()
          });
          added++;
        } catch (error) {
          console.error(`Failed to add ${add.stockNo}:`, error);
        }
      }

      const duration = Date.now() - startTime.getTime();
      console.log(`✅ RSR sync completed in ${duration}ms`);
      console.log(`📊 Updated: ${updated}, Added: ${added}`);
      
      this.lastSyncTime = new Date();
      
    } catch (error) {
      console.error('❌ RSR auto-sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get current product state for comparison
   */
  private async getCurrentProductState(): Promise<Map<string, any>> {
    const existing = await db
      .select({
        sku: products.sku,
        quantity: products.quantity,
        priceWholesale: products.priceWholesale,
      })
      .from(products)
      .where(eq(products.distributor, 'RSR'));

    const productMap = new Map();
    for (const product of existing) {
      if (product.sku) {
        productMap.set(product.sku, {
          quantity: product.quantity || 0,
          priceWholesale: product.priceWholesale || '0'
        });
      }
    }
    return productMap;
  }

  /**
   * Detect changes in RSR inventory
   */
  private async detectChanges(filePath: string, existingProducts: Map<string, any>): Promise<{
    updates: Array<{ stockNo: string; quantity: number; rsrPrice: string }>;
    adds: Array<any>;
  }> {
    const updates: Array<{ stockNo: string; quantity: number; rsrPrice: string }> = [];
    const adds: Array<any> = [];

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');

      let processed = 0;
      for (const line of lines) {
        if (!line.trim()) continue;

        const rsrProduct = this.parseRSRLine(line);
        if (!rsrProduct) continue;

        const existing = existingProducts.get(rsrProduct.stockNo);
        
        if (existing) {
          // Check for changes
          const quantityChanged = rsrProduct.quantity !== existing.quantity;
          const priceChanged = rsrProduct.rsrPrice !== existing.priceWholesale;
          
          if (quantityChanged || priceChanged) {
            updates.push({
              stockNo: rsrProduct.stockNo,
              quantity: rsrProduct.quantity,
              rsrPrice: rsrProduct.rsrPrice,
              retailPrice: rsrProduct.retailPrice,
              mapPrice: rsrProduct.mapPrice
            });
          }
        } else {
          // New product
          adds.push(rsrProduct);
        }

        processed++;
        if (processed % 5000 === 0) {
          console.log(`🔍 Scanned ${processed} products for changes...`);
        }
      }

      console.log(`🔍 Change detection complete: ${updates.length} updates, ${adds.length} new products`);
      return { updates, adds };
      
    } catch (error) {
      console.error('Error detecting changes:', error);
      return { updates: [], adds: [] };
    }
  }

  /**
   * Parse RSR inventory line with complete pricing data
   */
  private parseRSRLine(line: string): any {
    const fields = line.split(';');
    if (fields.length < 77) return null;

    return {
      stockNo: fields[0]?.trim() || '',
      description: fields[2]?.trim() || '',
      departmentNumber: fields[3]?.trim() || '',
      retailPrice: parseFloat(fields[5]?.trim() || '0'),  // MSRP
      rsrPrice: fields[6]?.trim() || '0',                 // Wholesale
      quantity: parseInt(fields[8]?.trim() || '0'),
      fullManufacturerName: fields[10]?.trim() || '',
      mapPrice: parseFloat(fields[70]?.trim() || fields[5]?.trim() || '0')  // MAP field at position 70
    };
  }

  private mapDepartmentToCategory(departmentNumber: string): string {
    const categoryMap: Record<string, string> = {
      '1': 'Handguns', '2': 'Used Handguns', '3': 'Used Long Guns', '4': 'Tasers',
      '5': 'Long Guns', '6': 'NFA Products', '7': 'Black Powder', '8': 'Optics',
      '9': 'Optical Accessories', '10': 'Magazines', '11': 'Grips, Pads, Stocks, Bipods',
      '12': 'Soft Gun Cases, Packs, Bags', '13': 'Misc. Accessories', '14': 'Holsters & Pouches',
      '15': 'Reloading Equipment', '16': 'Black Powder Accessories', '17': 'Closeout Accessories',
      '18': 'Ammunition', '19': 'Survival & Camping Supplies', '20': 'Lights, Lasers & Batteries',
      '21': 'Cleaning Equipment', '22': 'Airguns', '23': 'Knives & Tools', '24': 'High Capacity Magazines',
      '25': 'Safes & Security', '26': 'Safety & Protection', '27': 'Non-Lethal Defense',
      '28': 'Binoculars', '29': 'Spotting Scopes', '30': 'Sights', '31': 'Optical Accessories',
      '32': 'Barrels, Choke Tubes & Muzzle Devices', '33': 'Clothing', '34': 'Parts',
      '35': 'Slings & Swivels', '36': 'Electronics', '38': 'Books, Software & DVDs',
      '39': 'Targets', '40': 'Hard Gun Cases', '41': 'Upper Receivers & Conversion Kits',
      '42': 'SBR Barrels & Upper Receivers', '43': 'Upper Receivers & Conversion Kits - High Capacity'
    };
    return categoryMap[departmentNumber] || 'Accessories';
  }

  private requiresFFL(departmentNumber: string): boolean {
    const fflRequired = ['1', '2', '3', '5', '6', '7'];
    return fflRequired.includes(departmentNumber);
  }

  /**
   * Get sync status
   */
  getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
    lastSync: Date;
    nextSync: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      isScheduled: this.intervalId !== null,
      lastSync: this.lastSyncTime,
      nextSync: this.intervalId ? new Date(Date.now() + 2 * 60 * 60 * 1000) : null
    };
  }
}

// Export singleton instance
export const rsrAutoSync = new RSRAutoSync();