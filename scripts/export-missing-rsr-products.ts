/**
 * Export Missing RSR Products - Complete list of 394 products with non-existent RSR codes
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function exportMissingRSRProducts() {
  console.log('🔍 Generating complete list of products with missing RSR codes...');
  
  // Load all RSR codes from current feed
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  const rsrCodes = new Set<string>();
  
  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 1 && fields[0]) {
      rsrCodes.add(fields[0].trim());
    }
  }
  
  // Get all corrupted products 
  const corruptedProducts = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
  
  // Find products with RSR codes not in current feed
  const missingFromFeed = [];
  
  for (const product of corruptedProducts) {
    if (!rsrCodes.has(product.rsrStockNumber)) {
      missingFromFeed.push(product);
    }
  }
  
  console.log(`❌ Found ${missingFromFeed.length} products with missing RSR codes`);
  
  // Sort by manufacturer, then by RSR stock number
  missingFromFeed.sort((a, b) => {
    if (a.manufacturer !== b.manufacturer) {
      return a.manufacturer.localeCompare(b.manufacturer);
    }
    return a.rsrStockNumber.localeCompare(b.rsrStockNumber);
  });
  
  console.log('\n📋 COMPLETE LIST OF 394 PRODUCTS WITH MISSING RSR CODES:');
  console.log('=' .repeat(80));
  
  let currentManufacturer = '';
  let count = 0;
  
  for (const product of missingFromFeed) {
    count++;
    
    // Group by manufacturer
    if (product.manufacturer !== currentManufacturer) {
      currentManufacturer = product.manufacturer;
      console.log(`\n${currentManufacturer}:`);
    }
    
    console.log(`  ${count.toString().padStart(3)}. ${product.rsrStockNumber} - ${product.name}`);
    if (product.category) {
      console.log(`       Category: ${product.category} | Price: $${product.price || 'N/A'}`);
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log(`📊 SUMMARY: ${missingFromFeed.length} products total`);
  
  // Export to file for RSR verification
  const exportData = missingFromFeed.map(p => ({
    RSR_Stock_Number: p.rsrStockNumber,
    Product_Name: p.name,
    Manufacturer: p.manufacturer,
    Category: p.category,
    Database_ID: p.id,
    Current_Price: p.price
  }));
  
  const exportPath = path.join(process.cwd(), 'missing-rsr-products.json');
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  console.log(`📁 Exported to: ${exportPath}`);
  console.log(`📧 Send this list to RSR to verify if these products were discontinued`);
  
  return missingFromFeed;
}

exportMissingRSRProducts()
  .then(results => {
    console.log(`\n✅ Export complete: ${results.length} products listed`);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });