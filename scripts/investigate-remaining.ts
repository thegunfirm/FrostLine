/**
 * Deep investigation of the remaining corrupted products
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function investigateRemaining() {
  console.log('🔍 Deep investigation of remaining products...');
  
  // Load RSR lookup
  const rsrDataPath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  const rsrData = new Map<string, any>();
  
  const fileContent = fs.readFileSync(rsrDataPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length >= 12 && fields[0]) {
      rsrData.set(fields[0].trim(), {
        field1: fields[0]?.trim() || '', // RSR Stock Number
        field12: fields[11]?.trim() || '', // Manufacturer Part
        hasField12: !!(fields[11]?.trim() && fields[11].trim() !== ''),
        field12Length: fields[11]?.trim()?.length || 0
      });
    }
  }
  
  // Get first 10 corrupted products for detailed analysis
  const corrupted = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber))
    .limit(10);
  
  console.log(`\nANALYZING ${corrupted.length} SAMPLE PRODUCTS:`);
  console.log('='.repeat(100));
  
  for (const product of corrupted) {
    const rsrInfo = rsrData.get(product.rsrStockNumber);
    
    console.log(`\nProduct: ${product.name}`);
    console.log(`  Database SKU: "${product.sku}"`);
    console.log(`  Database RSR: "${product.rsrStockNumber}"`);
    console.log(`  SKU === RSR: ${product.sku === product.rsrStockNumber}`);
    
    if (rsrInfo) {
      console.log(`  RSR Field 1: "${rsrInfo.field1}"`);
      console.log(`  RSR Field 12: "${rsrInfo.field12}"`);
      console.log(`  Has Field 12: ${rsrInfo.hasField12}`);
      console.log(`  Field 12 Length: ${rsrInfo.field12Length}`);
      console.log(`  Field 12 !== Field 1: ${rsrInfo.field12 !== rsrInfo.field1}`);
      console.log(`  Should Fix: ${rsrInfo.hasField12 && rsrInfo.field12 !== rsrInfo.field1}`);
    } else {
      console.log(`  ❌ NOT FOUND in RSR feed`);
    }
  }
  
  // Summary analysis
  let foundInRSR = 0;
  let hasField12 = 0;
  let field12Different = 0;
  
  const allCorrupted = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
  
  for (const product of allCorrupted) {
    const rsrInfo = rsrData.get(product.rsrStockNumber);
    
    if (rsrInfo) {
      foundInRSR++;
      if (rsrInfo.hasField12) {
        hasField12++;
        if (rsrInfo.field12 !== rsrInfo.field1) {
          field12Different++;
        }
      }
    }
  }
  
  console.log(`\n${'='.repeat(100)}`);
  console.log(`SUMMARY OF ALL ${allCorrupted.length} CORRUPTED PRODUCTS:`);
  console.log(`  Found in RSR feed: ${foundInRSR} (${((foundInRSR/allCorrupted.length)*100).toFixed(1)}%)`);
  console.log(`  Has Field 12 data: ${hasField12} (${((hasField12/allCorrupted.length)*100).toFixed(1)}%)`);
  console.log(`  Field 12 ≠ Field 1: ${field12Different} (${((field12Different/allCorrupted.length)*100).toFixed(1)}%)`);
  console.log(`  Should be fixable: ${field12Different}`);
  
  if (field12Different === 0) {
    console.log(`\n🎯 CONCLUSION: All remaining products have Field 12 = Field 1`);
    console.log(`This means these are legitimate cases where manufacturer part = RSR stock number`);
    console.log(`No further fixing is possible or needed.`);
  } else {
    console.log(`\n⚠️ ${field12Different} products could still be fixed`);
  }
}

investigateRemaining().then(() => process.exit(0)).catch(console.error);