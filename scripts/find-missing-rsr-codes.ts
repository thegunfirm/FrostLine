/**
 * Find Missing RSR Codes - Identify database products with RSR codes not in current feed
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function findMissingRSRCodes() {
  console.log('🔍 Finding products with RSR codes missing from current feed...');
  
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
  
  console.log(`✅ Current RSR feed contains ${rsrCodes.size} products`);

  // Get all corrupted products (where SKU = RSR stock number) 
  const corruptedProducts = await db.select({
    id: products.id,
    sku: products.sku,
    rsrStockNumber: products.rsrStockNumber,
    name: products.name,
    manufacturer: products.manufacturer
  }).from(products).where(eq(products.sku, products.rsrStockNumber));
  
  console.log(`❌ Found ${corruptedProducts.length} corrupted products in database`);

  // Find products with RSR codes not in current feed
  const missingFromFeed = [];
  const existsInFeed = [];
  
  for (const product of corruptedProducts) {
    if (!rsrCodes.has(product.rsrStockNumber)) {
      missingFromFeed.push(product);
    } else {
      existsInFeed.push(product);
    }
  }
  
  console.log(`\n📊 CRITICAL ANALYSIS RESULTS:`);
  console.log(`🔍 Products with RSR codes MISSING from feed: ${missingFromFeed.length}`);
  console.log(`✅ Products with RSR codes EXISTING in feed: ${existsInFeed.length}`);
  
  if (missingFromFeed.length > 0) {
    console.log(`\n❌ MISSING FROM RSR FEED (${missingFromFeed.length} products):`);
    console.log(`These products have RSR stock numbers that don't exist in current RSR data:`);
    
    // Group by manufacturer for better analysis
    const byManufacturer = new Map<string, any[]>();
    for (const product of missingFromFeed.slice(0, 20)) { // Show first 20
      if (!byManufacturer.has(product.manufacturer)) {
        byManufacturer.set(product.manufacturer, []);
      }
      byManufacturer.get(product.manufacturer)!.push(product);
    }
    
    for (const [manufacturer, products] of byManufacturer) {
      console.log(`\n   ${manufacturer}:`);
      for (const product of products) {
        console.log(`     ${product.rsrStockNumber} - ${product.name}`);
      }
    }
    
    if (missingFromFeed.length > 20) {
      console.log(`     ... and ${missingFromFeed.length - 20} more`);
    }
  }
  
  if (existsInFeed.length > 0) {
    console.log(`\n✅ CAN BE FIXED (${existsInFeed.length} products):`);
    console.log(`These products exist in RSR feed and can get manufacturer part numbers:`);
    
    // Show a few examples
    for (const product of existsInFeed.slice(0, 5)) {
      console.log(`     ${product.rsrStockNumber} - ${product.name}`);
    }
    if (existsInFeed.length > 5) {
      console.log(`     ... and ${existsInFeed.length - 5} more`);
    }
  }
  
  console.log(`\n🚨 BUSINESS IMPACT:`);
  console.log(`- ${missingFromFeed.length} products cannot be fixed (RSR codes don't exist)`);
  console.log(`- ${existsInFeed.length} products can be fixed with manufacturer part numbers`);
  console.log(`- Missing products may be discontinued or have data corruption`);
  
  return {
    totalCorrupted: corruptedProducts.length,
    missingFromFeed: missingFromFeed.length,
    canBeFixed: existsInFeed.length
  };
}

findMissingRSRCodes()
  .then(results => {
    console.log('\n📋 SUMMARY:');
    console.log(`Total corrupted: ${results.totalCorrupted}`);
    console.log(`Missing from RSR feed: ${results.missingFromFeed}`);
    console.log(`Can be fixed: ${results.canBeFixed}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });