import { algoliasearch } from 'algoliasearch';
import { neon } from '@neondatabase/serverless';

async function indexAll29kProducts() {
  console.log('🔄 Starting Algolia indexing for ~29k products...');
  console.log('   Including all RSR products with valid stock numbers (not just in_stock)');
  
  const sql = neon(process.env.DATABASE_URL!);
  const algolia = algoliasearch(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_API_KEY!
  );
  const indexName = process.env.ALGOLIA_PRODUCTS_INDEX || 'products';
  
  console.log(`📝 Using index: ${indexName}`);
  
  try {
    // Clear the index
    console.log('🗑️  Clearing existing Algolia index...');
    await algolia.clearObjects({ indexName });
    console.log('✅ Index cleared');
    
    // Get ALL RSR products with valid stock numbers (not just active/in-stock)
    console.log('\n📊 Fetching all RSR products from database...');
    const products = await sql`
      SELECT 
        p.id,
        p.sku,
        p.upc_code,
        p.name,
        p.category,
        p.manufacturer,
        p.description,
        p.price_bronze,
        p.price_gold,
        p.price_platinum,
        p.stock_quantity,
        p.in_stock,
        p.requires_ffl,
        p.must_route_through_gun_firm,
        p.is_firearm,
        p.is_active,
        p.caliber,
        p.barrel_length,
        p.capacity,
        p.finish,
        p.action_type,
        p.frame_size,
        p.sight_type,
        p.rsr_stock_number,
        p.images,
        p.drop_shippable,
        p.allocated,
        p.ground_ship_only,
        p.adult_signature_required,
        p.price_map,
        p.price_msrp,
        p.rsr_price,
        p.department_number,
        p.department_desc,
        p.weight,
        p.internal_special,
        p.receiver_type,
        p.platform_category,
        p.part_type_category,
        p.nfa_item_type,
        p.barrel_length_nfa,
        p.finish_nfa,
        p."accessoryType",
        p.compatibility,
        p."materialFinish",
        p."mountType"
      FROM products p
      WHERE p.price_bronze > 0
        AND p.rsr_stock_number IS NOT NULL
        AND p.distributor = 'RSR'
      ORDER BY p.category, p.manufacturer, p.name
    `;
    
    console.log(`✅ Found ${products.length} RSR products`);
    
    // Count by category and stock status
    const categoryCount: Record<string, number> = {};
    const inStockCount: Record<string, number> = {};
    const firearmCount: Record<string, number> = {};
    
    products.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
      if (p.in_stock) {
        inStockCount[p.category] = (inStockCount[p.category] || 0) + 1;
      }
      if (p.is_firearm) {
        firearmCount[p.category] = (firearmCount[p.category] || 0) + 1;
      }
    });
    
    console.log('\n📊 Category breakdown:');
    console.log('   Handguns:', categoryCount['Handguns'] || 0, 
                `(${inStockCount['Handguns'] || 0} in stock, ${firearmCount['Handguns'] || 0} firearms)`);
    console.log('   Rifles:', categoryCount['Rifles'] || 0,
                `(${inStockCount['Rifles'] || 0} in stock, ${firearmCount['Rifles'] || 0} firearms)`);
    console.log('   Shotguns:', categoryCount['Shotguns'] || 0,
                `(${inStockCount['Shotguns'] || 0} in stock, ${firearmCount['Shotguns'] || 0} firearms)`);
    console.log('   Ammunition:', categoryCount['Ammunition'] || 0,
                `(${inStockCount['Ammunition'] || 0} in stock)`);
    console.log('   Accessories:', categoryCount['Accessories'] || 0,
                `(${inStockCount['Accessories'] || 0} in stock)`);
    
    const totalInStock = Object.values(inStockCount).reduce((sum, count) => sum + count, 0);
    console.log('\n📦 Stock status:');
    console.log(`   In stock: ${totalInStock} products`);
    console.log(`   Out of stock: ${products.length - totalInStock} products`);
    
    // Transform for Algolia
    console.log('\n🔄 Preparing products for Algolia...');
    const algoliaObjects = products.map(p => ({
      // Use rsr_stock_number as objectID
      objectID: p.rsr_stock_number,
      
      // Core identifiers
      id: p.id,
      sku: p.sku,
      upc: p.upc_code || '',
      stockNumber: p.rsr_stock_number,
      rsrStockNumber: p.rsr_stock_number,
      
      // Names and descriptions
      name: p.name,
      title: p.name,
      description: p.description || '',
      fullDescription: p.description || '',
      
      // Categories and manufacturer
      categoryName: p.category,
      manufacturerName: p.manufacturer,
      category: p.category,
      manufacturer: p.manufacturer,
      
      // Pricing
      retailPrice: p.price_map || p.price_bronze,
      retailMap: p.price_map || 0,
      msrp: p.price_msrp || p.price_bronze,
      dealerPrice: p.rsr_price || p.price_platinum,
      price: p.price_bronze,
      tierPricing: {
        bronze: p.price_bronze,
        gold: p.price_gold,
        platinum: p.price_platinum
      },
      
      // Inventory
      inventoryQuantity: p.stock_quantity,
      inStock: p.in_stock,
      isActive: p.is_active,
      
      // Compliance
      fflRequired: p.requires_ffl,
      requiresFFL: p.requires_ffl,
      mustRouteThroughGunFirm: p.must_route_through_gun_firm,
      isFirearm: p.is_firearm,
      dropShippable: p.drop_shippable,
      allocated: p.allocated === 'Y',
      groundShipOnly: p.ground_ship_only,
      adultSignatureRequired: p.adult_signature_required,
      
      // Product attributes
      caliber: p.caliber || '',
      barrelLength: p.barrel_length || '',
      capacity: p.capacity || '',
      finish: p.finish || '',
      actionType: p.action_type || '',
      frameSize: p.frame_size || '',
      sightType: p.sight_type || '',
      weight: p.weight || '',
      
      // Additional categorization
      departmentNumber: p.department_number,
      departmentDesc: p.department_desc,
      receiverType: p.receiver_type || '',
      platformCategory: p.platform_category || '',
      partTypeCategory: p.part_type_category || '',
      
      // NFA items
      nfaItemType: p.nfa_item_type || '',
      barrelLengthNFA: p.barrel_length_nfa || '',
      finishNFA: p.finish_nfa || '',
      
      // Accessories
      accessoryType: p.accessoryType || '',
      compatibility: p.compatibility || '',
      material: p.materialFinish || '',
      mountType: p.mountType || '',
      
      // Special flags
      newItem: false,
      internalSpecial: p.internal_special === 'YES',
      
      // Images
      images: p.images || [],
      
      // Search and ranking
      searchableText: [p.name, p.description, p.manufacturer, p.category, p.sku, p.caliber].filter(Boolean).join(' '),
      tags: [p.category, p.manufacturer, p.caliber].filter(Boolean),
      popularityScore: 0,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Upload to Algolia
    console.log('\n📤 Uploading to Algolia...');
    const batchSize = 1000;
    for (let i = 0; i < algoliaObjects.length; i += batchSize) {
      const batch = algoliaObjects.slice(i, i + batchSize);
      await algolia.saveObjects({ 
        indexName,
        objects: batch 
      });
      const progress = Math.min(i + batchSize, algoliaObjects.length);
      console.log(`   ✅ ${progress}/${algoliaObjects.length} (${Math.round(progress * 100 / algoliaObjects.length)}%)`);
    }
    
    console.log('\n🎉 ALGOLIA INDEXING COMPLETE!');
    console.log(`✅ Successfully indexed ${algoliaObjects.length} RSR products`);
    console.log('✅ This includes both in-stock and out-of-stock products');
    console.log('✅ UI can filter by inStock field as needed');
    
  } catch (error) {
    console.error('❌ Error during indexing:', error);
    throw error;
  }
}

// Run it
indexAll29kProducts()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });