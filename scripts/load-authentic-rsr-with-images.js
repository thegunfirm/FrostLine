/**
 * Load Authentic RSR Products with Images
 * Processes real RSR inventory and downloads authentic product images
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

/**
 * Parse RSR inventory line (77 fields)
 */
function parseRSRLine(line) {
  if (!line || line.trim() === '') return null;
  
  const fields = line.split(';');
  if (fields.length < 20) return null;
  
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
  const mapPrice = parseFloat(fields[16]) || retailPrice;
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
 * Download RSR product image
 */
async function downloadRSRImage(stockNo) {
  const imageDir = path.join(process.cwd(), 'public', 'images', 'products', 'rsr');
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }
  
  const localPath = path.join(imageDir, `${stockNo}.jpg`);
  
  // Skip if already exists
  if (fs.existsSync(localPath)) {
    return `images/products/rsr/${stockNo}.jpg`;
  }
  
  const imageUrl = `https://img.rsrgroup.com/pimages/${stockNo}_1.jpg`;
  
  return new Promise((resolve) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.rsrgroup.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000
    };
    
    const req = https.get(imageUrl, options, (res) => {
      if (res.statusCode === 200) {
        const fileStream = fs.createWriteStream(localPath);
        res.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(`images/products/rsr/${stockNo}.jpg`);
        });
        
        fileStream.on('error', () => {
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
    
    req.on('error', () => {
      resolve(null);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Transform RSR product to database format
 */
function transformRSRProduct(rsrProduct, imagePath = null) {
  const category = mapDepartmentToCategory(rsrProduct.departmentNumber);
  
  // Calculate tier pricing: Bronze=MSRP, Gold=MAP, Platinum=Dealer
  const msrp = rsrProduct.retailPrice;
  const retailMap = rsrProduct.mapPrice;
  const dealerPrice = rsrProduct.rsrPrice;
  
  const images = imagePath ? [{
    image: imagePath,
    id: rsrProduct.stockNo,
    alt: rsrProduct.description
  }] : [];
  
  return {
    name: rsrProduct.description,
    description: rsrProduct.fullDescription || rsrProduct.description,
    category,
    manufacturer: rsrProduct.manufacturer,
    sku: rsrProduct.stockNo,
    upc_code: rsrProduct.upc,
    price_wholesale: dealerPrice.toFixed(2),
    price_msrp: msrp.toFixed(2), 
    price_map: retailMap.toFixed(2),
    price_bronze: msrp.toFixed(2),
    price_gold: retailMap.toFixed(2),
    price_platinum: dealerPrice.toFixed(2),
    stock_quantity: rsrProduct.inventoryQuantity,
    in_stock: rsrProduct.inventoryQuantity > 0,
    requires_ffl: rsrProduct.fflRequired,
    weight: rsrProduct.weight.toFixed(2),
    dimensions: JSON.stringify({
      height: rsrProduct.height,
      width: rsrProduct.width,
      length: rsrProduct.length
    }),
    tags: JSON.stringify([
      category,
      rsrProduct.manufacturer,
      rsrProduct.subCategory
    ].filter(Boolean)),
    images: JSON.stringify(images),
    distributor: 'RSR',
    is_active: true
  };
}

/**
 * Process authentic RSR inventory with image downloads
 */
async function processAuthenticRSRWithImages() {
  const filePath = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads', 'rsrinventory-new.txt');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ RSR inventory file not found');
    return;
  }
  
  console.log('📂 Reading authentic RSR inventory file...');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`📊 Processing ${lines.length} authentic RSR products...`);
  
  // Clear existing products
  console.log('🗑️ Clearing existing products...');
  await db.execute('DELETE FROM products');
  console.log('✅ Database cleared');
  
  let processed = 0;
  let inserted = 0;
  let imagesDownloaded = 0;
  let errors = 0;
  
  // Process in batches
  const batchSize = 50; // Smaller batches for image processing
  const totalBatches = Math.ceil(lines.length / batchSize);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, lines.length);
    const batch = lines.slice(start, end);
    
    console.log(`📦 Processing batch ${i + 1}/${totalBatches}...`);
    
    const products = [];
    
    for (const line of batch) {
      processed++;
      
      try {
        const rsrProduct = parseRSRLine(line);
        if (!rsrProduct) continue;
        
        // Download product image
        console.log(`🖼️ Downloading image for ${rsrProduct.stockNo}...`);
        const imagePath = await downloadRSRImage(rsrProduct.stockNo);
        
        if (imagePath) {
          imagesDownloaded++;
          console.log(`✅ Image downloaded: ${rsrProduct.stockNo}`);
        }
        
        const product = transformRSRProduct(rsrProduct, imagePath);
        products.push(product);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error processing product: ${error.message}`);
      }
    }
    
    // Insert batch
    if (products.length > 0) {
      try {
        const placeholders = products.map(() => 
          `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).join(', ');
        
        const values = products.flatMap(p => [
          p.name, p.description, p.category, p.manufacturer, p.sku, p.upc_code,
          p.price_wholesale, p.price_msrp, p.price_map, p.price_bronze, p.price_gold, p.price_platinum,
          p.stock_quantity, p.in_stock, p.requires_ffl, p.weight, p.dimensions, p.tags, p.images,
          p.distributor, p.is_active, new Date().toISOString()
        ]);
        
        await db.execute(`
          INSERT INTO products (
            name, description, category, manufacturer, sku, upc_code,
            price_wholesale, price_msrp, price_map, price_bronze, price_gold, price_platinum,
            stock_quantity, in_stock, requires_ffl, weight, dimensions, tags, images,
            distributor, is_active, created_at
          ) VALUES ${placeholders}
        `, values);
        
        inserted += products.length;
        console.log(`✅ Batch ${i + 1}: Inserted ${products.length} products (Total: ${inserted})`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error inserting batch: ${error.message}`);
      }
    }
  }
  
  console.log('\n📊 Processing Summary:');
  console.log(`📄 Total lines processed: ${processed}`);
  console.log(`✅ Products inserted: ${inserted}`);
  console.log(`🖼️ Images downloaded: ${imagesDownloaded}`);
  console.log(`❌ Errors: ${errors}`);
  
  return { processed, inserted, imagesDownloaded, errors };
}

// Execute processing
processAuthenticRSRWithImages()
  .then(result => {
    console.log('\n🎉 Authentic RSR processing completed!');
    console.log(`📊 Loaded ${result.inserted} authentic RSR products with ${result.imagesDownloaded} images`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  });