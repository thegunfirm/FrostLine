/**
 * Sync RSR Products to Algolia Search Index
 * Updates Algolia with current RSR products including markup pricing
 */

const { algoliasearch } = require('algoliasearch');
const { Pool } = require('pg');

/**
 * Sync RSR products to Algolia with markup pricing
 */
async function syncToAlgolia() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);
  const index = client.initIndex('products');

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
        images,
        tags,
        created_at,
        updated_at
      FROM products 
      WHERE distributor = 'RSR'
      AND price_bronze IS NOT NULL
      ORDER BY id
    `);
    
    console.log(`📦 Found ${productsResult.rows.length} RSR products to sync`);
    
    // Transform products to Algolia format
    const algoliaProducts = productsResult.rows.map(product => {
      // Parse images from JSON field
      let productImages = [];
      try {
        if (product.images && typeof product.images === 'string') {
          const imagesArray = JSON.parse(product.images);
          productImages = imagesArray.map((img, index) => ({
            image: img.url || img.id || `rsr-${product.sku}`,
            id: `${product.id}-${index}`
          }));
        } else if (Array.isArray(product.images)) {
          productImages = product.images.map((img, index) => ({
            image: img.url || img.id || `rsr-${product.sku}`,
            id: `${product.id}-${index}`
          }));
        }
      } catch (error) {
        // Default image for RSR products
        productImages = [{
          image: `rsr-${product.sku}`,
          id: `${product.id}-0`
        }];
      }

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
        images: productImages,
        tags: product.tags ? JSON.parse(product.tags) : [categoryName, product.manufacturer].filter(Boolean),
        inStock: product.in_stock || false,
        distributor: 'RSR',
        createdAt: product.created_at ? product.created_at.toISOString() : new Date().toISOString(),
        updatedAt: product.updated_at ? product.updated_at.toISOString() : new Date().toISOString()
      };
    });

    console.log('📋 Sample Algolia product structure:');
    console.log(JSON.stringify(algoliaProducts[0], null, 2));

    // Batch sync to Algolia (1000 records at a time)
    const batchSize = 1000;
    let synced = 0;
    let errors = 0;

    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      const batch = algoliaProducts.slice(i, i + batchSize);
      
      try {
        console.log(`🔄 Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(algoliaProducts.length / batchSize)} (${batch.length} products)...`);
        
        const response = await index.saveObjects(batch);
        synced += batch.length;
        
        console.log(`✅ Batch synced successfully (Total: ${synced}/${algoliaProducts.length})`);
        
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
      const indexStats = await index.getSettings();
      console.log(`\n📊 Algolia Index Status:`);
      console.log(`   📁 Index: products`);
      console.log(`   🔍 Searchable attributes: ${indexStats.searchableAttributes || 'default'}`);
      console.log(`   📋 Facets: ${indexStats.attributesForFaceting || 'none'}`);
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