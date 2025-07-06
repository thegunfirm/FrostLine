/**
 * RSR Incremental Sync Service
 * Efficient 2-hour updates focusing only on changes to minimize CPU usage
 */

import { db } from '../db';
import { products } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { RSRFTPClient } from './distributors/rsr/rsr-ftp-client';
import { parseRSRInventoryLine } from './distributors/rsr/rsr-file-processor';

interface RSRChangeTracker {
  stockNo: string;
  lastQuantity: number;
  lastPricing: string;
  lastRetailPrice: string;
  lastMapPrice: string;
  lastUpdated: Date;
}

export class RSRIncrementalSync {
  private ftpClient: RSRFTPClient;
  private changeTracker: Map<string, RSRChangeTracker> = new Map();

  constructor() {
    this.ftpClient = new RSRFTPClient();
  }

  /**
   * Lightweight sync focusing on inventory and pricing changes
   */
  async performIncrementalSync(): Promise<{
    totalProcessed: number;
    itemsUpdated: number;
    itemsDeleted: number;
    itemsAdded: number;
    cpuTimeMs: number;
  }> {
    const startTime = Date.now();
    console.log('🔄 Starting RSR incremental sync...');

    try {
      // Download only the inventory file (not attributes unless needed)
      await this.ftpClient.connect();
      const inventoryData = await this.ftpClient.downloadInventoryFile();
      await this.ftpClient.disconnect();

      // Load current state for comparison
      await this.loadCurrentState();

      // Process changes efficiently
      const changes = await this.detectChanges(inventoryData);
      
      // Apply only necessary updates
      const results = await this.applyChanges(changes);

      const cpuTimeMs = Date.now() - startTime;
      
      console.log(`✅ Incremental sync completed in ${cpuTimeMs}ms`);
      console.log(`📊 Updated: ${results.itemsUpdated}, Added: ${results.itemsAdded}, Deleted: ${results.itemsDeleted}`);

      return {
        totalProcessed: changes.length,
        itemsUpdated: results.itemsUpdated,
        itemsDeleted: results.itemsDeleted,
        itemsAdded: results.itemsAdded,
        cpuTimeMs
      };

    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      throw error;
    }
  }

  /**
   * Load current product state for comparison (CPU-efficient)
   */
  private async loadCurrentState(): Promise<void> {
    const existingProducts = await db
      .select({
        sku: products.sku,
        quantity: products.quantity,
        priceWholesale: products.priceWholesale,
        priceRetail: products.priceRetail,
        priceMAP: products.priceMAP,
        updatedAt: products.updatedAt
      })
      .from(products)
      .where(eq(products.distributor, 'RSR'));

    // Build efficient lookup map
    for (const product of existingProducts) {
      if (product.sku) {
        this.changeTracker.set(product.sku, {
          stockNo: product.sku,
          lastQuantity: product.quantity || 0,
          lastPricing: product.priceWholesale || '0',
          lastRetailPrice: product.priceRetail || '0',
          lastMapPrice: product.priceMAP || '0',
          lastUpdated: product.updatedAt || new Date()
        });
      }
    }
  }

  /**
   * Detect only items that have changed (CPU-efficient)
   */
  private async detectChanges(inventoryData: string): Promise<Array<{
    stockNo: string;
    action: 'update' | 'add' | 'delete';
    newData?: any;
    changes?: string[];
  }>> {
    const changes: Array<{
      stockNo: string;
      action: 'update' | 'add' | 'delete';
      newData?: any;
      changes?: string[];
    }> = [];

    const lines = inventoryData.split('\n');
    const currentStockNos = new Set<string>();

    // Process each line efficiently
    for (const line of lines) {
      if (!line.trim()) continue;

      const rsrProduct = parseRSRInventoryLine(line);
      if (!rsrProduct?.stockNo) continue;

      currentStockNos.add(rsrProduct.stockNo);
      const existing = this.changeTracker.get(rsrProduct.stockNo);

      if (!existing) {
        // New product
        changes.push({
          stockNo: rsrProduct.stockNo,
          action: 'add',
          newData: rsrProduct
        });
      } else {
        // Check for changes in critical fields only
        const productChanges: string[] = [];

        if (rsrProduct.quantity !== existing.lastQuantity) {
          productChanges.push('quantity');
        }
        if (rsrProduct.rsrPrice !== existing.lastPricing) {
          productChanges.push('pricing');
        }
        if (rsrProduct.retailPrice !== existing.lastRetailPrice) {
          productChanges.push('retail');
        }
        if (rsrProduct.retailMAP !== existing.lastMapPrice) {
          productChanges.push('map');
        }

        if (productChanges.length > 0) {
          changes.push({
            stockNo: rsrProduct.stockNo,
            action: 'update',
            newData: rsrProduct,
            changes: productChanges
          });
        }
      }
    }

    // Check for deleted products (quantity = 0 for 2 weeks per RSR docs)
    for (const [stockNo, tracker] of this.changeTracker) {
      if (!currentStockNos.has(stockNo)) {
        changes.push({
          stockNo,
          action: 'delete'
        });
      }
    }

    return changes;
  }

  /**
   * Apply changes efficiently (minimal database operations)
   */
  private async applyChanges(changes: Array<{
    stockNo: string;
    action: 'update' | 'add' | 'delete';
    newData?: any;
    changes?: string[];
  }>): Promise<{
    itemsUpdated: number;
    itemsAdded: number;
    itemsDeleted: number;
  }> {
    let itemsUpdated = 0;
    let itemsAdded = 0;
    let itemsDeleted = 0;

    // Process changes in batches to minimize database load
    const batchSize = 100;
    for (let i = 0; i < changes.length; i += batchSize) {
      const batch = changes.slice(i, i + batchSize);

      for (const change of batch) {
        try {
          switch (change.action) {
            case 'update':
              await this.updateProduct(change.stockNo, change.newData!, change.changes!);
              itemsUpdated++;
              break;
            case 'add':
              await this.addProduct(change.newData!);
              itemsAdded++;
              break;
            case 'delete':
              await this.deleteProduct(change.stockNo);
              itemsDeleted++;
              break;
          }
        } catch (error) {
          console.error(`❌ Failed to process ${change.action} for ${change.stockNo}:`, error);
        }
      }
    }

    return { itemsUpdated, itemsAdded, itemsDeleted };
  }

  private async updateProduct(stockNo: string, newData: any, changes: string[]): Promise<void> {
    const updates: any = { updatedAt: new Date() };

    // Only update changed fields
    if (changes.includes('quantity')) {
      updates.quantity = newData.quantity;
    }
    if (changes.includes('pricing')) {
      updates.priceWholesale = newData.rsrPrice;
    }
    if (changes.includes('retail')) {
      updates.priceRetail = newData.retailPrice;
    }
    if (changes.includes('map')) {
      updates.priceMAP = newData.retailMAP;
    }

    await db
      .update(products)
      .set(updates)
      .where(eq(products.sku, stockNo));
  }

  private async addProduct(rsrProduct: any): Promise<void> {
    // Transform and insert new product
    const productData = this.transformRSRProduct(rsrProduct);
    await db.insert(products).values(productData);
  }

  private async deleteProduct(stockNo: string): Promise<void> {
    await db
      .delete(products)
      .where(eq(products.sku, stockNo));
  }

  private transformRSRProduct(rsrProduct: any): any {
    // Transform RSR data to our product format
    return {
      name: rsrProduct.description,
      sku: rsrProduct.stockNo,
      category: this.mapDepartmentToCategory(rsrProduct.departmentNumber),
      manufacturer: rsrProduct.fullManufacturerName,
      priceWholesale: rsrProduct.rsrPrice,
      priceRetail: rsrProduct.retailPrice,
      priceMAP: rsrProduct.retailMAP,
      quantity: rsrProduct.quantity,
      distributor: 'RSR',
      requiresFFL: this.requiresFFL(rsrProduct.departmentNumber),
      tags: [],
      images: this.generateImageUrls(rsrProduct.stockNo),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private mapDepartmentToCategory(departmentNumber: string): string {
    const categoryMap: Record<string, string> = {
      '1': 'Handguns',
      '2': 'Used Handguns',
      '3': 'Used Long Guns',
      '4': 'Tasers',
      '5': 'Long Guns',
      '6': 'NFA Products',
      '7': 'Black Powder',
      '8': 'Optics',
      '9': 'Optical Accessories',
      '10': 'Magazines',
      '11': 'Grips, Pads, Stocks, Bipods',
      '12': 'Soft Gun Cases, Packs, Bags',
      '13': 'Misc. Accessories',
      '14': 'Holsters & Pouches',
      '15': 'Reloading Equipment',
      '16': 'Black Powder Accessories',
      '17': 'Closeout Accessories',
      '18': 'Ammunition',
      '19': 'Survival & Camping Supplies',
      '20': 'Lights, Lasers & Batteries',
      '21': 'Cleaning Equipment',
      '22': 'Airguns',
      '23': 'Knives & Tools',
      '24': 'High Capacity Magazines',
      '25': 'Safes & Security',
      '26': 'Safety & Protection',
      '27': 'Non-Lethal Defense',
      '28': 'Binoculars',
      '29': 'Spotting Scopes',
      '30': 'Sights',
      '31': 'Optical Accessories',
      '32': 'Barrels, Choke Tubes & Muzzle Devices',
      '33': 'Clothing',
      '34': 'Parts',
      '35': 'Slings & Swivels',
      '36': 'Electronics',
      '38': 'Books, Software & DVD\'s',
      '39': 'Targets',
      '40': 'Hard Gun Cases',
      '41': 'Upper Receivers & Conversion Kits',
      '42': 'SBR Barrels & Upper Receivers',
      '43': 'Upper Receivers & Conversion Kits - High Capacity'
    };

    return categoryMap[departmentNumber] || 'Accessories';
  }

  private requiresFFL(departmentNumber: string): boolean {
    const fflRequired = ['1', '2', '3', '5', '6', '7']; // Handguns, Used guns, Long guns, NFA, Black powder
    return fflRequired.includes(departmentNumber);
  }

  private generateImageUrls(stockNo: string): any[] {
    return [
      {
        url: `/api/rsr-image/${stockNo}`,
        alt: `${stockNo} primary image`,
        isPrimary: true
      }
    ];
  }
}