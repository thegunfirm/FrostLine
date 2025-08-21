const { Client } = require('pg');

async function rebuildAlgoliaIndex() {
  console.log('🚀 Starting Algolia index rebuild...');
  
  // Database connection
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get all active products with proper field mapping
    const result = await client.query(`
      SELECT 
        id,
        name,
        description,
        category,
        manufacturer,
        sku,
        price_bronze as "priceBronze",
        price_gold as "priceGold", 
        price_platinum as "pricePlatinum",
        price_map as "priceMAP",
        price_msrp as "priceMSRP",
        in_stock as "inStock",
        stock_quantity as "stockQuantity",
        requires_ffl as "requiresFFL",
        upc_code as "upcCode",
        weight,
        manufacturer_part_number as "manufacturerPartNumber",
        new_item as "newItem",
        drop_shippable as "dropShippable",
        rsr_stock_number as "rsrStockNumber",
        caliber,
        capacity,
        barrel_length as "barrelLength",
        finish,
        frame_size as "frameSize",
        action_type as "actionType",
        sight_type as "sightType",
        subcategory_name as "subcategoryName"
      FROM products 
      WHERE is_active = true
      ORDER BY category, manufacturer, name
    `);

    console.log(`📊 Found ${result.rows.length} active products in database`);

    // Group by category to see distribution
    const categoryCount = {};
    result.rows.forEach(product => {
      const cat = product.category || 'Unknown';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    console.log('📈 Category distribution:');
    Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count} products`);
      });

    // Convert to Algolia format
    const algoliaProducts = result.rows.map(product => ({
      objectID: product.sku || `product_${product.id}`,
      title: product.name,
      stockNumber: product.sku,
      rsrStockNumber: product.rsrStockNumber,
      name: product.name,
      description: product.description,
      fullDescription: product.description,
      categoryName: product.category, // This is the key mapping!
      subcategoryName: product.subcategoryName,
      manufacturerName: product.manufacturer,
      sku: product.sku,
      mpn: product.manufacturerPartNumber,
      upc: product.upcCode,
      tierPricing: {
        bronze: parseFloat(product.priceBronze || '0'),
        gold: parseFloat(product.priceGold || '0'),
        platinum: parseFloat(product.pricePlatinum || '0')
      },
      retailPrice: parseFloat(product.priceBronze || '0'),
      msrp: parseFloat(product.priceMSRP || '0'),
      dealerPrice: parseFloat(product.pricePlatinum || '0'),
      retailMap: product.priceMAP ? parseFloat(product.priceMAP) : null,
      weight: product.weight,
      inStock: product.inStock,
      inventoryQuantity: product.stockQuantity || 0,
      images: product.rsrStockNumber ? [{
        image: `/api/rsr-image/${product.rsrStockNumber}`,
        id: product.rsrStockNumber
      }] : [],
      fflRequired: product.requiresFFL,
      caliber: product.caliber,
      capacity: product.capacity,
      barrelLength: product.barrelLength,
      finish: product.finish,
      frameSize: product.frameSize,
      actionType: product.actionType,
      sightType: product.sightType,
      newItem: product.newItem || false,
      dropShippable: product.dropShippable !== false,
      price: parseFloat(product.priceBronze || '0')
    }));

    console.log(`🔄 Converted ${algoliaProducts.length} products for Algolia indexing`);

    // Clear existing index and add all products
    const appId = process.env.ALGOLIA_APP_ID;
    const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY;

    if (!appId || !adminApiKey) {
      throw new Error('Missing Algolia credentials - need ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY');
    }

    console.log('🧹 Clearing existing Algolia index...');
    
    // Clear the index
    const clearResponse = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/products/clear`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': adminApiKey,
        'X-Algolia-Application-Id': appId,
        'Content-Type': 'application/json'
      }
    });

    if (!clearResponse.ok) {
      console.error('Failed to clear index:', await clearResponse.text());
    } else {
      console.log('✅ Index cleared successfully');
    }

    // Index products in batches to avoid API limits
    const batchSize = 1000;
    const batches = [];
    
    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      batches.push(algoliaProducts.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${algoliaProducts.length} products in ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const response = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': adminApiKey,
            'X-Algolia-Application-Id': appId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: batch.map(product => ({
              action: 'addObject',
              body: product
            }))
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Algolia batch failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        console.log(`✅ Batch ${i + 1}/${batches.length} completed (${batch.length} products)`);
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        // Continue with next batch
      }
    }

    console.log('🎉 Algolia index rebuild completed!');
    console.log('Now testing the "Handguns" category filter...');

    // Test the handgun category filter
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for indexing to propagate

    const testResponse = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY || adminApiKey,
        'X-Algolia-Application-Id': appId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:"Handguns"',
        hitsPerPage: 5
      })
    });

    if (testResponse.ok) {
      const testResult = await testResponse.json();
      console.log(`🔍 Test search for "Handguns": ${testResult.nbHits} results found`);
      if (testResult.hits.length > 0) {
        console.log('✅ Sample results:');
        testResult.hits.slice(0, 3).forEach((hit, idx) => {
          console.log(`   ${idx + 1}. ${hit.name} (${hit.manufacturerName}) - Category: ${hit.categoryName}`);
        });
      }
    } else {
      console.error('Test search failed:', await testResponse.text());
    }

  } catch (error) {
    console.error('❌ Error rebuilding Algolia index:', error);
  } finally {
    await client.end();
  }
}

// Run the rebuild
rebuildAlgoliaIndex();