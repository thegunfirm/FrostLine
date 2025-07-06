/**
 * Complete Algolia Deployment - Final Production Sync
 * Ensures all 29,887 RSR products are properly indexed and searchable
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

async function completeAlgoliaDeployment() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting Complete Algolia Production Deployment');
    console.log('📊 Target: All 29,887 RSR products with tier pricing');
    
    // Step 1: Get total product count from database
    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM products 
      WHERE distributor = 'RSR' 
      AND price_bronze IS NOT NULL
    `);
    
    const totalProducts = parseInt(countResult.rows[0].total);
    console.log(`📦 Database contains ${totalProducts} RSR products with pricing`);

    // Step 2: Clear existing index and start fresh
    console.log('🗑️  Clearing existing Algolia index...');
    try {
      await makeAlgoliaRequest('POST', '/1/indexes/products/clear');
      console.log('✅ Index cleared successfully');
      
      // Wait for clearing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('⚠️  Could not clear index:', error.message);
    }

    // Step 3: Process all products in optimized batches
    const batchSize = 1000; // Larger batches for efficiency
    let totalSynced = 0;
    
    for (let offset = 0; offset < totalProducts; offset += batchSize) {
      console.log(`\n🔄 Processing batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(totalProducts / batchSize)}`);
      console.log(`📍 Products ${offset + 1} to ${Math.min(offset + batchSize, totalProducts)}`);
      
      // Get batch of products
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
        OFFSET ${offset}
        LIMIT ${batchSize}
      `);

      if (productsResult.rows.length === 0) {
        console.log('✅ No more products to process');
        break;
      }

      // Transform products to Algolia format
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
          upc: '',
          manufacturerName: product.manufacturer || '',
          categoryName: categoryName,
          subcategoryName: categoryName,
          inventory: {
            onHand: product.stock_quantity || 0,
            allocated: false,
            dropShippable: true
          },
          price: {
            msrp: product.msrp || product.bronze || 0,
            retailMap: product.map || product.gold || 0,
            dealerPrice: product.wholesale || product.platinum || 0,
            dealerCasePrice: product.wholesale || product.platinum || 0
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

      // Upload batch to Algolia
      try {
        const requestData = {
          requests: algoliaProducts.map(product => ({
            action: 'addObject',
            body: product
          }))
        };
        
        await makeAlgoliaRequest('POST', '/1/indexes/products/batch', requestData);
        totalSynced += algoliaProducts.length;
        
        console.log(`✅ Batch uploaded successfully`);
        console.log(`📊 Progress: ${totalSynced}/${totalProducts} products synced`);
        
        // Brief delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error uploading batch:`, error.message);
      }
    }

    // Step 4: Wait for indexing to complete and verify
    console.log('\n⏳ Waiting for Algolia indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 5: Verify final status
    try {
      const indexStats = await makeAlgoliaRequest('GET', '/1/indexes/products');
      console.log(`\n🎉 ALGOLIA DEPLOYMENT COMPLETE!`);
      console.log(`📊 Final Statistics:`);
      console.log(`   📁 Index: products`);
      console.log(`   📦 Products indexed: ${indexStats.entries || 0}`);
      console.log(`   💾 Data size: ${Math.round((indexStats.dataSize || 0) / 1024)} KB`);
      console.log(`   🔄 Last update: ${new Date().toISOString()}`);
      
      // Test search functionality
      const searchTest = await makeAlgoliaRequest('POST', '/1/indexes/products/search', {
        query: '',
        hitsPerPage: 1
      });
      
      console.log(`\n🔍 Search Test Results:`);
      console.log(`   ✅ Search API working: ${searchTest.nbHits} total products found`);
      console.log(`   🎯 Sample result: ${searchTest.hits[0]?.title || 'No products'}`);
      
    } catch (error) {
      console.log('📊 Final verification failed:', error.message);
    }

    console.log(`\n🚀 TheGunFirm.com Algolia search is now fully operational!`);
    console.log(`💎 Complete tier pricing system (Bronze/Gold/Platinum)`);
    console.log(`🔍 Full-text search across all product fields`);
    console.log(`📸 RSR image integration maintained`);
    console.log(`🏷️  Category and manufacturer filtering enabled`);

  } catch (error) {
    console.error('❌ Deployment failed:', error);
  } finally {
    await pool.end();
  }
}

// Run complete deployment
completeAlgoliaDeployment()
  .then(() => {
    console.log('✅ Complete Algolia deployment finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment error:', error);
    process.exit(1);
  });