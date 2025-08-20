/**
 * Load Authentic RSR Products - Final Version
 * Uses proper Drizzle ORM to load all RSR products efficiently
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Parse RSR inventory line (77 fields)
 */
function parseRSRLine(line: string) {
  if (!line || line.trim() === '') return null;
  
  const fields = line.split(';');
  if (fields.length < 20) return null;
  
  const stockNo = fields[0]?.trim();                    // Field 1: RSR stock number (distributor code)
  const upc = fields[1]?.trim();                        // Field 2: UPC code
  const description = fields[2]?.trim();                // Field 3: Product description
  const departmentNumber = fields[3]?.trim();           // Field 4: Department number
  const manufacturerId = fields[4]?.trim();             // Field 5: Manufacturer ID
  const retailPrice = parseFloat(fields[5]) || 0;       // Field 6: MSRP
  const rsrPrice = parseFloat(fields[6]) || 0;          // Field 7: RSR dealer price
  const weight = parseFloat(fields[7]) || 0;            // Field 8: Weight
  const inventoryQuantity = parseInt(fields[8]) || 0;   // Field 9: Quantity
  const model = fields[9]?.trim();                      // Field 10: Model
  const manufacturer = fields[10]?.trim();              // Field 11: Full manufacturer name
  const manufacturerPartNumber = fields[11]?.trim();    // Field 12: MANUFACTURER PART NUMBER (product SKU)
  const allocated = fields[12]?.trim();                 // Field 13: Allocated/closeout/deleted
  const fullDescription = fields[13]?.trim();           // Field 14: Expanded description
  const imageName = fields[14]?.trim();                 // Field 15: Image name
  
  if (!stockNo || !description) return null;
  
  return {
    stockNo,                      // RSR distributor code (for ordering from RSR)
    upc,
    description,
    departmentNumber,
    manufacturerId,
    manufacturer,                 // Full manufacturer name
    manufacturerPartNumber,       // ACTUAL manufacturer part number (product SKU)
    retailPrice,
    rsrPrice,
    weight,
    inventoryQuantity,
    model,
    allocated,
    fullDescription,
    imageName
  };
}

/**
 * Map RSR department to category
 */
function mapDepartmentToCategory(departmentNumber: string): string {
  const categoryMap: Record<string, string> = {
    '1': 'Handguns',
    '2': 'Used Handguns', 
    '3': 'Long Guns',
    '4': 'Used Long Guns',
    '5': 'Ammunition',
    '6': 'Ammunition',
    '7': 'Accessories',
    '8': 'Accessories',
    '9': 'Accessories',
    '10': 'Accessories',
    '11': 'Accessories',
    '12': 'Accessories',
    '13': 'Accessories',
    '14': 'Accessories',
    '15': 'Accessories',
    '16': 'Accessories',
    '17': 'Accessories',
    '18': 'Accessories',
    '19': 'Accessories',
    '20': 'Accessories'
  };
  
  return categoryMap[departmentNumber] || 'Accessories';
}

/**
 * Transform RSR product to database format
 */
function transformRSRProduct(rsrProduct: any) {
  const category = mapDepartmentToCategory(rsrProduct.departmentNumber);
  
  // Calculate tier pricing: Bronze=MSRP, Gold=MAP, Platinum=Dealer
  const msrp = rsrProduct.retailPrice;
  const retailMap = rsrProduct.mapPrice;
  const dealerPrice = rsrProduct.rsrPrice;
  
  // Use RSR image proxy endpoint
  const images = [{
    image: `/api/rsr-image/${rsrProduct.stockNo}`,
    id: `rsr-${rsrProduct.stockNo}`,
    alt: rsrProduct.description
  }];
  
  return {
    name: rsrProduct.description,
    description: rsrProduct.fullDescription || rsrProduct.description,
    category,
    manufacturer: rsrProduct.manufacturer,
    sku: rsrProduct.manufacturerPartNumber,              // FIXED: Use manufacturer part number as product SKU
    rsrStockNumber: rsrProduct.stockNo,                  // Store RSR code separately for ordering
    upcCode: rsrProduct.upc,
    priceWholesale: dealerPrice.toFixed(2),
    priceMSRP: msrp.toFixed(2), 
    priceMAP: retailMap.toFixed(2),
    priceBronze: msrp.toFixed(2),
    priceGold: retailMap.toFixed(2),
    pricePlatinum: dealerPrice.toFixed(2),
    stockQuantity: rsrProduct.inventoryQuantity,
    inStock: rsrProduct.inventoryQuantity > 0,
    requiresFFL: ['1', '2', '3', '4'].includes(rsrProduct.departmentNumber), // Firearms require FFL
    weight: rsrProduct.weight.toFixed(2),
    images,
    distributor: 'RSR' as const,
    isActive: true
  };
}

/**
 * Process authentic RSR inventory
 */
async function processAuthenticRSR() {
  const filePath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ RSR inventory file not found');
    return;
  }
  
  console.log('📂 Reading authentic RSR inventory file...');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`📊 Processing ${lines.length} authentic RSR products...`);
  
  // Check existing products
  const existingCount = await db.select().from(products).where(eq(products.distributor, 'RSR'));
  console.log(`📦 Found ${existingCount.length} existing RSR products - will add new ones`);
  
  // Get existing SKUs to avoid duplicates
  const existingSkus = new Set(existingCount.map(p => p.sku).filter(Boolean));
  console.log(`📋 Will skip ${existingSkus.size} existing SKUs`);
  
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  
  // Process in batches
  const batchSize = 100;
  const totalBatches = Math.ceil(lines.length / batchSize);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, lines.length);
    const batch = lines.slice(start, end);
    
    const productBatch: any[] = [];
    
    for (const line of batch) {
      processed++;
      
      try {
        const rsrProduct = parseRSRLine(line);
        if (!rsrProduct) continue;
        
        // Skip if product already exists
        if (existingSkus.has(rsrProduct.stockNo)) {
          continue;
        }
        
        const product = transformRSRProduct(rsrProduct);
        productBatch.push(product);
        
      } catch (error: any) {
        errors++;
        console.error(`❌ Error processing line ${processed}: ${error.message}`);
      }
    }
    
    // Insert batch using Drizzle
    if (productBatch.length > 0) {
      try {
        await db.insert(products).values(productBatch);
        inserted += productBatch.length;
        
        if (i % 20 === 0) {
          console.log(`✅ Batch ${i + 1}/${totalBatches}: Inserted ${productBatch.length} products (Total: ${inserted})`);
        }
        
      } catch (error: any) {
        errors++;
        console.error(`❌ Error inserting batch: ${error.message}`);
      }
    }
  }
  
  console.log('\n📊 Processing Summary:');
  console.log(`📄 Total lines processed: ${processed}`);
  console.log(`✅ Products inserted: ${inserted}`);
  console.log(`❌ Errors: ${errors}`);
  
  // Show sample of loaded products by category
  console.log('\n🔍 Sample products by category:');
  
  const categories = ['Handguns', 'Long Guns', 'Ammunition', 'Accessories'];
  
  for (const category of categories) {
    const samples = await db.select().from(products).where(products.category.eq(category)).limit(3);
    
    console.log(`\n📁 ${category}:`);
    samples.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - ${product.manufacturer} (${product.sku})`);
      console.log(`     Bronze: $${product.priceBronze} | Gold: $${product.priceGold} | Platinum: $${product.pricePlatinum}`);
    });
  }
  
  return { processed, inserted, errors };
}

// Execute processing
processAuthenticRSR()
  .then(result => {
    console.log('\n🎉 Authentic RSR inventory processing completed!');
    console.log(`📊 Successfully loaded ${result.inserted} authentic RSR products`);
    console.log('🖼️ Images will be served on-demand through RSR proxy endpoint');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  });