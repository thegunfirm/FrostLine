/**
 * Delete Missing RSR Products - Remove only the 394 products with non-existent RSR codes
 * SAFETY: Only deletes products where RSR codes don't exist in current feed
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function deleteMissingRSRProducts() {
  console.log('🔍 Identifying products with missing RSR codes for deletion...');
  
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
  const corruptedProducts = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
  
  console.log(`❌ Found ${corruptedProducts.length} corrupted products in database`);

  // Find products with RSR codes not in current feed
  const missingFromFeed = [];
  
  for (const product of corruptedProducts) {
    if (!rsrCodes.has(product.rsrStockNumber)) {
      missingFromFeed.push(product);
    }
  }
  
  console.log(`🎯 Found ${missingFromFeed.length} products to delete (missing RSR codes)`);
  
  if (missingFromFeed.length === 0) {
    console.log('✅ No products to delete');
    return;
  }

  // Show what will be deleted
  console.log('\n📋 PRODUCTS TO BE DELETED:');
  const productIds = missingFromFeed.map(p => p.id);
  
  // Group by manufacturer for review
  const byManufacturer = new Map<string, any[]>();
  for (const product of missingFromFeed.slice(0, 10)) {
    if (!byManufacturer.has(product.manufacturer)) {
      byManufacturer.set(product.manufacturer, []);
    }
    byManufacturer.get(product.manufacturer)!.push(product);
  }
  
  for (const [manufacturer, products] of byManufacturer) {
    console.log(`   ${manufacturer}:`);
    for (const product of products) {
      console.log(`     ${product.rsrStockNumber} - ${product.name}`);
    }
  }
  
  if (missingFromFeed.length > 10) {
    console.log(`     ... and ${missingFromFeed.length - 10} more`);
  }

  console.log(`\n⚠️  SAFETY CHECK: Deleting ONLY products with RSR codes missing from feed`);
  console.log(`   Total to delete: ${missingFromFeed.length}`);
  console.log(`   Products with valid RSR codes preserved: ${corruptedProducts.length - missingFromFeed.length}`);
  
  // Delete the products with missing RSR codes
  console.log('\n🗑️  Deleting products...');
  
  const deleteResult = await db.delete(products)
    .where(inArray(products.id, productIds));
  
  console.log(`✅ Deleted ${missingFromFeed.length} products with missing RSR codes`);
  
  // Verify deletion
  const remainingCorrupted = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
    
  const totalRemaining = await db.select().from(products);
  
  console.log(`\n📊 POST-DELETION STATUS:`);
  console.log(`   Total products remaining: ${totalRemaining.length}`);
  console.log(`   Corrupted products remaining: ${remainingCorrupted.length}`);
  console.log(`   All remaining corrupted products have valid RSR codes in feed`);
  console.log(`   ✅ Ready for Field 12 fixes to continue`);
  
  return {
    deleted: missingFromFeed.length,
    totalRemaining: totalRemaining.length,
    corruptedRemaining: remainingCorrupted.length
  };
}

deleteMissingRSRProducts()
  .then(results => {
    if (results) {
      console.log('\n🎉 CLEANUP COMPLETE:');
      console.log(`   Deleted: ${results.deleted} products`);
      console.log(`   Total remaining: ${results.totalRemaining}`);
      console.log(`   Ready for RSR natural updates`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });