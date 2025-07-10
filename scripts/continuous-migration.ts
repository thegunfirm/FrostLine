/**
 * Continuous RSR Migration with Monitoring
 * Runs migration in background with progress tracking
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';

interface MigrationStatus {
  isRunning: boolean;
  totalProducts: number;
  processedProducts: number;
  insertedProducts: number;
  errors: number;
  startTime: Date;
  lastUpdate: Date;
  percentage: number;
}

async function startContinuousMigration() {
  console.log('🚀 Starting continuous RSR migration...');
  
  // Clear database
  await db.delete(products);
  console.log('✅ Database cleared');
  
  // Load RSR file
  const filePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
  const fileContent = readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  console.log(\`📊 Processing \${lines.length.toLocaleString()} RSR products\`);
  
  // Initialize status
  const status: MigrationStatus = {
    isRunning: true,
    totalProducts: lines.length,
    processedProducts: 0,
    insertedProducts: 0,
    errors: 0,
    startTime: new Date(),
    lastUpdate: new Date(),
    percentage: 0
  };
  
  // Save initial status
  writeFileSync('migration-status.json', JSON.stringify(status, null, 2));
  
  // Process all products
  let insertedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    try {
      const fields = line.split(';');
      if (fields.length < 70) {
        errorCount++;
        continue;
      }
      
      const stockNo = fields[0];
      if (!stockNo || stockNo.trim() === '') {
        errorCount++;
        continue;
      }
      
      // Parse product data
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
      
      // Insert single product
      await db.insert(products).values([product]);
      insertedCount++;
      
      // Update status every 100 products
      if (insertedCount % 100 === 0) {
        status.processedProducts = i + 1;
        status.insertedProducts = insertedCount;
        status.errors = errorCount;
        status.percentage = ((i + 1) / lines.length) * 100;
        status.lastUpdate = new Date();
        
        writeFileSync('migration-status.json', JSON.stringify(status, null, 2));
        
        if (insertedCount % 1000 === 0) {
          console.log(\`📈 Progress: \${insertedCount.toLocaleString()} inserted (\${status.percentage.toFixed(1)}%)\`);
        }
      }
      
    } catch (error) {
      errorCount++;
      if (errorCount % 100 === 0) {
        console.error(\`Error at line \${i + 1}: \${error.message}\`);
      }
    }
  }
  
  // Final status
  status.isRunning = false;
  status.processedProducts = lines.length;
  status.insertedProducts = insertedCount;
  status.errors = errorCount;
  status.percentage = 100;
  status.lastUpdate = new Date();
  
  writeFileSync('migration-status.json', JSON.stringify(status, null, 2));
  
  console.log('✅ Continuous migration completed!');
  console.log(\`📊 Final: \${insertedCount.toLocaleString()} products inserted, \${errorCount} errors\`);
  
  return insertedCount;
}

// Start migration
startContinuousMigration().then(count => {
  console.log(\`🎉 Migration successful: \${count.toLocaleString()} products\`);
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});