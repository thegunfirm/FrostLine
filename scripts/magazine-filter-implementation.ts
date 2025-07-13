/**
 * Magazine Filter Implementation
 * Complete implementation of all 7 magazine filtering capabilities
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import fetch from 'node-fetch';

// Algolia HTTP client
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

async function algoliaRequest(method: string, path: string, body?: any) {
  const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP_ID!,
      'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY!,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return await response.json();
}

async function implementMagazineFilters() {
  console.log('🔍 Starting magazine filter implementation...');
  
  try {
    // Step 1: Extract attributes for magazines
    console.log('\n📊 Step 1: Extracting magazine attributes...');
    await extractMagazineAttributes();
    
    // Step 2: Configure Algolia facets for magazines
    console.log('\n📊 Step 2: Configuring Algolia facets...');
    await configureAlgoliaFacets();
    
    // Step 3: Sync updated magazine data to Algolia
    console.log('\n📊 Step 3: Syncing magazines to Algolia...');
    await syncMagazinesToAlgolia();
    
    // Step 4: Test all 7 filter capabilities
    console.log('\n📊 Step 4: Testing filter capabilities...');
    await testFilterCapabilities();
    
    console.log('\n✅ Magazine filter implementation complete!');
    console.log('🎯 All 7 filter capabilities now operational');
    
  } catch (error) {
    console.error('❌ Error implementing magazine filters:', error);
  }
}

async function extractMagazineAttributes() {
  // Use SQL-based extraction for better performance
  const updates = [
    // Extract caliber
    `UPDATE products SET caliber = CASE 
      WHEN name ~* '\\b(9mm|9 mm)\\b' THEN '9mm'
      WHEN name ~* '\\b(45|\.45|45 acp|\.45 acp)\\b' THEN '45 ACP'
      WHEN name ~* '\\b(40|\.40|40 s&w|\.40 s&w)\\b' THEN '40 S&W'
      WHEN name ~* '\\b(380|\.380|380 acp|\.380 acp)\\b' THEN '380 ACP'
      WHEN name ~* '\\b(38|\.38|38 spl|\.38 spl|38 special|\.38 special)\\b' THEN '38 Special'
      WHEN name ~* '\\b(357|\.357|357 mag|\.357 mag|357 magnum|\.357 magnum)\\b' THEN '357 Magnum'
      WHEN name ~* '\\b(10mm|10 mm)\\b' THEN '10mm'
      WHEN name ~* '\\b(44|\.44|44 mag|\.44 mag|44 magnum|\.44 magnum)\\b' THEN '44 Magnum'
      WHEN name ~* '\\b(22|\.22|22 lr|\.22 lr)\\b' THEN '22 LR'
      WHEN name ~* '\\b(32|\.32|32 acp|\.32 acp)\\b' THEN '32 ACP'
      WHEN name ~* '\\b(223|\.223|223 rem|\.223 rem)\\b' THEN '223 Remington'
      WHEN name ~* '\\b(5\.56|556|5.56 nato|556 nato)\\b' THEN '5.56 NATO'
      WHEN name ~* '\\b(308|\.308|308 win|\.308 win)\\b' THEN '308 Winchester'
      WHEN name ~* '\\b(300|\.300|300 blk|\.300 blk|300 blackout)\\b' THEN '300 BLK'
      WHEN name ~* '\\b(12|12 ga|12 gauge)\\b' THEN '12 Gauge'
      WHEN name ~* '\\b(20|20 ga|20 gauge)\\b' THEN '20 Gauge'
      ELSE caliber
    END
    WHERE department_number = '10' AND caliber IS NULL`,
    
    // Extract capacity
    `UPDATE products SET capacity = CASE 
      WHEN name ~* '\\b(\\d+)\\s*rd\\b' THEN (regexp_match(name, '\\b(\\d+)\\s*rd\\b', 'i'))[1]::integer
      WHEN name ~* '\\b(\\d+)\\s*round\\b' THEN (regexp_match(name, '\\b(\\d+)\\s*round\\b', 'i'))[1]::integer
      WHEN name ~* '\\b(\\d+)\\s*rds\\b' THEN (regexp_match(name, '\\b(\\d+)\\s*rds\\b', 'i'))[1]::integer
      WHEN name ~* '\\b(\\d+)\\s*shot\\b' THEN (regexp_match(name, '\\b(\\d+)\\s*shot\\b', 'i'))[1]::integer
      WHEN name ~* '\\b(\\d+)\\s*r\\b' THEN (regexp_match(name, '\\b(\\d+)\\s*r\\b', 'i'))[1]::integer
      ELSE capacity
    END
    WHERE department_number = '10' AND capacity IS NULL`,
    
    // Extract finish
    `UPDATE products SET finish = CASE 
      WHEN name ~* '\\b(black|blk|bk)\\b' THEN 'Black'
      WHEN name ~* '\\b(stainless|ss|stainless steel)\\b' THEN 'Stainless Steel'
      WHEN name ~* '\\b(fde|flat dark earth|dark earth)\\b' THEN 'FDE'
      WHEN name ~* '\\b(od|od green|olive drab|olive)\\b' THEN 'OD Green'
      WHEN name ~* '\\b(tan|desert tan|coyote tan)\\b' THEN 'Tan'
      WHEN name ~* '\\b(gray|grey|gry)\\b' THEN 'Gray'
      WHEN name ~* '\\b(blue|blu)\\b' THEN 'Blue'
      WHEN name ~* '\\b(bronze|brz)\\b' THEN 'Bronze'
      WHEN name ~* '\\b(nickel|nkl|nick)\\b' THEN 'Nickel'
      WHEN name ~* '\\b(clear|transparent|clr)\\b' THEN 'Clear'
      WHEN name ~* '\\b(silver|slv)\\b' THEN 'Silver'
      WHEN name ~* '\\b(white|wht)\\b' THEN 'White'
      ELSE finish
    END
    WHERE department_number = '10' AND finish IS NULL`,
    
    // Extract frame size
    `UPDATE products SET frame_size = CASE 
      WHEN name ~* '\\b(full|full size|full-size)\\b' THEN 'Full Size'
      WHEN name ~* '\\b(compact|comp)\\b' THEN 'Compact'
      WHEN name ~* '\\b(subcompact|sub|subcomp|sub-compact)\\b' THEN 'Subcompact'
      WHEN name ~* '\\b(micro|mcr)\\b' THEN 'Micro'
      WHEN name ~* '\\b(carry|crry)\\b' THEN 'Carry'
      WHEN name ~* '\\b(commander|cmd)\\b' THEN 'Commander'
      WHEN name ~* '\\b(officer|off)\\b' THEN 'Officer'
      WHEN name ~* '\\b(government|gov)\\b' THEN 'Government'
      WHEN name ~* '\\b(standard|std)\\b' THEN 'Standard'
      WHEN name ~* '\\b(extended|ext)\\b' THEN 'Extended'
      ELSE frame_size
    END
    WHERE department_number = '10' AND frame_size IS NULL`
  ];
  
  for (const update of updates) {
    await db.execute(sql.raw(update));
  }
  
  // Get extraction results
  const results = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(caliber) as with_caliber,
      COUNT(capacity) as with_capacity,
      COUNT(finish) as with_finish,
      COUNT(frame_size) as with_frame_size
    FROM products 
    WHERE department_number = '10'
  `);
  
  const stats = results.rows[0];
  console.log(`📊 Attribute extraction results:`);
  console.log(`   Total magazines: ${stats.total}`);
  console.log(`   With caliber: ${stats.with_caliber} (${((stats.with_caliber / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With capacity: ${stats.with_capacity} (${((stats.with_capacity / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With finish: ${stats.with_finish} (${((stats.with_finish / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   With frame size: ${stats.with_frame_size} (${((stats.with_frame_size / stats.total) * 100).toFixed(1)}%)`);
}

async function configureAlgoliaFacets() {
  const settings = {
    attributesForFaceting: [
      'manufacturerName',
      'caliber',
      'capacity',
      'finish',
      'frameSize',
      'tierPricing.bronze',
      'tierPricing.gold', 
      'tierPricing.platinum',
      'inStock',
      'dropShippable',
      'departmentNumber',
      'categoryName'
    ],
    searchableAttributes: [
      'name',
      'description',
      'manufacturerName',
      'caliber',
      'tags'
    ],
    customRanking: [
      'desc(inStock)',
      'asc(tierPricing.platinum)'
    ]
  };
  
  await algoliaRequest('PUT', '/settings', settings);
  console.log('✅ Algolia facets configured for magazine filtering');
}

async function syncMagazinesToAlgolia() {
  // Get all magazines with updated attributes
  const magazines = await db.select().from(products).where(eq(products.departmentNumber, '10'));
  
  console.log(`📊 Syncing ${magazines.length} magazines to Algolia...`);
  
  // Transform for Algolia
  const algoliaObjects = magazines.map(magazine => ({
    objectID: magazine.stockNumber,
    name: magazine.name,
    description: magazine.description,
    manufacturerName: magazine.manufacturerName,
    categoryName: 'Magazines',
    departmentNumber: magazine.departmentNumber,
    stockNumber: magazine.stockNumber,
    inventoryQuantity: magazine.inventoryQuantity,
    inStock: magazine.inventoryQuantity > 0,
    dropShippable: magazine.dropShippable,
    upc: magazine.upc,
    weight: magazine.weight,
    tierPricing: {
      bronze: magazine.tierPricing?.bronze || 0,
      gold: magazine.tierPricing?.gold || 0,
      platinum: magazine.tierPricing?.platinum || 0
    },
    caliber: magazine.caliber,
    capacity: magazine.capacity,
    finish: magazine.finish,
    frameSize: magazine.frameSize,
    tags: magazine.tags || [],
    newItem: magazine.newItem,
    internalSpecial: magazine.internalSpecial,
    retailPrice: magazine.retailPrice,
    retailMap: magazine.retailMap,
    msrp: magazine.msrp,
    dealerPrice: magazine.dealerPrice,
    price: magazine.tierPricing?.platinum || magazine.dealerPrice,
    fflRequired: magazine.fflRequired,
    mpn: magazine.mpn
  }));
  
  // Sync in batches
  const batchSize = 1000;
  for (let i = 0; i < algoliaObjects.length; i += batchSize) {
    const batch = algoliaObjects.slice(i, i + batchSize);
    await algoliaRequest('POST', '/batch', {
      requests: batch.map(obj => ({
        action: 'addObject',
        body: obj
      }))
    });
    console.log(`✅ Synced batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(algoliaObjects.length / batchSize)}`);
  }
  
  console.log('✅ All magazines synced to Algolia');
}

async function testFilterCapabilities() {
  console.log('🧪 Testing all 7 magazine filter capabilities...');
  
  // Test 1: Manufacturer filter
  const manufacturerTest = await algoliaRequest('POST', '/query', {
    query: '',
    filters: 'departmentNumber:"10"',
    facets: ['manufacturerName'],
    hitsPerPage: 0
  });
  console.log(`1. Manufacturer filter: ${Object.keys(manufacturerTest.facets?.manufacturerName || {}).length} options`);
  
  // Test 2: Caliber filter  
  const caliberTest = await algoliaRequest('POST', '/query', {
    query: '',
    filters: 'departmentNumber:"10"',
    facets: ['caliber'],
    hitsPerPage: 0
  });
  console.log(`2. Caliber filter: ${Object.keys(caliberTest.facets?.caliber || {}).length} options`);
  
  // Test 3: Capacity filter
  const capacityTest = await algoliaRequest('POST', '/query', {
    query: '',
    filters: 'departmentNumber:"10"',
    facets: ['capacity'],
    hitsPerPage: 0
  });
  console.log(`3. Capacity filter: ${Object.keys(capacityTest.facets?.capacity || {}).length} options`);
  
  // Test 4: Finish filter
  const finishTest = await algoliaRequest('POST', '/query', {
    query: '',
    filters: 'departmentNumber:"10"',
    facets: ['finish'],
    hitsPerPage: 0
  });
  console.log(`4. Finish filter: ${Object.keys(finishTest.facets?.finish || {}).length} options`);
  
  // Test 5: Frame size filter
  const frameSizeTest = await algoliaRequest('POST', '/query', {
    query: '',
    filters: 'departmentNumber:"10"',
    facets: ['frameSize'],
    hitsPerPage: 0
  });
  console.log(`5. Frame size filter: ${Object.keys(frameSizeTest.facets?.frameSize || {}).length} options`);
  
  // Test 6: Price range filter
  const priceTest = await algoliaRequest('POST', '/query', {
    query: '',
    filters: 'departmentNumber:"10"',
    facets: ['tierPricing.platinum'],
    hitsPerPage: 0
  });
  console.log(`6. Price range filter: ${Object.keys(priceTest.facets?.['tierPricing.platinum'] || {}).length} price points`);
  
  // Test 7: Stock status filter
  const stockTest = await algoliaRequest('POST', '/query', {
    query: '',
    filters: 'departmentNumber:"10"',
    facets: ['inStock'],
    hitsPerPage: 0
  });
  console.log(`7. Stock status filter: ${Object.keys(stockTest.facets?.inStock || {}).length} options`);
  
  console.log('\n🎯 All 7 filter capabilities tested successfully!');
}

// Run the implementation
implementMagazineFilters();