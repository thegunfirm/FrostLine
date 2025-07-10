/**
 * Quick RSR Sync - Update inventory with latest FTP data
 * Processes the freshly downloaded RSR inventory file
 */

import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface RSRProduct {
  stockNo: string;
  departmentNumber: string;
  description: string;
  quantity: string;
  retailPrice: string;
  retailMAP: string;
  [key: string]: any;
}

/**
 * Parse RSR inventory line (77 fields)
 */
function parseRSRLine(line: string): RSRProduct | null {
  const fields = line.split(';');
  
  if (fields.length < 77) {
    return null;
  }

  return {
    stockNo: fields[0]?.trim() || '',
    upc: fields[1]?.trim() || '',
    description: fields[2]?.trim() || '',
    departmentNumber: fields[3]?.trim() || '',
    manufacturerName: fields[4]?.trim() || '',
    retailPrice: fields[5]?.trim() || '0',
    retailMAP: fields[6]?.trim() || '0',
    quantity: fields[7]?.trim() || '0',
    productWeight: fields[8]?.trim() || '0',
    inventoryQuantity: fields[9]?.trim() || '0',
    model: fields[10]?.trim() || '',
    mfgPartNumber: fields[11]?.trim() || '',
    blocked: fields[68]?.trim() || '',
    imageURL: fields[69]?.trim() || '',
    allocated: fields[70]?.trim() || '',
    accessoryToStockNo: fields[71]?.trim() || '',
    dropShippable: fields[72]?.trim() || '',
    date: fields[73]?.trim() || '',
    gunType: fields[74]?.trim() || '',
    used: fields[75]?.trim() || '',
    action: fields[76]?.trim() || ''
  };
}

/**
 * Quick sync with latest RSR data
 */
async function quickRSRSync() {
  try {
    console.log('🔄 Starting quick RSR sync...');
    
    // Read the freshly downloaded RSR file
    const filePath = join(process.cwd(), 'server/data/rsr/downloads/rsrinventory-new.txt');
    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    
    console.log(`📄 Processing ${lines.length} lines from RSR file`);
    
    // Get current database SKUs
    const existingProducts = await db.select({
      sku: products.sku,
      stockQuantity: products.stockQuantity
    }).from(products);
    
    const existingSKUs = new Set(existingProducts.map(p => p.sku));
    console.log(`📊 Current database: ${existingSKUs.size} products`);
    
    // Track changes
    let newProducts = 0;
    let updatedProducts = 0;
    let processedProducts = 0;
    
    // Process in batches
    const batchSize = 100;
    const rsrProducts = lines.map(parseRSRLine).filter(Boolean);
    
    for (let i = 0; i < rsrProducts.length; i += batchSize) {
      const batch = rsrProducts.slice(i, i + batchSize);
      
      for (const rsrProduct of batch) {
        if (!rsrProduct || !rsrProduct.stockNo) continue;
        
        const stockQuantity = parseInt(rsrProduct.quantity) || 0;
        
        if (existingSKUs.has(rsrProduct.stockNo)) {
          // Update existing product stock
          await db.update(products)
            .set({ stockQuantity })
            .where(eq(products.sku, rsrProduct.stockNo));
          updatedProducts++;
        } else {
          // This would be a new product (shouldn't happen with complete sync)
          newProducts++;
        }
        
        processedProducts++;
      }
      
      // Progress update
      if (i % 1000 === 0) {
        console.log(`📊 Processed ${processedProducts}/${rsrProducts.length} products`);
      }
    }
    
    console.log('✅ Quick RSR sync completed');
    console.log(`📊 Results:`);
    console.log(`   - Products processed: ${processedProducts}`);
    console.log(`   - Stock updates: ${updatedProducts}`);
    console.log(`   - New products: ${newProducts}`);
    
    // Check ammunition count
    const ammunitionCount = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '18'));
    
    console.log(`🎯 Ammunition products: ${ammunitionCount.length}`);
    
    // Check in-stock ammunition
    const inStockAmmo = await db.select()
      .from(products)
      .where(and(
        eq(products.departmentNumber, '18'),
        gt(products.stockQuantity, 0)
      ));
    
    console.log(`📦 In-stock ammunition: ${inStockAmmo.length}`);
    
  } catch (error) {
    console.error('❌ Quick sync failed:', error);
  }
}

// Import required functions
import { eq, and, gt } from 'drizzle-orm';

quickRSRSync().catch(console.error);