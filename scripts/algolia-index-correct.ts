import { algoliasearch } from 'algoliasearch';
import { neon } from '@neondatabase/serverless';

async function correctAlgoliaIndex() {
  console.log('🔄 Starting CORRECT Algolia indexing...');
  console.log('   Only active, in-stock RSR products will be indexed');
  
  const sql = neon(process.env.DATABASE_URL!);
  const algolia = algoliasearch(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_API_KEY!
  );
  const indexName = process.env.ALGOLIA_PRODUCTS_INDEX || 'products';
  
  console.log(`📝 Using index: ${indexName}`);
  
  try {
    // Clear the index completely
    console.log('🗑️  Clearing existing Algolia index...');
    await algolia.clearObjects({ indexName });
    console.log('✅ Index cleared');
    
    // Get ONLY active, in-stock RSR products
    console.log('\n📊 Fetching active RSR inventory from database...');
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
      WHERE p.is_active = TRUE
        AND p.in_stock = TRUE
        AND p.price_bronze > 0
        AND p.rsr_stock_number IS NOT NULL
        AND p.distributor = 'RSR'
      ORDER BY p.category, p.manufacturer, p.name
    `;
    
    console.log(`✅ Found ${products.length} active, in-stock RSR products`);
    
    // Count by category
    const categoryCount: Record<string, number> = {};
    const firearmCount: Record<string, number> = {};
    
    products.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
      if (p.is_firearm) {
        firearmCount[p.category] = (firearmCount[p.category] || 0) + 1;
      }
    });
    
    console.log('\n📊 Category breakdown (in-stock only):');
    console.log('   Handguns:', categoryCount['Handguns'] || 0, 
                `(${firearmCount['Handguns'] || 0} marked as firearms)`);
    console.log('   Rifles:', categoryCount['Rifles'] || 0,
                `(${firearmCount['Rifles'] || 0} marked as firearms)`);
    console.log('   Shotguns:', categoryCount['Shotguns'] || 0,
                `(${firearmCount['Shotguns'] || 0} marked as firearms)`);
    console.log('   Ammunition:', categoryCount['Ammunition'] || 0);
    console.log('   Accessories:', categoryCount['Accessories'] || 0);
    console.log('   Other categories:', 
      Object.entries(categoryCount)
        .filter(([cat]) => !['Handguns', 'Rifles', 'Shotguns', 'Ammunition', 'Accessories'].includes(cat))
        .reduce((sum, [, count]) => sum + count, 0)
    );
    
    // Transform for Algolia with CORRECT field names matching search service expectations
    console.log('\n🔄 Preparing products for Algolia with correct field names...');
    const algoliaObjects = products.map(p => ({
      // Use rsr_stock_number as objectID for uniqueness
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
      
      // CRITICAL: Use correct field names for category and manufacturer
      categoryName: p.category,  // Search service filters by categoryName
      manufacturerName: p.manufacturer,  // Search service filters by manufacturerName
      
      // Also include without "Name" suffix for backward compatibility
      category: p.category,
      manufacturer: p.manufacturer,
      
      // Pricing - both individual fields and tierPricing object
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
      
      // Inventory and availability
      inventoryQuantity: p.stock_quantity,
      inStock: p.in_stock,
      isActive: p.is_active,  // CRITICAL: Search filters by isActive:true
      
      // Compliance and shipping
      fflRequired: p.requires_ffl,
      requiresFFL: p.requires_ffl,  // Include both variants
      mustRouteThroughGunFirm: p.must_route_through_gun_firm,
      isFirearm: p.is_firearm,  // CRITICAL: Needed for firearm category filtering
      dropShippable: p.drop_shippable,
      allocated: p.allocated === 'Y',
      groundShipOnly: p.ground_ship_only,
      adultSignatureRequired: p.adult_signature_required,
      
      // Product attributes for filtering
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
      newItem: false, // Can be calculated from date or special field
      internalSpecial: p.internal_special === 'YES',
      
      // Images
      images: p.images || [],
      
      // Search and ranking
      searchableText: [p.name, p.description, p.manufacturer, p.category, p.sku, p.caliber].filter(Boolean).join(' '),
      tags: [p.category, p.manufacturer, p.caliber].filter(Boolean),
      popularityScore: 0,  // Can be calculated based on sales/views
      
      // Timestamps (if needed)
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Upload to Algolia in batches
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
    
    // Configure index settings for proper searching
    console.log('\n⚙️  Configuring index settings...');
    await algolia.setSettings({
      indexName,
      indexSettings: {
        searchableAttributes: [
          'unordered(name)',
          'unordered(manufacturerName,manufacturer)',
          'unordered(sku)',
          'unordered(categoryName,category)',
          'unordered(description)',
          'unordered(caliber)',
          'unordered(searchableText)'
        ],
        attributesForFaceting: [
          'filterOnly(isActive)',
          'filterOnly(isFirearm)',
          'searchable(categoryName)',
          'searchable(manufacturerName)',
          'caliber',
          'capacity',
          'barrelLength',
          'finish',
          'frameSize',
          'actionType',
          'sightType',
          'inStock',
          'dropShippable',
          'tierPricing.bronze',
          'tierPricing.gold',
          'tierPricing.platinum',
          'newItem',
          'internalSpecial',
          'departmentNumber',
          'receiverType',
          'platformCategory',
          'partTypeCategory',
          'nfaItemType',
          'barrelLengthNFA',
          'finishNFA',
          'accessoryType',
          'compatibility',
          'material',
          'mountType'
        ],
        customRanking: [
          'desc(inStock)',
          'desc(popularityScore)',
          'asc(tierPricing.bronze)'
        ],
        attributesToHighlight: [
          'name',
          'manufacturerName',
          'categoryName',
          'description'
        ],
        attributesToSnippet: [
          'description:50'
        ],
        hitsPerPage: 24,
        paginationLimitedTo: 1000
      }
    });
    
    console.log('\n🎉 ALGOLIA INDEXING COMPLETE!');
    console.log(`✅ Successfully indexed ${algoliaObjects.length} active, in-stock RSR products`);
    console.log('✅ Index configured with correct field names and search settings');
    console.log('\n📌 Key points:');
    console.log('   - Only active, in-stock RSR products indexed');
    console.log('   - Using rsr_stock_number as objectID');
    console.log('   - categoryName and manufacturerName fields properly set');
    console.log('   - isActive and isFirearm fields included');
    console.log('   - All product attributes indexed for filtering');
    
  } catch (error) {
    console.error('❌ Error during indexing:', error);
    throw error;
  }
}

// Run it
correctAlgoliaIndex()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });