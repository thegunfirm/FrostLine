const { Pool } = require('pg');
const { algoliasearch } = require('algoliasearch');

async function reindexAlgolia() {
  console.log('🔄 Starting Algolia reindex with correct data...');

  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Algolia admin client for indexing
  const adminClient = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_ADMIN_API_KEY
  );

  try {
    // Get products from database with correct manufacturer and stock data
    const result = await pool.query(`
      SELECT 
        sku,
        name,
        description,
        manufacturer,
        category,
        subcategory_name,
        department_number,
        department_desc,
        sub_department_desc,
        manufacturer_part_number as mpn,
        upc_code as upc,
        price_bronze::text as "tierPricing.bronze",
        price_gold::text as "tierPricing.gold", 
        price_platinum::text as "tierPricing.platinum",
        stock_quantity as inventory_quantity,
        CASE WHEN stock_quantity > 0 THEN true ELSE false END as in_stock,
        requires_ffl as ffl_required,
        caliber,
        capacity,
        weight,
        new_item,
        drop_shippable
      FROM products 
      WHERE is_active = true
      LIMIT 5000
    `);

    console.log(`📊 Found ${result.rows.length} products to reindex`);

    if (result.rows.length === 0) {
      console.log('❌ No products found in database');
      return;
    }

    // Transform products for Algolia
    const algoliaProducts = result.rows.map((product, index) => ({
      objectID: product.sku,
      name: product.name || '',
      description: product.description || '',
      manufacturerName: product.manufacturer || '',
      categoryName: product.category || '',
      subcategoryName: product.subcategory_name,
      departmentNumber: product.department_number,
      departmentDesc: product.department_desc,
      subDepartmentDesc: product.sub_department_desc,
      mpn: product.manufacturer_part_number,
      upc: product.upc,
      tierPricing: {
        bronze: parseFloat(product['tierPricing.bronze'] || '0'),
        gold: parseFloat(product['tierPricing.gold'] || '0'),
        platinum: parseFloat(product['tierPricing.platinum'] || '0')
      },
      inventoryQuantity: product.inventory_quantity || 0,
      inStock: product.in_stock || false,
      fflRequired: product.ffl_required || false,
      caliber: product.caliber,
      capacity: product.capacity,
      weight: product.weight ? parseFloat(product.weight) : 0,
      newItem: product.new_item || false,
      dropShippable: product.drop_shippable !== false
    }));

    console.log('📤 Sample product data:');
    console.log(JSON.stringify(algoliaProducts[0], null, 2));

    // Clear existing index and add new data
    console.log('🗑️ Clearing existing Algolia index...');
    await adminClient.clearObjects({ indexName: 'products' });

    console.log('📤 Uploading products to Algolia...');
    const response = await adminClient.saveObjects({
      indexName: 'products',
      objects: algoliaProducts
    });
    
    console.log('✅ Algolia reindex completed successfully!');
    console.log(`📊 Indexed ${algoliaProducts.length} products`);
    console.log(`🔄 Response:`, response?.taskID || 'completed');

  } catch (error) {
    console.error('❌ Algolia reindex failed:', error);
  } finally {
    await pool.end();
  }
}

reindexAlgolia();