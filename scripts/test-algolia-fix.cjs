/**
 * Test Algolia Fix - Quick verification with 10 products
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

async function testAlgoliaFix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🧪 Testing Algolia Fix with 10 products');
    
    // Get 10 test products with correct pricing
    const productsResult = await pool.query(`
      SELECT 
        id, name, description, sku, manufacturer, category,
        price_bronze::float as bronze,
        price_gold::float as gold,
        price_platinum::float as platinum,
        in_stock, stock_quantity, created_at
      FROM products 
      WHERE distributor = 'RSR'
      AND price_bronze IS NOT NULL
      ORDER BY id
      LIMIT 10
    `);
    
    console.log(`📦 Found ${productsResult.rows.length} products to test`);
    
    // Transform to Algolia format
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
          msrp: product.bronze || 0,
          retailMap: product.gold || 0,
          dealerPrice: product.platinum || 0,
          dealerCasePrice: product.platinum || 0
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

    console.log('\n🔍 Sample product data:');
    console.log('DB Values:', {
      name: productsResult.rows[0].name,
      bronze: productsResult.rows[0].bronze,
      gold: productsResult.rows[0].gold,
      platinum: productsResult.rows[0].platinum
    });
    
    console.log('Algolia Values:', {
      title: algoliaProducts[0].title,
      tierPricing: algoliaProducts[0].tierPricing,
      price: algoliaProducts[0].price
    });

    // Upload to Algolia
    console.log('\n📤 Uploading test batch to Algolia...');
    await makeAlgoliaRequest('POST', '/1/indexes/products/batch', {
      requests: algoliaProducts.map(product => ({
        action: 'updateObject',
        body: product
      }))
    });
    
    console.log('✅ Test batch uploaded successfully');
    console.log('🔄 Waiting 2 seconds for indexing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Test completed - check search results');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testAlgoliaFix();