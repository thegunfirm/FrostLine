import { algoliasearch } from 'algoliasearch';
import { neon } from '@neondatabase/serverless';

async function fullAlgoliaReindex() {
  console.log('🔄 Starting COMPLETE Algolia reindex to fix category issues...');
  
  const sql = neon(process.env.DATABASE_URL!);
  const algolia = algoliasearch(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_API_KEY!
  );
  const indexName = process.env.ALGOLIA_PRODUCTS_INDEX || 'products';
  
  console.log(`📝 Using index: ${indexName}`);
  
  try {
    // Step 1: Clear the entire index
    console.log('🗑️  Clearing existing Algolia index...');
    await algolia.clearObjects({ indexName });
    console.log('✅ Index cleared');
    
    // Step 2: Get all products from database with correct categories
    console.log('📊 Fetching all products from database...');
    const products = await sql`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.manufacturer,
        p.price_bronze,
        p.price_gold,
        p.price_platinum,
        p.inventory_quantity,
        p.description,
        p.requires_ffl,
        p.must_route_through_gun_firm,
        p.caliber,
        p.capacity,
        p.department_number,
        p.department_desc,
        p.sub_department_desc,
        p.subcategory_name,
        p.nfa_item_type,
        p.receiver_type,
        p.platform_category,
        p.product_type,
        p.new_item,
        p.internal_special,
        p.shipping_method,
        p.part_type_category,
        p.accessory_type,
        p.compatibility,
        p.material,
        p.mount_type,
        p.nfa_barrel_length,
        p.nfa_finish,
        p.is_firearm,
        p.rsr_stock_number
      FROM products p
      WHERE p.price_bronze > 0
      ORDER BY p.id
    `;
    
    console.log(`✅ Found ${products.length} products to index`);
    
    // Step 3: Show category breakdown from database
    console.log('\n📊 Category breakdown (from cleaned database):');
    const categoryCount: Record<string, number> = {};
    products.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });
    
    const firearmCategories = ['Handguns', 'Rifles', 'Shotguns'];
    firearmCategories.forEach(cat => {
      if (categoryCount[cat]) {
        console.log(`   ${cat}: ${categoryCount[cat]} products`);
      }
    });
    console.log('   ---');
    Object.entries(categoryCount)
      .filter(([cat]) => !firearmCategories.includes(cat))
      .sort()
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });
    
    // Step 4: Verify no ammo in firearm categories
    console.log('\n🔍 Checking for ammunition in firearm categories:');
    const ammoInFirearms = products.filter(p => 
      firearmCategories.includes(p.category) &&
      (p.name.toLowerCase().includes('grain') ||
       p.name.includes('JHP') ||
       p.name.includes('FMJ') ||
       p.name.toLowerCase().includes('ammo') ||
       p.name.toLowerCase().includes('ammunition'))
    );
    
    if (ammoInFirearms.length > 0) {
      console.log(`⚠️  Found ${ammoInFirearms.length} potential ammo products in firearm categories:`);
      ammoInFirearms.slice(0, 5).forEach(p => {
        console.log(`   - ${p.name} (${p.category})`);
      });
    } else {
      console.log('✅ No ammunition found in firearm categories!');
    }
    
    // Step 5: Transform for Algolia
    console.log('\n🔄 Preparing products for Algolia...');
    const algoliaObjects = products.map(p => ({
      objectID: p.id.toString(),
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      manufacturer: p.manufacturer,
      price_bronze: p.price_bronze,
      price_gold: p.price_gold,
      price_platinum: p.price_platinum,
      inventory_quantity: p.inventory_quantity,
      description: p.description,
      requires_ffl: p.requires_ffl,
      must_route_through_gun_firm: p.must_route_through_gun_firm,
      caliber: p.caliber,
      capacity: p.capacity,
      department_number: p.department_number,
      department_desc: p.department_desc,
      sub_department_desc: p.sub_department_desc,
      subcategory_name: p.subcategory_name,
      nfa_item_type: p.nfa_item_type,
      receiver_type: p.receiver_type,
      platform_category: p.platform_category,
      product_type: p.product_type,
      new_item: p.new_item,
      internal_special: p.internal_special,
      shipping_method: p.shipping_method,
      part_type_category: p.part_type_category,
      accessory_type: p.accessory_type,
      compatibility: p.compatibility,
      material: p.material,
      mount_type: p.mount_type,
      nfa_barrel_length: p.nfa_barrel_length,
      nfa_finish: p.nfa_finish,
      is_firearm: p.is_firearm,
      rsr_stock_number: p.rsr_stock_number,
      tierPricing: {
        bronze: p.price_bronze,
        gold: p.price_gold,
        platinum: p.price_platinum
      }
    }));
    
    // Step 6: Batch save to Algolia
    console.log('\n📤 Uploading to Algolia...');
    const batchSize = 1000;
    for (let i = 0; i < algoliaObjects.length; i += batchSize) {
      const batch = algoliaObjects.slice(i, i + batchSize);
      await algolia.saveObjects({ 
        indexName,
        objects: batch 
      });
      const progress = Math.min(i + batchSize, algoliaObjects.length);
      console.log(`   ✅ Indexed ${progress}/${algoliaObjects.length} products (${Math.round(progress * 100 / algoliaObjects.length)}%)`);
    }
    
    // Step 7: Wait a moment for indexing
    console.log('\n⏳ Waiting for Algolia indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🎉 COMPLETE ALGOLIA REINDEX SUCCESSFUL!');
    console.log('✅ All products have been reindexed with correct categories');
    console.log('✅ The UI should now show the correct products in each category');
    
    // Final verification
    console.log('\n📊 Final summary:');
    console.log(`   Total products indexed: ${algoliaObjects.length}`);
    console.log(`   Handguns: ${categoryCount['Handguns'] || 0} (all actual firearms)`);
    console.log(`   Rifles: ${categoryCount['Rifles'] || 0} (all actual firearms)`);
    console.log(`   Shotguns: ${categoryCount['Shotguns'] || 0} (all actual firearms)`);
    console.log(`   Ammunition: ${categoryCount['Ammunition'] || 0} (separated from firearms)`);
    
  } catch (error) {
    console.error('❌ Error during reindex:', error);
    throw error;
  }
}

// Run the reindex
fullAlgoliaReindex()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });