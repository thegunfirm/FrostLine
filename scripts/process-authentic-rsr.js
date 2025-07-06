/**
 * Process Authentic RSR Inventory Data
 * Loads real RSR products from downloaded inventory file into database
 * No test data - only authentic RSR distributor inventory
 */

import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
// We'll use direct SQL for simplicity
// import * as schema from "../shared/schema.js";

neonConfig.webSocketConstructor = ws;

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

/**
 * Parse RSR inventory line (77 fields)
 * Field positions based on RSR format documentation
 */
function parseRSRLine(line) {
  if (!line || line.trim() === '') return null;
  
  const fields = line.split(';');
  if (fields.length < 77) return null;
  
  // Extract key fields from RSR format
  const stockNo = fields[0]?.trim();
  const upc = fields[1]?.trim();
  const description = fields[2]?.trim();
  const departmentNumber = fields[3]?.trim();
  const manufacturer = fields[4]?.trim();
  const retailPrice = parseFloat(fields[5]) || 0;
  const rsrPrice = parseFloat(fields[6]) || 0;
  const inventoryQuantity = parseInt(fields[7]) || 0;
  const allocated = parseInt(fields[8]) || 0;
  const fullDescription = fields[9]?.trim();
  const weight = parseFloat(fields[10]) || 0;
  const height = parseFloat(fields[11]) || 0;
  const width = parseFloat(fields[12]) || 0;
  const length = parseFloat(fields[13]) || 0;
  const imageDisclaimer = fields[14]?.trim();
  const restrictedState = fields[15]?.trim();
  const mapPrice = parseFloat(fields[16]) || 0;
  const subCategory = fields[17]?.trim();
  const fflRequired = fields[18]?.trim() === 'Y';
  
  if (!stockNo || !description) return null;
  
  return {
    stockNo,
    upc,
    description,
    departmentNumber,
    manufacturer,
    retailPrice,
    rsrPrice,
    inventoryQuantity,
    allocated,
    fullDescription,
    weight,
    height,
    width,
    length,
    imageDisclaimer,
    restrictedState,
    mapPrice,
    subCategory,
    fflRequired
  };
}

/**
 * Map RSR department to category
 */
function mapDepartmentToCategory(departmentNumber) {
  const categoryMap = {
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
function transformRSRProduct(rsrProduct) {
  const category = mapDepartmentToCategory(rsrProduct.departmentNumber);
  
  // Calculate tier pricing
  const msrp = rsrProduct.retailPrice;
  const retailMap = rsrProduct.mapPrice || rsrProduct.retailPrice;
  const dealerPrice = rsrProduct.rsrPrice;
  
  return {
    name: rsrProduct.description,
    description: rsrProduct.fullDescription || rsrProduct.description,
    category,
    manufacturer: rsrProduct.manufacturer,
    sku: rsrProduct.stockNo,
    upc: rsrProduct.upc,
    priceWholesale: dealerPrice.toFixed(2),
    priceMSRP: msrp.toFixed(2),
    priceMAP: retailMap.toFixed(2),
    inventoryQuantity: rsrProduct.inventoryQuantity,
    inventoryAllocated: rsrProduct.allocated,
    requiresFFL: rsrProduct.fflRequired,
    weight: rsrProduct.weight,
    dimensions: {
      height: rsrProduct.height,
      width: rsrProduct.width,
      length: rsrProduct.length
    },
    tags: [
      category,
      rsrProduct.manufacturer,
      rsrProduct.subCategory
    ].filter(Boolean),
    images: rsrProduct.stockNo ? [{
      image: `https://img.rsrgroup.com/highres-itemimages/${rsrProduct.stockNo}.jpg`,
      id: rsrProduct.stockNo
    }] : []
  };
}

/**
 * Process authentic RSR inventory file
 */
async function processAuthenticRSRInventory() {
  const filePath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ RSR inventory file not found. Please download it first.');
    return;
  }
  
  console.log('📂 Reading authentic RSR inventory file...');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`📊 Processing ${lines.length} RSR products...`);
  
  // Clear existing products
  console.log('🗑️ Clearing existing products...');
  await db.delete(schema.products);
  console.log('✅ Database cleared');
  
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
    
    const products = [];
    
    for (const line of batch) {
      processed++;
      
      try {
        const rsrProduct = parseRSRLine(line);
        if (!rsrProduct) continue;
        
        const product = transformRSRProduct(rsrProduct);
        products.push(product);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error processing line ${processed}: ${error.message}`);
      }
    }
    
    // Insert batch
    if (products.length > 0) {
      try {
        await db.insert(schema.products).values(products);
        inserted += products.length;
        
        console.log(`✅ Batch ${i + 1}/${totalBatches}: Inserted ${products.length} products (Total: ${inserted})`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error inserting batch ${i + 1}: ${error.message}`);
      }
    }
  }
  
  console.log('\n📊 Processing Summary:');
  console.log(`📄 Total lines processed: ${processed}`);
  console.log(`✅ Products inserted: ${inserted}`);
  console.log(`❌ Errors: ${errors}`);
  
  // Show sample of loaded products
  console.log('\n🔍 Sample of loaded products:');
  const sampleProducts = await db.select().from(schema.products).limit(10);
  
  sampleProducts.forEach((product, index) => {
    console.log(`${index + 1}. ${product.name} - ${product.manufacturer} (${product.sku})`);
    console.log(`   Bronze: $${product.priceMSRP} | Gold: $${product.priceMAP} | Platinum: $${product.priceWholesale}`);
  });
  
  return {
    processed,
    inserted,
    errors
  };
}

// Execute processing
processAuthenticRSRInventory()
  .then(result => {
    console.log('\n🎉 Authentic RSR inventory processing completed!');
    console.log(`📊 Successfully loaded ${result.inserted} authentic RSR products`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  });