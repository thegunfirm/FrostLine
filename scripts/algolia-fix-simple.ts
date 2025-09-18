import { algoliasearch } from 'algoliasearch';
import { neon } from '@neondatabase/serverless';

async function fixAlgolia() {
  console.log('🔄 Starting Algolia fix for category issues...');
  
  const sql = neon(process.env.DATABASE_URL!);
  const algolia = algoliasearch(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_API_KEY!
  );
  const indexName = process.env.ALGOLIA_PRODUCTS_INDEX || 'products';
  
  console.log(`📝 Using index: ${indexName}`);
  
  try {
    // Clear the index
    console.log('🗑️  Clearing Algolia index...');
    await algolia.clearObjects({ indexName });
    
    // Get products with correct categories
    console.log('📊 Getting products from database...');
    const products = await sql`
      SELECT 
        id,
        sku,
        name,
        category,
        manufacturer,
        description,
        price_bronze,
        price_gold,
        price_platinum,
        stock_quantity,
        requires_ffl,
        must_route_through_gun_firm,
        caliber,
        rsr_stock_number
      FROM products
      WHERE price_bronze > 0
      ORDER BY id
    `;
    
    console.log(`✅ Found ${products.length} products`);
    
    // Count categories
    const categoryCount: Record<string, number> = {};
    products.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });
    
    console.log('\n📊 Categories from database:');
    console.log('   Handguns:', categoryCount['Handguns'] || 0);
    console.log('   Rifles:', categoryCount['Rifles'] || 0);
    console.log('   Shotguns:', categoryCount['Shotguns'] || 0);
    console.log('   Ammunition:', categoryCount['Ammunition'] || 0);
    
    // Check for ammo in firearm categories
    const ammoInFirearms = products.filter(p => 
      ['Handguns', 'Rifles', 'Shotguns'].includes(p.category) &&
      (p.name.toLowerCase().includes('grain') ||
       p.name.includes('JHP') ||
       p.name.includes('FMJ'))
    );
    
    if (ammoInFirearms.length > 0) {
      console.log(`\n⚠️  Found ${ammoInFirearms.length} potential ammo in firearm categories`);
      ammoInFirearms.slice(0, 3).forEach(p => {
        console.log(`   - ${p.name} (${p.category})`);
      });
    } else {
      console.log('\n✅ No ammo found in firearm categories');
    }
    
    // Transform for Algolia
    const algoliaObjects = products.map(p => ({
      objectID: p.id.toString(),
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.category,  // Changed from 'category' to 'categoryName'
      manufacturerName: p.manufacturer,  // Changed to match expected field
      description: p.description,
      price_bronze: p.price_bronze,
      price_gold: p.price_gold,
      price_platinum: p.price_platinum,
      inventoryQuantity: p.stock_quantity,  // Changed to match expected field
      inStock: p.stock_quantity > 0,  // Added inStock field
      fflRequired: p.requires_ffl,  // Changed to match expected field  
      must_route_through_gun_firm: p.must_route_through_gun_firm,
      caliber: p.caliber,
      stockNumber: p.rsr_stock_number,  // Changed to match expected field
      rsrStockNumber: p.rsr_stock_number,  // Keep both for compatibility
      tierPricing: {
        bronze: p.price_bronze,
        gold: p.price_gold,
        platinum: p.price_platinum
      }
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
    
    console.log('\n🎉 ALGOLIA FIX COMPLETE!');
    console.log('✅ Index rebuilt with correct categories');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run it
fixAlgolia()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));