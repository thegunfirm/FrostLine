/**
 * Complete RSR Sync System with Dual Account Support
 * Downloads full RSR inventory catalog and processes all 29k+ products
 * Handles 77-field RSR format with proper tier pricing calculation
 * Includes dropShippable field for dual account business logic
 */

const { db } = require('../server/db');
const { products } = require('../shared/schema');
const { eq, count } = require('drizzle-orm');
const { Client } = require('basic-ftp');
const fs = require('fs');
const path = require('path');

/**
 * Transform RSR inventory record to product format
 */
function transformRSRProduct(fields) {
  // Skip deleted items
  if (fields[12] === 'Deleted') {
    return null;
  }

  const departmentNumber = fields[3]?.trim() || '';
  const stockNumber = fields[0]?.trim() || '';
  const description = fields[2]?.trim() || '';
  const manufacturerName = fields[10]?.trim() || '';
  const msrp = parseFloat(fields[5]) || 0;
  const dealerPrice = parseFloat(fields[6]) || 0;
  const mapPrice = parseFloat(fields[70]) || 0; // Field 71 in 1-based indexing
  const quantity = parseInt(fields[8]) || 0;
  
  // Critical: Parse dropShippable from field 69 (0-based indexing = field 68)
  const blockedFromDropShip = fields[68]?.trim() || '';
  const dropShippable = blockedFromDropShip !== 'Y'; // "Y" means blocked, blank means allowed
  
  // Parse state restrictions (fields 16-66 in 1-based indexing = 15-65 in 0-based)
  const stateRestrictions = [];
  const stateAbbreviations = [
    'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL',
    'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA',
    'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE',
    'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI',
    'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
  ];
  
  stateAbbreviations.forEach((state, index) => {
    if (fields[15 + index] === 'Y') {
      stateRestrictions.push(state);
    }
  });

  // Calculate tier pricing with markup rules
  const calculateTierPricing = (basePrice) => {
    if (basePrice <= 0) return '0.00';
    
    if (basePrice >= 200) {
      return (basePrice + 20).toFixed(2); // $20 flat markup
    } else {
      return (basePrice * 1.10).toFixed(2); // 10% markup
    }
  };

  const bronzePrice = msrp > 0 ? msrp.toFixed(2) : calculateTierPricing(dealerPrice);
  const goldPrice = mapPrice > 0 ? mapPrice.toFixed(2) : 
                   (msrp > 0 ? (msrp * 0.95).toFixed(2) : calculateTierPricing(dealerPrice));
  const platinumPrice = dealerPrice > 0 ? (dealerPrice * 1.02).toFixed(2) : bronzePrice;

  return {
    name: description,
    description: fields[13]?.trim() || description,
    category: mapDepartmentToCategory(departmentNumber),
    subcategoryName: null,
    departmentNumber: departmentNumber,
    departmentDesc: mapDepartmentToDescription(departmentNumber),
    subDepartmentDesc: null,
    manufacturer: manufacturerName,
    manufacturerPartNumber: fields[11]?.trim() || null,
    sku: stockNumber,
    priceWholesale: dealerPrice.toFixed(2),
    priceMAP: mapPrice > 0 ? mapPrice.toFixed(2) : null,
    priceMSRP: msrp > 0 ? msrp.toFixed(2) : null,
    priceBronze: bronzePrice,
    priceGold: goldPrice,
    pricePlatinum: platinumPrice,
    inStock: quantity > 0,
    stockQuantity: quantity,
    allocated: fields[12]?.trim() || null,
    newItem: false,
    promo: null,
    accessories: null,
    distributor: "RSR",
    requiresFFL: requiresFFL(departmentNumber),
    mustRouteThroughGunFirm: false,
    tags: generateTags(departmentNumber, description, manufacturerName),
    images: fields[14] ? [fields[14]] : [],
    upcCode: fields[1]?.trim() || null,
    weight: fields[7] || "0",
    dimensions: {
      length: parseFloat(fields[72]) || 0,
      width: parseFloat(fields[73]) || 0,
      height: parseFloat(fields[74]) || 0
    },
    restrictions: {
      groundShipOnly: fields[66] === 'Y',
      adultSignatureRequired: fields[67] === 'Y',
      blockedFromDropShip: blockedFromDropShip === 'Y',
      prop65: fields[75] === 'Y',
      vendorApprovalRequired: fields[76] === 'Y'
    },
    stateRestrictions: stateRestrictions,
    groundShipOnly: fields[66] === 'Y',
    adultSignatureRequired: fields[67] === 'Y',
    dropShippable: dropShippable, // Critical field for dual account logic
    prop65: fields[75] === 'Y',
    returnPolicyDays: 30,
    isActive: true
  };
}

/**
 * Main sync function - processes full RSR catalog
 */
async function syncRSRCatalog() {
  console.log('🚀 Starting complete RSR sync with dual account support...');
  
  try {
    // Step 1: Download RSR inventory file
    console.log('📥 Downloading RSR inventory file...');
    const client = new Client();
    
    await client.access({
      host: 'ftps.rsrgroup.com',
      port: 2222,
      user: '60742',
      password: '2SSinQ58',
      secure: true,
      secureOptions: { rejectUnauthorized: false }
    });
    
    const inventoryPath = path.join(process.cwd(), 'rsrinventory-new.txt');
    await client.downloadTo(inventoryPath, '/ftpdownloads/rsrinventory-new.txt');
    await client.close();
    
    console.log('✅ RSR inventory file downloaded successfully');
    
    // Step 2: Process inventory file
    console.log('🔄 Processing RSR inventory records...');
    const fileContent = fs.readFileSync(inventoryPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Processing ${lines.length} RSR inventory records`);
    
    let processed = 0;
    let errors = 0;
    let dropShippableCount = 0;
    let warehouseOnlyCount = 0;
    
    for (const line of lines) {
      try {
        const fields = line.split(';');
        
        if (fields.length < 77) {
          console.warn(`⚠️  Skipping invalid record: expected 77 fields, got ${fields.length}`);
          continue;
        }
        
        const product = transformRSRProduct(fields);
        if (!product) continue;
        
        // Count dropShippable vs warehouse-only products
        if (product.dropShippable) {
          dropShippableCount++;
        } else {
          warehouseOnlyCount++;
        }
        
        // Check if product exists
        const existingProduct = await db.select().from(products).where(eq(products.sku, product.sku));
        
        if (existingProduct.length > 0) {
          await db.update(products).set(product).where(eq(products.id, existingProduct[0].id));
        } else {
          await db.insert(products).values(product);
        }
        
        processed++;
        
        if (processed % 1000 === 0) {
          console.log(`✅ Processed ${processed} of ${lines.length} records (${Math.round(processed/lines.length*100)}%)`);
          console.log(`📦 Drop Ship: ${dropShippableCount} | 🏭 Warehouse: ${warehouseOnlyCount}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing record: ${error.message}`);
        errors++;
      }
    }
    
    // Final statistics
    const totalProducts = await db.select({ count: count() }).from(products);
    
    console.log(`
🎉 RSR Sync Complete!
✅ Processed: ${processed} products
❌ Errors: ${errors}
📊 Total in Database: ${totalProducts[0].count}
📦 Drop Shippable (Account 63824): ${dropShippableCount}
🏭 Warehouse Only (Account 60742): ${warehouseOnlyCount}
    `);
    
    console.log('Database sync complete');
    
  } catch (error) {
    console.error('❌ RSR sync failed:', error);
    throw error;
  }
}

// Helper functions
function mapDepartmentToCategory(departmentNumber) {
  const categoryMap = {
    '01': 'Handguns',
    '02': 'Used Handguns',
    '03': 'Used Long Guns',
    '04': 'Tasers',
    '05': 'Long Guns',
    '06': 'NFA Products',
    '07': 'Black Powder',
    '08': 'Optics',
    '09': 'Optical Accessories',
    '10': 'Magazines',
    '11': 'Grips, Pads, Stocks, Bipods',
    '12': 'Soft Gun Cases, Packs, Bags',
    '13': 'Misc. Accessories',
    '14': 'Holsters & Pouches',
    '15': 'Reloading Equipment',
    '16': 'Black Powder Accessories',
    '17': 'Closeout Accessories',
    '18': 'Ammunition',
    '19': 'Survival & Camping Supplies',
    '20': 'Lights, Lasers & Batteries',
    '21': 'Cleaning Equipment',
    '22': 'Airguns',
    '23': 'Knives & Tools',
    '24': 'High Capacity Magazines',
    '25': 'Safes & Security',
    '26': 'Safety & Protection',
    '27': 'Non-Lethal Defense',
    '28': 'Binoculars',
    '29': 'Spotting Scopes',
    '30': 'Sights',
    '31': 'Optical Accessories',
    '32': 'Barrels & Choke Tubes',
    '33': 'Clothing',
    '34': 'Parts',
    '35': 'Slings & Swivels',
    '36': 'Electronics',
    '38': 'Books, Software & DVDs',
    '39': 'Targets',
    '40': 'Hard Gun Cases',
    '41': 'Upper Receivers & Conversion Kits',
    '42': 'SBR Barrels & Upper Receivers',
    '43': 'Upper Receivers & Conversion Kits – High Capacity'
  };
  
  return categoryMap[departmentNumber] || 'Accessories';
}

function mapDepartmentToDescription(departmentNumber) {
  return mapDepartmentToCategory(departmentNumber);
}

function requiresFFL(departmentNumber) {
  const fflDepartments = ['01', '02', '03', '04', '05', '06', '07', '41', '42', '43'];
  return fflDepartments.includes(departmentNumber);
}

function generateTags(departmentNumber, description, manufacturer) {
  const tags = [];
  
  // Add manufacturer tag
  if (manufacturer) {
    tags.push(manufacturer);
  }
  
  // Add category tag
  const category = mapDepartmentToCategory(departmentNumber);
  tags.push(category);
  
  // Add specific tags based on department
  switch (departmentNumber) {
    case '01':
    case '02':
      tags.push('Handguns');
      break;
    case '05':
    case '03':
      tags.push('Long Guns');
      break;
    case '18':
      tags.push('Ammunition');
      break;
    case '08':
    case '09':
      tags.push('Optics');
      break;
    default:
      tags.push('Accessories');
  }
  
  return tags;
}

// Run the sync
if (require.main === module) {
  syncRSRCatalog().catch(console.error);
}

module.exports = { syncRSRCatalog };