const { Pool } = require('pg');
const fetch = require('node-fetch');

async function manualAlgoliaFix() {
  console.log('🔧 Manual Algolia Fix - Removing fake data contamination...');
  
  try {
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Get sample of products from database
    const result = await pool.query(`
      SELECT name, sku, upc_code, manufacturer, category, department_number, price_bronze, price_gold, price_platinum, stock_quantity, in_stock
      FROM products 
      WHERE department_number IS NOT NULL 
      LIMIT 10
    `);
    
    console.log(`📦 Found ${result.rows.length} sample products in database`);
    
    if (result.rows.length === 0) {
      console.log('❌ No products found in database');
      return;
    }
    
    // Show a sample product
    console.log('Sample product:', result.rows[0]);
    
    // Clear Algolia index completely
    console.log('🗑️ Clearing Algolia index...');
    const clearResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/clear`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      }
    });
    
    if (!clearResponse.ok) {
      console.error('❌ Failed to clear Algolia index:', await clearResponse.text());
      return;
    }
    
    console.log('✅ Algolia index cleared');
    
    // Wait for clearing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get larger batch for sync
    const syncResult = await pool.query(`
      SELECT name, sku, upc_code, manufacturer, category, department_number, price_bronze, price_gold, price_platinum, stock_quantity, in_stock, allocated, description
      FROM products 
      WHERE department_number IS NOT NULL 
      ORDER BY id
      LIMIT 500
    `);
    
    console.log(`🔄 Syncing ${syncResult.rows.length} products to Algolia...`);
    
    // Convert to Algolia format
    const algoliaObjects = syncResult.rows.map(product => ({
      objectID: product.sku,
      title: product.name,
      description: product.description || product.name,
      sku: product.sku,
      upc: product.upc_code || '',
      manufacturerName: product.manufacturer || '',
      categoryName: product.category || '',
      subcategoryName: product.category || '',
      inventory: {
        onHand: product.stock_quantity || 0,
        allocated: product.allocated === 'Y',
        dropShippable: true
      },
      price: {
        msrp: parseFloat(product.price_bronze || '0'),
        retailMap: parseFloat(product.price_bronze || '0'),
        dealerPrice: parseFloat(product.price_gold || '0'),
        dealerCasePrice: parseFloat(product.price_platinum || '0')
      },
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      departmentNumber: product.department_number,
      inStock: product.in_stock || false
    }));
    
    // Upload to Algolia in batches
    const batchSize = 100;
    let uploaded = 0;
    
    for (let i = 0; i < algoliaObjects.length; i += batchSize) {
      const batch = algoliaObjects.slice(i, i + batchSize);
      
      const uploadResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: batch.map(obj => ({
            action: 'addObject',
            body: obj
          }))
        })
      });
      
      if (uploadResponse.ok) {
        uploaded += batch.length;
        console.log(`⚡ Uploaded batch ${Math.ceil((i + 1) / batchSize)} - ${uploaded}/${algoliaObjects.length} products`);
      } else {
        console.error(`❌ Failed to upload batch ${Math.ceil((i + 1) / batchSize)}:`, await uploadResponse.text());
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify the sync worked
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verifyResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        hitsPerPage: 1
      })
    });
    
    const verifyResult = await verifyResponse.json();
    console.log(`✅ Verification: ${verifyResult.nbHits} products now in Algolia index`);
    
    if (verifyResult.nbHits > 0) {
      console.log('Sample indexed product:', verifyResult.hits[0]);
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Manual fix failed:', error);
  }
}

manualAlgoliaFix();