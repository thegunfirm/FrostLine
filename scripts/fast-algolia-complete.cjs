/**
 * Fast Complete Algolia Sync - Final Push
 * Finishes remaining products with optimized batch processing
 */

const https = require('https');
const { Pool } = require('pg');

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

async function fastCompleteSync() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Fast completing Algolia sync - final push!');
    
    // Start from product ID 15000 to get remaining products quickly
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
      AND id >= 35000
      ORDER BY id
      LIMIT 10000
    `);
    
    console.log(`📦 Fast sync: Found ${productsResult.rows.length} products to complete`);
    
    if (productsResult.rows.length === 0) {
      console.log('✅ All products are synced!');
      return;
    }

    // Transform products quickly
    const algoliaProducts = productsResult.rows.map(product => {
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
        manufacturerName: product.manufacturer || '',
        categoryName: categoryName,
        inventory: {
          onHand: product.stock_quantity || 0,
          allocated: false,
          dropShippable: true
        },
        price: {
          msrp: product.msrp || product.bronze || 0,
          retailMap: product.map || product.gold || 0,
          dealerPrice: product.wholesale || product.platinum || 0
        },
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

    // Fast batch processing - larger batches
    const batchSize = 500;
    let synced = 0;

    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      
      try {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(algoliaProducts.length / batchSize);
        console.log(`🔄 Fast batch ${batchNumber}/${totalBatches} (${batch.length} products)`);
        
        const requestData = {
          requests: batch.map(product => ({
            action: 'addObject',
            body: product
          }))
        };
        
        await makeAlgoliaRequest('POST', '/1/indexes/products/batch', requestData);
        synced += batch.length;
        
        console.log(`✅ Fast synced: ${synced}/${algoliaProducts.length}`);
        
        // Minimal delay for speed
        await new Promise(resolve => setTimeout(resolve, 25));
        
      } catch (error) {
        console.error(`❌ Error in fast batch ${i}:`, error.message);
      }
    }

    console.log(`\n🎉 Fast sync complete! Added ${synced} products`);

    // Get final count
    try {
      const indexStats = await makeAlgoliaRequest('GET', '/1/indexes/products');
      console.log(`📊 Total Algolia products: ${indexStats.entries || 0}`);
    } catch (error) {
      console.log('📊 Index stats not available');
    }

  } catch (error) {
    console.error('❌ Fast sync error:', error);
  } finally {
    await pool.end();
  }
}

// Run fast completion
fastCompleteSync()
  .then(() => {
    console.log('✅ Fast Algolia completion done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fast sync failed:', error);
    process.exit(1);
  });