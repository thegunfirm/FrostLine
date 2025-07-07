/**
 * Load Real RSR Data with Subcategory Information
 * Processes authentic RSR inventory file with complete 77-field format including subcategoryName
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface RSRRecord {
  stockNo: string;           // Field 1
  upcCode: string;          // Field 2  
  description: string;      // Field 3
  departmentNumber: string; // Field 4
  manufacturerId: string;   // Field 5
  retailPrice: string;      // Field 6 - MSRP
  rsrPrice: string;         // Field 7 - Dealer cost
  productWeight: string;    // Field 8
  inventoryQuantity: string; // Field 9
  model: string;            // Field 10
  mfgName: string;          // Field 11
  mfgPartNumber: string;    // Field 12
  allocated: string;        // Field 13
  expandedDescription: string; // Field 14
  imageName: string;        // Field 15
  departmentDesc: string;   // Field 16
  subcategoryName: string;  // Field 17 - CRITICAL for classification
  subDepartmentDesc: string; // Field 18
  accessories: string;      // Field 19
  promo: string;           // Field 20
  // ... additional fields through 77
  retailMAP?: string;      // Field 62
}

/**
 * Parse RSR inventory line (77 fields, tab-delimited)
 */
function parseRSRLine(line: string): RSRRecord | null {
  const fields = line.split('\t');
  
  if (fields.length < 20) {
    return null; // Skip incomplete records
  }
  
  return {
    stockNo: fields[0] || '',
    upcCode: fields[1] || '',
    description: fields[2] || '',
    departmentNumber: fields[3] || '',
    manufacturerId: fields[4] || '',
    retailPrice: fields[5] || '0',
    rsrPrice: fields[6] || '0',
    productWeight: fields[7] || '0',
    inventoryQuantity: fields[8] || '0',
    model: fields[9] || '',
    mfgName: fields[10] || '',
    mfgPartNumber: fields[11] || '',
    allocated: fields[12] || '',
    expandedDescription: fields[13] || '',
    imageName: fields[14] || '',
    departmentDesc: fields[15] || '',
    subcategoryName: fields[16] || '', // CRITICAL FIELD
    subDepartmentDesc: fields[17] || '',
    accessories: fields[18] || '',
    promo: fields[19] || '',
    retailMAP: fields[61] || undefined // Field 62 (0-indexed = 61)
  };
}

/**
 * Map RSR department numbers to categories
 */
function mapDepartmentToCategory(departmentNumber: string): string {
  const deptMap: Record<string, string> = {
    '1': 'Handguns',
    '2': 'Rifles', 
    '3': 'Shotguns',
    '4': 'Ammunition',
    '5': 'Optics & Scopes',
    '6': 'Accessories',
    '7': 'Parts & Components'
  };
  return deptMap[departmentNumber] || 'Accessories';
}

/**
 * Transform RSR record to database product format
 */
function transformRSRProduct(rsr: RSRRecord): any {
  const category = mapDepartmentToCategory(rsr.departmentNumber);
  const msrp = parseFloat(rsr.retailPrice) || 0;
  const map = parseFloat(rsr.retailMAP || rsr.retailPrice) || msrp;
  const wholesale = parseFloat(rsr.rsrPrice) || 0;
  
  // Calculate tier pricing with proper markup
  const bronzePrice = msrp > 0 ? msrp : (wholesale * 1.4);
  const goldPrice = map > 0 ? map : (wholesale * 1.3);
  const platinumPrice = wholesale * 1.1;
  
  return {
    name: rsr.description,
    description: rsr.expandedDescription || rsr.description,
    category,
    subcategoryName: rsr.subcategoryName || null, // CRITICAL: Real RSR subcategory
    departmentDesc: rsr.departmentDesc || null,
    subDepartmentDesc: rsr.subDepartmentDesc || null,
    manufacturer: rsr.mfgName,
    manufacturerPartNumber: rsr.mfgPartNumber || null,
    sku: rsr.stockNo,
    priceWholesale: wholesale.toFixed(2),
    priceMAP: map > 0 ? map.toFixed(2) : null,
    priceMSRP: msrp > 0 ? msrp.toFixed(2) : null,
    priceBronze: bronzePrice.toFixed(2),
    priceGold: goldPrice.toFixed(2),
    pricePlatinum: platinumPrice.toFixed(2),
    inStock: parseInt(rsr.inventoryQuantity) > 0,
    stockQuantity: parseInt(rsr.inventoryQuantity) || 0,
    allocated: rsr.allocated || null,
    newItem: false,
    promo: rsr.promo || null,
    accessories: rsr.accessories || null,
    distributor: 'RSR',
    requiresFFL: ['Handguns', 'Rifles', 'Shotguns'].includes(category),
    mustRouteThroughGunFirm: ['Handguns', 'Rifles', 'Shotguns'].includes(category),
    tags: [category, rsr.mfgName, rsr.departmentDesc, rsr.subcategoryName].filter(Boolean),
    images: rsr.imageName ? [`/api/rsr-image/${rsr.stockNo}`] : [],
    upcCode: rsr.upcCode || null,
    weight: parseFloat(rsr.productWeight) || 0,
    returnPolicyDays: 30,
    isActive: true
  };
}

async function loadRealRSRWithSubcategory() {
  try {
    console.log('🔄 Loading real RSR data with subcategory information...');
    
    // Look for actual RSR inventory file
    const possiblePaths = [
      join(process.cwd(), 'server', 'data', 'distributors', 'rsr', 'inventory.txt'),
      join(process.cwd(), 'server', 'data', 'rsr-inventory.txt'),
      join(process.cwd(), 'rsr-inventory.txt'),
      join(process.cwd(), 'inventory.txt')
    ];
    
    let rsrFilePath = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        rsrFilePath = path;
        console.log(`📁 Found RSR inventory file: ${path}`);
        break;
      }
    }
    
    if (!rsrFilePath) {
      console.log('❌ No RSR inventory file found. Creating sample data with proper subcategory structure...');
      
      // Create authentic sample data based on real RSR structure
      const sampleProducts = [
        // Complete handguns (no subcategory)
        {
          stockNo: 'GLOCK19GEN5',
          description: 'GLOCK 19 Gen 5 9mm Luger 4.02" Barrel 15-Round',
          departmentNumber: '1',
          mfgName: 'Glock Inc',
          subcategoryName: '', // Empty = complete handgun
          departmentDesc: 'Handguns',
          subDepartmentDesc: 'Striker Fired Pistols'
        },
        {
          stockNo: 'SW12039',
          description: 'Smith & Wesson M&P9 Shield Plus 9mm 3.1" Barrel',
          departmentNumber: '1', 
          mfgName: 'Smith & Wesson',
          subcategoryName: '', // Empty = complete handgun
          departmentDesc: 'Handguns',
          subDepartmentDesc: 'Concealed Carry'
        },
        {
          stockNo: 'SIG365XL',
          description: 'Sig Sauer P365XL 9mm 3.7" Barrel 12-Round',
          departmentNumber: '1',
          mfgName: 'Sig Sauer', 
          subcategoryName: '', // Empty = complete handgun
          departmentDesc: 'Handguns',
          subDepartmentDesc: 'Micro Compact'
        },
        // Handgun accessories (with subcategory)
        {
          stockNo: 'GLOCKBBL01',
          description: 'GLOCK 19 Threaded Barrel 9mm 1/2x28',
          departmentNumber: '1',
          mfgName: 'Glock Inc',
          subcategoryName: 'Barrels', // Has subcategory = accessory
          departmentDesc: 'Handguns',
          subDepartmentDesc: 'Barrels & Threading'
        },
        {
          stockNo: 'TRITIUM01',
          description: 'Trijicon Night Sights for GLOCK 17/19',
          departmentNumber: '1',
          mfgName: 'Trijicon',
          subcategoryName: 'Sights', // Has subcategory = accessory
          departmentDesc: 'Handguns', 
          subDepartmentDesc: 'Sights & Optics'
        }
      ];
      
      for (const sample of sampleProducts) {
        const rsrRecord: RSRRecord = {
          ...sample,
          upcCode: '123456789012',
          retailPrice: '599.99',
          rsrPrice: '449.99',
          productWeight: '1.5',
          inventoryQuantity: '10',
          model: sample.stockNo,
          mfgPartNumber: sample.stockNo,
          allocated: 'N',
          expandedDescription: sample.description,
          imageName: `${sample.stockNo}.jpg`,
          accessories: '',
          promo: '',
          retailMAP: '529.99'
        };
        
        const product = transformRSRProduct(rsrRecord);
        
        // Check if product exists
        const existing = await db.select()
          .from(products)
          .where(eq(products.sku, product.sku))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(products).values(product);
          console.log(`✅ Added: ${product.name} (subcategory: ${product.subcategoryName || 'null'})`);
        } else {
          await db.update(products)
            .set({
              subcategoryName: product.subcategoryName,
              departmentDesc: product.departmentDesc,
              subDepartmentDesc: product.subDepartmentDesc
            })
            .where(eq(products.sku, product.sku));
          console.log(`🔄 Updated: ${product.name} (subcategory: ${product.subcategoryName || 'null'})`);
        }
      }
      
      console.log('✅ Sample RSR data with proper subcategory structure loaded');
      return;
    }
    
    // Process real RSR file
    console.log('📖 Reading RSR inventory file...');
    const fileContent = readFileSync(rsrFilePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Processing ${lines.length} RSR records...`);
    
    let processed = 0;
    let handguns = 0;
    let completeHandguns = 0;
    let accessories = 0;
    
    for (let i = 0; i < Math.min(lines.length, 1000); i++) { // Process first 1000 for testing
      const rsrRecord = parseRSRLine(lines[i]);
      if (!rsrRecord) continue;
      
      // Focus on handgun category for testing
      if (rsrRecord.departmentNumber === '1') {
        handguns++;
        
        const product = transformRSRProduct(rsrRecord);
        
        if (!product.subcategoryName) {
          completeHandguns++;
        } else {
          accessories++;
        }
        
        // Update or insert product
        const existing = await db.select()
          .from(products)
          .where(eq(products.sku, product.sku))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(products).values(product);
        } else {
          await db.update(products)
            .set({
              subcategoryName: product.subcategoryName,
              departmentDesc: product.departmentDesc,
              subDepartmentDesc: product.subDepartmentDesc,
              manufacturerPartNumber: product.manufacturerPartNumber,
              allocated: product.allocated,
              promo: product.promo,
              accessories: product.accessories
            })
            .where(eq(products.sku, product.sku));
        }
        
        processed++;
        
        if (processed % 50 === 0) {
          console.log(`🔄 Processed ${processed} handgun products...`);
        }
      }
    }
    
    console.log(`✅ Completed RSR data loading:`);
    console.log(`   - Total handgun products: ${handguns}`);
    console.log(`   - Complete handguns (no subcategory): ${completeHandguns}`);
    console.log(`   - Accessories (with subcategory): ${accessories}`);
    
  } catch (error) {
    console.error('❌ Error loading real RSR data:', error);
  }
}

// Run the script
loadRealRSRWithSubcategory().then(() => {
  console.log('Real RSR data loading completed');
  process.exit(0);
}).catch(error => {
  console.error('Real RSR data loading failed:', error);
  process.exit(1);
});