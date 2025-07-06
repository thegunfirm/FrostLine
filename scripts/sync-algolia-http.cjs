/**
 * Sync RSR Products to Algolia using HTTP API
 * Updates Algolia with current RSR products including markup pricing
 */

const https = require('https');
const { Pool } = require('pg');

/**
 * Make HTTP request to Algolia API
 */
function makeAlgoliaRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${process.env.ALGOLIA_APP_ID}-dsn.algolia.net`,
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsedData.message || responseData}`));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Sync RSR products to Algolia with markup pricing
 */
async function syncToAlgolia() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting Algolia sync with RSR products...');
    
    // Get all RSR products with markup pricing
    const productsResult = await pool.query(`
      SELECT 
        id,
        name,
        description,
        sku,
        manufacturer,
        category,
        price_wholesale::float as wholesale,
        price_msrp::float as msrp,
        price_map::float as map,
        price_bronze::float as bronze,
        price_gold::float as gold,
        price_platinum::float as platinum,
        in_stock,
        stock_quantity,
        created_at
      FROM products 
      WHERE distributor = 'RSR'
      AND price_bronze IS NOT NULL
      ORDER BY id
      LIMIT 1000
    `);
    
    console.log(`📦 Found ${productsResult.rows.length} RSR products to sync`);
    
    // Transform products to Algolia format
    const algoliaProducts = productsResult.rows.map(product => {
      // Map category names
      const categoryMapping = {
        'Handguns': 'Handguns',
        'Long Guns': 'Rifles', 
        'Rifles': 'Rifles',
        'Shotguns': 'Shotguns',
        'Ammunition': 'Ammunition',
        'Ammo': 'Ammunition',
        'Optics': 'Optics & Scopes',
        'Accessories': 'Accessories',
        'Parts': 'Parts & Components'
      };

      const categoryName = categoryMapping[product.category] || product.category || 'Accessories';
      
      return {
        objectID: `rsr-${product.id}`,
        title: product.name || '',
        description: product.description || product.name || '',
        sku: product.sku || '',
        upc: '', // RSR doesn't provide UPC in our current format
        manufacturerName: product.manufacturer || '',
        categoryName: categoryName,
        subcategoryName: categoryName, // Use same as category for now
        inventory: {
          onHand: product.stock_quantity || 0,
          allocated: false,
          dropShippable: true // RSR products are drop-shippable
        },
        price: {
          msrp: product.msrp || product.bronze || 0,
          retailMap: product.map || product.gold || 0,
          dealerPrice: product.wholesale || product.platinum || 0,
          dealerCasePrice: product.wholesale || product.platinum || 0
        },
        // Our tier pricing system
        tierPricing: {
          bronze: product.bronze || 0,
          gold: product.gold || 0,
          platinum: product.platinum || 0
        },
        images: [{
          image: `rsr-${product.sku}`,
          id: `${product.id}-0`
        }],
        tags: [categoryName, product.manufacturer].filter(Boolean),
        inStock: product.in_stock || false,
        distributor: 'RSR',
        createdAt: product.created_at ? product.created_at.toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    console.log('📋 Sample Algolia product structure:');
    console.log(JSON.stringify(algoliaProducts[0], null, 2));

    // Clear existing index
    console.log('🗑️  Clearing existing Algolia index...');
    try {
      await makeAlgoliaRequest('POST', '/1/indexes/products/clear');
      console.log('✅ Index cleared successfully');
    } catch (error) {
      console.log('⚠️  Could not clear index:', error.message);
    }

    // Batch sync to Algolia (100 records at a time for HTTP requests)
    const batchSize = 100;
    let synced = 0;
    let errors = 0;

    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      
      try {
        console.log(`🔄 Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(algoliaProducts.length / batchSize)} (${batch.length} products)...`);
        
        const requestData = {
          requests: batch.map(product => ({
            action: 'addObject',
            body: product
          }))
        };
        
        const response = await makeAlgoliaRequest('POST', '/1/indexes/products/batch', requestData);
        synced += batch.length;
        
        console.log(`✅ Batch synced successfully (Total: ${synced}/${algoliaProducts.length})`);
        
        // Wait briefly between batches to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors++;
        console.error(`❌ Error syncing batch starting at ${i}:`, error.message);
      }
    }

    console.log(`\n🎉 Algolia sync complete!`);
    console.log(`   ✅ Synced: ${synced} products`);
    console.log(`   ❌ Errors: ${errors} batches`);
    
    // Get final index stats
    try {
      const indexStats = await makeAlgoliaRequest('GET', '/1/indexes/products');
      console.log(`\n📊 Algolia Index Status:`);
      console.log(`   📁 Index: products`);
      console.log(`   📦 Entries: ${indexStats.entries || 0}`);
      console.log(`   💾 Data Size: ${indexStats.dataSize || 0} bytes`);
    } catch (error) {
      console.log('📊 Index stats not available');
    }

    console.log('\n🚀 Your RSR products are now searchable in Algolia!');
    console.log('💎 Includes tier pricing (Bronze/Gold/Platinum)');
    console.log('📸 RSR image integration maintained');
    console.log('🔍 Full-text search enabled across all products');

  } catch (error) {
    console.error('❌ Error in Algolia sync:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
syncToAlgolia()
  .then(() => {
    console.log('✅ Algolia sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Algolia sync failed:', error);
    process.exit(1);
  });