/**
 * Process Real RSR Data File
 * Uses the actual rsrinventory-new.txt file to populate database with authentic RSR products
 */

import { readFileSync } from 'fs';
import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq } from 'drizzle-orm';

const RSR_FILE_PATH = '/home/runner/workspace/server/data/rsr/downloads/rsrinventory-new.txt';

function parseRSRLine(line: string): any {
  const fields = line.split('|');
  
  if (fields.length < 77) {
    return null;
  }
  
  return {
    stockNumber: fields[0]?.trim(),
    upcCode: fields[1]?.trim(), 
    description: fields[2]?.trim(),
    departmentNumber: fields[3]?.trim(),
    manufacturerId: fields[4]?.trim(),
    retailPrice: fields[5]?.trim(),
    rsrPricing: fields[6]?.trim(),
    productWeight: fields[7]?.trim(),
    inventoryQuantity: fields[8]?.trim(),
    model: fields[9]?.trim(),
    fullManufacturerName: fields[10]?.trim(),
    manufacturerPartNumber: fields[11]?.trim(),
    allocatedCloseoutDeleted: fields[12]?.trim(),
    expandedDescription: fields[13]?.trim(),
    imageName: fields[14]?.trim(),
    retailMAP: fields[70]?.trim(),
    groundShipOnly: fields[66]?.trim(),
    adultSignatureRequired: fields[67]?.trim(),
    prop65: fields[75]?.trim()
  };
}

function requiresFFL(departmentNumber: string): boolean {
  // RSR department numbers that require FFL transfers
  const fflDepartments = ['1', '2', '3', '5', '6', '7'];
  return fflDepartments.includes(departmentNumber);
}

function mapDepartmentToCategory(departmentNumber: string): string {
  const deptMap: Record<string, string> = {
    '1': 'Handguns',
    '2': 'Rifles', 
    '3': 'Shotguns',
    '4': 'Ammunition',
    '5': 'Optics',
    '6': 'Accessories',
    '7': 'Parts',
    '8': 'Safety',
    '9': 'Airguns'
  };
  return deptMap[departmentNumber] || 'Accessories';
}

async function processRealRSRData() {
  try {
    console.log('📂 Reading real RSR inventory file...');
    const fileContent = readFileSync(RSR_FILE_PATH, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Found ${lines.length} lines in RSR file`);
    
    // Clear existing products
    console.log('🗑️  Clearing existing products...');
    await db.delete(products);
    
    let processed = 0;
    let fflCount = 0;
    
    for (const line of lines) {
      try {
        const rsrProduct = parseRSRLine(line);
        if (!rsrProduct || !rsrProduct.stockNumber) continue;
        
        const requiresFFLTransfer = requiresFFL(rsrProduct.departmentNumber);
        if (requiresFFLTransfer) fflCount++;
        
        const productData = {
          name: rsrProduct.description || rsrProduct.model || 'Unknown Product',
          description: rsrProduct.expandedDescription || rsrProduct.description,
          category: mapDepartmentToCategory(rsrProduct.departmentNumber),
          manufacturer: rsrProduct.manufacturerId,
          manufacturerPartNumber: rsrProduct.manufacturerPartNumber,
          sku: rsrProduct.stockNumber,
          priceWholesale: rsrProduct.rsrPricing || '0',
          priceMAP: rsrProduct.retailMAP || rsrProduct.retailPrice || '0',
          priceMSRP: rsrProduct.retailPrice || '0',
          priceBronze: rsrProduct.retailPrice || '0',
          priceGold: rsrProduct.retailMAP || rsrProduct.retailPrice || '0', 
          pricePlatinum: rsrProduct.rsrPricing || '0',
          inStock: parseInt(rsrProduct.inventoryQuantity || '0') > 0,
          stockQuantity: parseInt(rsrProduct.inventoryQuantity || '0'),
          allocated: rsrProduct.allocatedCloseoutDeleted,
          distributor: 'RSR',
          requiresFFL: requiresFFLTransfer,
          upcCode: rsrProduct.upcCode,
          weight: rsrProduct.productWeight || '0',
          groundShipOnly: rsrProduct.groundShipOnly === 'Y',
          adultSignatureRequired: rsrProduct.adultSignatureRequired === 'Y',
          prop65: rsrProduct.prop65 === 'Y'
        };
        
        await db.insert(products).values(productData);
        processed++;
        
        if (processed % 1000 === 0) {
          console.log(`✅ Processed ${processed} products (${fflCount} require FFL)`);
        }
        
      } catch (error) {
        console.error(`Error processing line: ${error}`);
      }
    }
    
    console.log(`🎉 Processing complete:`);
    console.log(`   Total products: ${processed}`);
    console.log(`   FFL required: ${fflCount}`);
    console.log(`   Non-FFL: ${processed - fflCount}`);
    
  } catch (error) {
    console.error('❌ Error processing real RSR data:', error);
  }
}

processRealRSRData().then(() => {
  console.log('Real RSR data processing completed');
}).catch(console.error);