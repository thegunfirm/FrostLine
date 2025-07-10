/**
 * Continuous RSR Migration - Background Process
 * Continuously loads missing RSR products until the full 29,813 are in the database
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface MigrationStatus {
  startingCount: number;
  targetCount: number;
  currentCount: number;
  addedCount: number;
  lastUpdate: Date;
  isComplete: boolean;
}

class ContinuousRSRMigration {
  private status: MigrationStatus = {
    startingCount: 0,
    targetCount: 29813,
    currentCount: 0,
    addedCount: 0,
    lastUpdate: new Date(),
    isComplete: false
  };

  private statusFile = join(process.cwd(), 'continuous-migration-status.json');

  async start(): Promise<void> {
    console.log('🔄 Starting continuous RSR migration...');
    
    // Get starting count
    const existing = await db.select().from(products);
    this.status.startingCount = existing.length;
    this.status.currentCount = existing.length;
    
    console.log(`📊 Starting with ${this.status.startingCount.toLocaleString()} products`);
    console.log(`🎯 Target: ${this.status.targetCount.toLocaleString()} products`);
    
    // Load RSR data
    const filePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
    const fileContent = readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📂 RSR file contains ${lines.length.toLocaleString()} products`);
    
    // Get existing SKUs
    const existingSKUs = new Set(existing.map(p => p.sku));
    
    // Process missing products
    await this.processMissingProducts(lines, existingSKUs);
  }

  private async processMissingProducts(lines: string[], existingSKUs: Set<string>): Promise<void> {
    let addedCount = 0;
    const batchSize = 25;
    let batch: any[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const fields = line.split(';');
        if (fields.length < 70) continue;
        
        const stockNo = fields[0];
        if (!stockNo || stockNo.trim() === '' || existingSKUs.has(stockNo)) continue;
        
        const product = {
          sku: stockNo,
          upcCode: fields[1] || null,
          name: fields[2],
          manufacturer: fields[4] || '',
          model: fields[9] || '',
          description: fields[13] || '',
          category: 'Uncategorized',
          departmentNumber: fields[3] || '',
          stockQuantity: parseInt(fields[8]) || 0,
          weight: (parseFloat(fields[7]) || 0).toString(),
          imageUrl: fields[14] || '',
          priceBronze: (parseFloat(fields[5]) || 0).toFixed(2),
          priceGold: (parseFloat(fields[70]) || parseFloat(fields[5]) || 0).toFixed(2),
          pricePlatinum: ((parseFloat(fields[6]) || 0) * 1.02).toFixed(2),
          priceWholesale: (parseFloat(fields[6]) || 0).toFixed(2),
          dropShippable: (fields[68] || '').toLowerCase() !== 'y',
          requiresFFL: ['01', '02', '05', '06'].includes(fields[3]),
          tags: []
        };
        
        batch.push(product);
        existingSKUs.add(stockNo); // Prevent duplicates in current batch
        
        if (batch.length >= batchSize) {
          try {
            await db.insert(products).values(batch);
            addedCount += batch.length;
            batch = [];
            
            if (addedCount % 500 === 0) {
              await this.updateStatus(addedCount);
            }
          } catch (error) {
            console.error(`Batch error: ${error.message}`);
            batch = [];
          }
        }
      } catch (error) {
        // Skip individual errors silently
      }
    }
    
    // Insert remaining batch
    if (batch.length > 0) {
      try {
        await db.insert(products).values(batch);
        addedCount += batch.length;
      } catch (error) {
        console.error(`Final batch error: ${error.message}`);
      }
    }
    
    await this.completeMigration(addedCount);
  }

  private async updateStatus(addedCount: number): Promise<void> {
    this.status.addedCount = addedCount;
    this.status.currentCount = this.status.startingCount + addedCount;
    this.status.lastUpdate = new Date();
    
    const progress = ((this.status.currentCount / this.status.targetCount) * 100).toFixed(1);
    console.log(`📈 Added ${addedCount.toLocaleString()} products (${this.status.currentCount.toLocaleString()}/${this.status.targetCount.toLocaleString()} - ${progress}%)`);
    
    writeFileSync(this.statusFile, JSON.stringify(this.status, null, 2));
  }

  private async completeMigration(finalAddedCount: number): Promise<void> {
    // Get final count
    const finalProducts = await db.select().from(products);
    const finalCount = finalProducts.length;
    
    this.status.addedCount = finalAddedCount;
    this.status.currentCount = finalCount;
    this.status.isComplete = finalCount >= this.status.targetCount;
    
    console.log('✅ Continuous migration completed');
    console.log(`📊 Final Results:`);
    console.log(`   - Starting count: ${this.status.startingCount.toLocaleString()}`);
    console.log(`   - Products added: ${finalAddedCount.toLocaleString()}`);
    console.log(`   - Final count: ${finalCount.toLocaleString()}`);
    console.log(`   - Target: ${this.status.targetCount.toLocaleString()}`);
    
    if (this.status.isComplete) {
      console.log('🎉 SUCCESS: Database now contains the complete RSR catalog!');
    } else {
      console.log(`⚠️  Still missing ${(this.status.targetCount - finalCount).toLocaleString()} products`);
    }
    
    writeFileSync(this.statusFile, JSON.stringify(this.status, null, 2));
  }
}

// Start the continuous migration
const migration = new ContinuousRSRMigration();
migration.start().then(() => {
  console.log('🏁 Migration process completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});