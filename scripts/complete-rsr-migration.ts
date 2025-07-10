/**
 * Complete RSR Migration - Background Process
 * Loads all 29,813 RSR products with robust error handling and progress tracking
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface MigrationProgress {
  total: number;
  processed: number;
  successful: number;
  errors: number;
  currentDepartment: string;
  startTime: Date;
  lastUpdate: Date;
}

class RSRMigrationManager {
  private progress: MigrationProgress = {
    total: 0,
    processed: 0,
    successful: 0,
    errors: 0,
    currentDepartment: '',
    startTime: new Date(),
    lastUpdate: new Date()
  };

  private progressFile = join(process.cwd(), 'migration-progress.json');

  async startMigration(): Promise<void> {
    console.log('🔄 Starting complete RSR migration...');
    
    // Clear existing data
    await db.delete(products);
    console.log('✅ Cleared existing data');
    
    // Load RSR data
    const filePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
    const fileContent = readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    this.progress.total = lines.length;
    console.log(`📊 Total RSR products to process: ${lines.length.toLocaleString()}`);
    
    // Process products in very small batches
    const batchSize = 25;
    let batch: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      try {
        const product = this.parseRSRLine(line);
        if (product) {
          batch.push(product);
          
          // Insert batch when full
          if (batch.length >= batchSize) {
            await this.insertBatch(batch);
            batch = [];
          }
        }
      } catch (error) {
        this.progress.errors++;
        if (this.progress.errors % 100 === 0) {
          console.error(`Error processing line ${i + 1}: ${error.message}`);
        }
      }
      
      this.progress.processed++;
      
      // Update progress every 250 products
      if (this.progress.processed % 250 === 0) {
        this.updateProgress();
      }
    }
    
    // Insert remaining batch
    if (batch.length > 0) {
      await this.insertBatch(batch);
    }
    
    this.completeMigration();
  }

  private parseRSRLine(line: string): any | null {
    const fields = line.split(';');
    if (fields.length < 70) return null;
    
    const stockNo = fields[0];
    if (!stockNo || stockNo.trim() === '') return null;
    
    const upcCode = fields[1];
    const name = fields[2];
    const departmentNumber = fields[3];
    const manufacturer = fields[4];
    const msrp = parseFloat(fields[5]) || 0;
    const dealerPrice = parseFloat(fields[6]) || 0;
    const weight = parseFloat(fields[7]) || 0;
    const quantity = parseInt(fields[8]) || 0;
    const model = fields[9];
    const fullDescription = fields[13];
    const imageUrl = fields[14];
    const retailMAP = parseFloat(fields[70]) || 0;
    
    // Use RSR's authentic drop ship determination from field 68
    const blockedFromDropShip = fields[68] || '';
    const dropShippable = blockedFromDropShip.toLowerCase() !== 'y';
    
    return {
      sku: stockNo,
      upcCode: upcCode || null,
      name: name,
      manufacturer: manufacturer || '',
      model: model || '',
      description: fullDescription || '',
      category: 'Uncategorized',
      departmentNumber: departmentNumber || '',
      stockQuantity: quantity,
      weight: weight.toString(),
      imageUrl: imageUrl || '',
      priceBronze: msrp.toFixed(2),
      priceGold: retailMAP > 0 ? retailMAP.toFixed(2) : msrp.toFixed(2),
      pricePlatinum: (dealerPrice * 1.02).toFixed(2),
      priceWholesale: dealerPrice.toFixed(2),
      dropShippable: dropShippable,
      requiresFFL: departmentNumber === '01' || departmentNumber === '02' || departmentNumber === '05' || departmentNumber === '06',
      tags: []
    };
  }

  private async insertBatch(batch: any[]): Promise<void> {
    try {
      await db.insert(products).values(batch);
      this.progress.successful += batch.length;
    } catch (error) {
      console.error(`Batch insert error: ${error.message}`);
      this.progress.errors += batch.length;
    }
  }

  private updateProgress(): void {
    this.progress.lastUpdate = new Date();
    const percentage = ((this.progress.processed / this.progress.total) * 100).toFixed(1);
    
    console.log(`📈 Progress: ${this.progress.processed.toLocaleString()}/${this.progress.total.toLocaleString()} (${percentage}%) - ${this.progress.successful.toLocaleString()} successful, ${this.progress.errors} errors`);
    
    // Save progress to file
    writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
  }

  private completeMigration(): void {
    const duration = (new Date().getTime() - this.progress.startTime.getTime()) / 1000;
    
    console.log('✅ Complete RSR migration finished');
    console.log(`📊 Final Results:`);
    console.log(`   - Total processed: ${this.progress.processed.toLocaleString()}`);
    console.log(`   - Successfully inserted: ${this.progress.successful.toLocaleString()}`);
    console.log(`   - Errors: ${this.progress.errors.toLocaleString()}`);
    console.log(`   - Success rate: ${((this.progress.successful / this.progress.processed) * 100).toFixed(1)}%`);
    console.log(`   - Duration: ${duration.toFixed(1)} seconds`);
    
    // Final progress save
    writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
  }
}

// Start migration
const migrationManager = new RSRMigrationManager();
migrationManager.startMigration().then(() => {
  console.log('🎉 Migration completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});