/**
 * Analyze the remaining 5.10% corrupted products
 * Show what RSR data exists for these products
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function analyzeRemainingCorrupted() {
  console.log('🔍 Analyzing remaining 5.10% corrupted products...');
  
  // Load RSR data to check what's available
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  const rsrData = new Map<string, any>();
  
  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 12 && fields[0]) {
      rsrData.set(fields[0].trim(), {
        rsrCode: fields[0]?.trim() || '',
        upc: fields[1]?.trim() || '',
        description: fields[2]?.trim() || '',
        manufacturer: fields[7]?.trim() || '',
        manufacturerPart: fields[11]?.trim() || '',
        hasManufacturerPart: !!(fields[11]?.trim())
      });
    }
  }
  
  // Get remaining corrupted products
  const corrupted = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber))
    .limit(100);
  
  console.log(`\n📊 Found ${corrupted.length} corrupted products (showing first 100)`);
  console.log(`📋 Total in RSR feed: ${rsrData.size} products\n`);
  
  let foundInRSR = 0;
  let hasManufacturerPart = 0;
  let missingManufacturerPart = 0;
  let notInRSR = 0;
  
  console.log('ANALYSIS RESULTS:');
  console.log('='.repeat(80));
  
  for (const product of corrupted.slice(0, 20)) { // Show first 20 in detail
    const rsrInfo = rsrData.get(product.rsrStockNumber);
    
    if (rsrInfo) {
      foundInRSR++;
      if (rsrInfo.hasManufacturerPart) {
        hasManufacturerPart++;
        console.log(`✅ ${product.rsrStockNumber} | ${product.name} | Mfg Part: "${rsrInfo.manufacturerPart}"`);
      } else {
        missingManufacturerPart++;
        console.log(`❌ ${product.rsrStockNumber} | ${product.name} | NO MANUFACTURER PART`);
      }
    } else {
      notInRSR++;
      console.log(`🚫 ${product.rsrStockNumber} | ${product.name} | NOT IN RSR FEED`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY FOR ALL CORRUPTED PRODUCTS:');
  
  // Analyze all corrupted products
  for (const product of corrupted) {
    const rsrInfo = rsrData.get(product.rsrStockNumber);
    
    if (rsrInfo) {
      foundInRSR++;
      if (rsrInfo.hasManufacturerPart) {
        hasManufacturerPart++;
      } else {
        missingManufacturerPart++;
      }
    } else {
      notInRSR++;
    }
  }
  
  console.log(`📊 Found in RSR feed: ${foundInRSR}/${corrupted.length} (${((foundInRSR/corrupted.length)*100).toFixed(1)}%)`);
  console.log(`✅ Has manufacturer part: ${hasManufacturerPart} (${((hasManufacturerPart/corrupted.length)*100).toFixed(1)}%)`);
  console.log(`❌ Missing manufacturer part: ${missingManufacturerPart} (${((missingManufacturerPart/corrupted.length)*100).toFixed(1)}%)`);
  console.log(`🚫 Not in RSR feed: ${notInRSR} (${((notInRSR/corrupted.length)*100).toFixed(1)}%)`);
  
  if (hasManufacturerPart > 0) {
    console.log(`\n⚠️ WARNING: ${hasManufacturerPart} products HAVE manufacturer parts but couldn't be fixed!`);
    console.log('This indicates a potential issue with the fix script.');
  }
  
  if (missingManufacturerPart > 0) {
    console.log(`\n🎯 ${missingManufacturerPart} products legitimately lack manufacturer part numbers in RSR data`);
    console.log('These cannot be fixed - RSR simply doesn\'t provide Field 12 data for them.');
  }
  
  if (notInRSR > 0) {
    console.log(`\n🔍 ${notInRSR} products not found in current RSR feed`);
    console.log('These may be discontinued or require RSR feed refresh.');
  }
}

analyzeRemainingCorrupted().then(() => process.exit(0)).catch(console.error);