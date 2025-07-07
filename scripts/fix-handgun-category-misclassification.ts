/**
 * Fix Handgun Category Misclassification
 * Moves magazines, accessories, and airguns out of Handguns category to correct categories
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, like, or } from "drizzle-orm";
import axios from 'axios';

async function fixHandgunCategoryMisclassification() {
  try {
    console.log('🔄 Starting handgun category misclassification fix...');
    
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    // Fix 1: Move magazines out of Handguns to Accessories
    console.log('📦 Moving magazines from Handguns to Accessories...');
    const magazineUpdate = await db.update(products)
      .set({ category: 'Accessories' })
      .where(
        eq(products.category, 'Handguns') && 
        or(
          like(products.name, 'MAG %'),
          like(products.name, '%MAGAZINE%'),
          like(products.name, '%MAG%ROUND%'),
          like(products.name, '%RD %')
        )
      );
    
    // Fix 2: Move holsters and accessories out of Handguns  
    console.log('🔧 Moving holsters and accessories from Handguns to Accessories...');
    const accessoryUpdate = await db.update(products)
      .set({ category: 'Accessories' })
      .where(
        eq(products.category, 'Handguns') &&
        or(
          like(products.name, '%HOLSTER%'),
          like(products.name, '%SL SPECIES%'),
          like(products.name, '%BH STACHE%'),
          like(products.name, '%BRAVO BCA%'),
          like(products.name, '%LAG LIB%'),
          like(products.name, '%IWB%'),
          like(products.name, '%OWB%')
        )
      );
    
    // Fix 3: Move airguns out of Handguns to proper category
    console.log('🎯 Moving airguns from Handguns to Airguns...');
    const airgunUpdate = await db.update(products)
      .set({ category: 'Airguns' })
      .where(
        eq(products.category, 'Handguns') &&
        or(
          like(products.name, '%.177%'),
          like(products.name, '%BLOWBACK%'),
          like(products.name, '%PELLET%'),
          like(products.name, '%UMX%'),
          like(products.name, '%AIRGUN%')
        )
      );
    
    // Fix 4: Correct Taurus G2C handgun subcategory (should be null, not 'Barrels')
    console.log('🔫 Fixing Taurus G2C handgun subcategory...');
    const taurusUpdate = await db.update(products)
      .set({ subcategoryName: null })
      .where(
        eq(products.category, 'Handguns') &&
        like(products.name, 'Taurus G2C%') &&
        like(products.name, '%Barrel%')
      );
    
    console.log('✅ Database category fixes completed');
    
    // Now sync the changes to Algolia
    console.log('🔄 Syncing category changes to Algolia...');
    
    // Get all the products we just updated
    const updatedProducts = await db.select()
      .from(products)
      .where(
        or(
          like(products.name, 'MAG %'),
          like(products.name, '%HOLSTER%'),
          like(products.name, '%.177%'),
          like(products.name, 'Taurus G2C%')
        )
      );
    
    console.log(`📊 Found ${updatedProducts.length} products to sync to Algolia`);
    
    // Process in batches
    const batchSize = 50;
    let totalSynced = 0;
    
    for (let i = 0; i < updatedProducts.length; i += batchSize) {
      const batch = updatedProducts.slice(i, i + batchSize);
      console.log(`🔄 Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatedProducts.length / batchSize)}...`);
      
      const algoliaUpdates = batch.map(product => ({
        objectID: product.sku,
        categoryName: product.category, // Updated category
        subcategoryName: product.subcategoryName || undefined,
        // Include core fields
        title: product.name,
        name: product.name,
        description: product.description,
        sku: product.sku,
        manufacturerName: product.manufacturer,
        tierPricing: {
          bronze: parseFloat(product.priceBronze || '0'),
          gold: parseFloat(product.priceGold || '0'),
          platinum: parseFloat(product.pricePlatinum || '0')
        },
        inventory: {
          onHand: product.stockQuantity || 0,
          allocated: product.allocated === 'Y'
        },
        inStock: product.inStock,
        distributor: product.distributor,
        tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : []
      }));
      
      // Update Algolia
      const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
      
      const payload = {
        requests: algoliaUpdates.map(product => ({
          action: 'updateObject',
          body: product
        }))
      };
      
      const response = await axios.post(algoliaUrl, payload, {
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      totalSynced += response.data.objectIDs?.length || 0;
      console.log(`✅ Synced batch ${Math.floor(i / batchSize) + 1}: ${response.data.objectIDs?.length || 0} products`);
    }
    
    console.log(`✅ Algolia sync completed: ${totalSynced} products updated`);
    
    // Test the results
    console.log('\n🧪 Testing handgun filtering after category fixes...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    // Test handgun filter - should now show actual handguns
    const handgunTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND NOT _exists_:subcategoryName',
      hitsPerPage: 10
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Complete handguns filter: ${handgunTest.data.nbHits} results`);
    console.log('Sample results:');
    handgunTest.data.hits.forEach((hit: any, index: number) => {
      const isActualHandgun = !hit.title?.includes('MAG ') && 
                             !hit.title?.includes('HOLSTER') && 
                             !hit.title?.includes('.177') &&
                             !hit.title?.includes('SIGHT') &&
                             !hit.title?.includes('MOUNT');
      console.log(`   ${index + 1}. ${hit.title} ${isActualHandgun ? '✅' : '⚠️'}`);
    });
    
    console.log('\n🎉 Handgun category misclassification fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing handgun category misclassification:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
fixHandgunCategoryMisclassification().then(() => {
  console.log('Category misclassification fix completed');
  process.exit(0);
}).catch(error => {
  console.error('Category misclassification fix failed:', error);
  process.exit(1);
});