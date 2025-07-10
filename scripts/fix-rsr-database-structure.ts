/**
 * Fix RSR Database Structure
 * Updates all products to use authentic RSR department structure and correct classifications
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { readFileSync } from 'fs';
import { eq } from 'drizzle-orm';

interface RSRDepartmentMapping {
  [key: string]: {
    name: string;
    requiresFFL: boolean;
  };
}

const RSR_DEPARTMENT_MAPPING: RSRDepartmentMapping = {
  '01': { name: 'Handguns', requiresFFL: true },
  '02': { name: 'Used Handguns', requiresFFL: true },
  '03': { name: 'Used Long Guns', requiresFFL: true },
  '04': { name: 'Tasers', requiresFFL: false },
  '05': { name: 'Long Guns', requiresFFL: true },
  '06': { name: 'NFA Products', requiresFFL: true },
  '07': { name: 'Black Powder', requiresFFL: true },
  '08': { name: 'Optics', requiresFFL: false },
  '09': { name: 'Optical Accessories', requiresFFL: false },
  '10': { name: 'Magazines', requiresFFL: false },
  '11': { name: 'Grips, Pads, Stocks, Bipods', requiresFFL: false },
  '12': { name: 'Soft Gun Cases, Packs, Bags', requiresFFL: false },
  '13': { name: 'Misc. Accessories', requiresFFL: false },
  '14': { name: 'Holsters & Pouches', requiresFFL: false },
  '15': { name: 'Reloading Equipment', requiresFFL: false },
  '16': { name: 'Black Powder Accessories', requiresFFL: false },
  '17': { name: 'Closeout Accessories', requiresFFL: false },
  '18': { name: 'Ammunition', requiresFFL: false },
  '19': { name: 'Survival & Camping Supplies', requiresFFL: false },
  '20': { name: 'Lights, Lasers & Batteries', requiresFFL: false },
  '21': { name: 'Cleaning Equipment', requiresFFL: false },
  '22': { name: 'Airguns', requiresFFL: false },
  '23': { name: 'Knives & Tools', requiresFFL: false },
  '24': { name: 'High Capacity Magazines', requiresFFL: false },
  '25': { name: 'Safes & Security', requiresFFL: false },
  '26': { name: 'Safety & Protection', requiresFFL: false },
  '27': { name: 'Non-Lethal Defense', requiresFFL: false },
  '28': { name: 'Binoculars', requiresFFL: false },
  '29': { name: 'Spotting Scopes', requiresFFL: false },
  '30': { name: 'Sights', requiresFFL: false },
  '31': { name: 'Optical Accessories', requiresFFL: false },
  '32': { name: 'Barrels, Choke Tubes & Muzzle Devices', requiresFFL: false },
  '33': { name: 'Clothing', requiresFFL: false },
  '34': { name: 'Parts', requiresFFL: false },
  '35': { name: 'Slings & Swivels', requiresFFL: false },
  '36': { name: 'Electronics', requiresFFL: false },
  '38': { name: 'Books, Software & DVDs', requiresFFL: false },
  '39': { name: 'Targets', requiresFFL: false },
  '40': { name: 'Hard Gun Cases', requiresFFL: false },
  '41': { name: 'Upper Receivers & Conversion Kits', requiresFFL: true },
  '42': { name: 'SBR Barrels & Upper Receivers', requiresFFL: true },
  '43': { name: 'Upper Receivers & Conversion Kits - High Capacity', requiresFFL: true }
};

async function fixRSRDatabaseStructure() {
  console.log('🔧 Starting RSR Database Structure Fix...');
  console.log('====================================');
  
  // Step 1: Get all products from database
  const allProducts = await db.select().from(products);
  console.log(`📊 Total products in database: ${allProducts.length.toLocaleString()}`);
  
  // Step 2: Load authentic RSR file for cross-reference
  const rsrFilePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
  const rsrFileContent = readFileSync(rsrFilePath, 'utf8');
  const rsrLines = rsrFileContent.split('\n').filter(line => line.trim());
  
  console.log(`📂 RSR file contains: ${rsrLines.length.toLocaleString()} products`);
  
  // Step 3: Build RSR reference map
  const rsrReference = new Map<string, {
    departmentNumber: string;
    description: string;
    retailPrice: string;
    retailMAP: string;
    rsrPricing: string;
    inventoryQuantity: string;
    blockedFromDropShip: string;
    fullManufacturerName: string;
    expandedDescription: string;
  }>();
  
  for (const line of rsrLines) {
    if (!line.trim()) continue;
    
    const fields = line.split(';');
    if (fields.length < 70) continue;
    
    const stockNo = fields[0];
    if (!stockNo) continue;
    
    rsrReference.set(stockNo, {
      departmentNumber: fields[3] || '',
      description: fields[2] || '',
      retailPrice: fields[5] || '0',
      retailMAP: fields[70] || '0',
      rsrPricing: fields[6] || '0',
      inventoryQuantity: fields[8] || '0',
      blockedFromDropShip: fields[68] || '',
      fullManufacturerName: fields[10] || '',
      expandedDescription: fields[13] || ''
    });
  }
  
  console.log(`📋 Built RSR reference map: ${rsrReference.size.toLocaleString()} products`);
  
  // Step 4: Fix each product
  let fixedCount = 0;
  let errors = 0;
  
  for (const product of allProducts) {
    try {
      const rsrData = rsrReference.get(product.sku);
      if (!rsrData) {
        console.log(`⚠️  Product ${product.sku} not found in RSR file`);
        continue;
      }
      
      const deptMapping = RSR_DEPARTMENT_MAPPING[rsrData.departmentNumber];
      if (!deptMapping) {
        console.log(`⚠️  Unknown department ${rsrData.departmentNumber} for ${product.sku}`);
        continue;
      }
      
      // Calculate correct pricing
      const retailPrice = parseFloat(rsrData.retailPrice) || 0;
      const retailMAP = parseFloat(rsrData.retailMAP) || 0;
      const rsrPricing = parseFloat(rsrData.rsrPricing) || 0;
      
      // Use MAP if available and different from MSRP, otherwise use MSRP with 5% discount
      const goldPrice = (retailMAP > 0 && retailMAP !== retailPrice) 
        ? retailMAP 
        : retailPrice * 0.95;
      
      // Update product with correct RSR data
      await db.update(products).set({
        category: deptMapping.name,
        departmentNumber: rsrData.departmentNumber,
        requiresFFL: deptMapping.requiresFFL,
        priceBronze: retailPrice.toFixed(2),
        priceGold: goldPrice.toFixed(2),
        pricePlatinum: (rsrPricing * 1.02).toFixed(2),
        priceMSRP: retailPrice.toFixed(2),
        priceMAP: retailMAP > 0 ? retailMAP.toFixed(2) : retailPrice.toFixed(2),
        priceWholesale: rsrPricing.toFixed(2),
        stockQuantity: parseInt(rsrData.inventoryQuantity) || 0,
        inStock: parseInt(rsrData.inventoryQuantity) > 0,
        dropShippable: rsrData.blockedFromDropShip !== 'Y',
        manufacturer: rsrData.fullManufacturerName,
        description: rsrData.expandedDescription || rsrData.description
      }).where(eq(products.id, product.id));
      
      fixedCount++;
      
      if (fixedCount % 1000 === 0) {
        console.log(`📈 Fixed ${fixedCount.toLocaleString()} products...`);
      }
      
    } catch (error) {
      console.error(`❌ Error fixing product ${product.sku}:`, error);
      errors++;
    }
  }
  
  console.log('\n✅ RSR Database Structure Fix Complete!');
  console.log(`📊 Fixed: ${fixedCount.toLocaleString()} products`);
  console.log(`❌ Errors: ${errors.toLocaleString()}`);
  
  // Step 5: Generate department summary
  console.log('\n📈 Department Summary After Fix:');
  console.log('================================');
  
  const departmentSummary = await db.select().from(products);
  const deptCounts = new Map<string, number>();
  
  for (const product of departmentSummary) {
    const dept = product.departmentNumber || 'Unknown';
    deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
  }
  
  // Sort by department number
  const sortedDepts = Array.from(deptCounts.entries())
    .sort(([a], [b]) => {
      const aNum = parseInt(a) || 999;
      const bNum = parseInt(b) || 999;
      return aNum - bNum;
    });
  
  for (const [dept, count] of sortedDepts) {
    const mapping = RSR_DEPARTMENT_MAPPING[dept];
    const name = mapping ? mapping.name : 'Unknown';
    console.log(`Dept ${dept.padStart(2, '0')}: ${count.toLocaleString().padStart(5)} - ${name}`);
  }
  
  console.log('\n🎉 Database now uses authentic RSR department structure!');
}

// Run the fix
fixRSRDatabaseStructure().then(() => {
  console.log('✅ RSR Database Structure Fix completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ RSR Database Structure Fix failed:', error);
  process.exit(1);
});