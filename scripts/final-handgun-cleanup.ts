/**
 * Final Handgun Cleanup - Remove All Remaining Accessories
 * Aggressively moves all remaining accessories, sights, mounts, triggers, grips, etc. out of Handguns
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, like, or, and } from "drizzle-orm";
import axios from 'axios';

async function finalHandgunCleanup() {
  try {
    console.log('🔄 Starting final handgun cleanup - removing all remaining accessories...');
    
    const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
    const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    // Get all current handgun products that are actually accessories
    const accessoryPatterns = [
      '%SIGHT%', '%MOUNT%', '%BBL%', '%BARREL%', '%MAGWELL%', '%TRIGGER%', '%TRG%',
      '%GRIP%', '%GRP%', '%SLIDE%', '%COMPENSATOR%', '%COMP%', '%LASER%', '%LIGHT%',
      '%OPTIC%', '%RAIL%', '%STOCK%', '%BRACE%', '%PAD%', '%EXTENSION%', '%EXT%',
      '%KIT%', '%PART%', '%COMPONENT%', '%ACCESSORY%', 'XS %', '%TYRANT%', 
      '%TRUE PREC%', '%TALON%', '%PEARCE%', '%HOGUE%', '%CRIMSON%', '%STREAMLIGHT%',
      '%SUREFIRE%', '%BLACKHAWK%', '%SAFARILAND%', '%FOR GLOCK%', '%FITS GLOCK%',
      '%FOR SIG%', '%FITS SIG%', '%FOR S&W%', '%FITS S&W%', '%FOR RUGER%', '%FITS RUGER%',
      '%THREADED%', '%THRDD%', '%THRD%', '%SPRING%', '%GUIDE%', '%ROD%', '%PIN%',
      '%LEVER%', '%HANDLE%', '%BUTTON%', '%SWITCH%', '%SAFETY%', '%CATCH%', '%RELEASE%'
    ];
    
    console.log('🧹 Moving accessories from Handguns to Accessories category...');
    
    // Build the OR condition for all patterns
    const conditions = accessoryPatterns.map(pattern => like(products.name, pattern));
    
    const accessoryUpdate = await db.update(products)
      .set({ category: 'Accessories' })
      .where(
        and(
          eq(products.category, 'Handguns'),
          or(...conditions)
        )
      );
    
    console.log('✅ Database cleanup completed');
    
    // Get the updated products for Algolia sync
    const updatedProducts = await db.select()
      .from(products)
      .where(
        and(
          eq(products.category, 'Accessories'),
          or(...conditions)
        )
      );
    
    console.log(`📊 Found ${updatedProducts.length} accessories to sync to Algolia`);
    
    // Sync to Algolia in batches
    const batchSize = 100;
    let totalSynced = 0;
    
    for (let i = 0; i < updatedProducts.length; i += batchSize) {
      const batch = updatedProducts.slice(i, i + batchSize);
      console.log(`🔄 Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatedProducts.length / batchSize)}...`);
      
      const algoliaUpdates = batch.map(product => ({
        objectID: product.sku,
        categoryName: 'Accessories', // Updated category
        subcategoryName: product.subcategoryName || undefined,
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
    
    console.log(`✅ Final cleanup completed: ${totalSynced} accessories moved from Handguns to Accessories`);
    
    // Test the final results
    console.log('\n🧪 Testing final handgun filtering...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    const handgunTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns"',
      hitsPerPage: 15
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Handguns category: ${handgunTest.data.nbHits} total results`);
    console.log('Sample results (should now be mostly actual handguns):');
    handgunTest.data.hits.forEach((hit: any, index: number) => {
      const isLikelyHandgun = !hit.title?.includes('SIGHT') && 
                            !hit.title?.includes('MOUNT') && 
                            !hit.title?.includes('BBL') &&
                            !hit.title?.includes('MAGWELL') &&
                            !hit.title?.includes('TRIGGER') &&
                            !hit.title?.includes('GRIP') &&
                            !hit.title?.includes('XS ') &&
                            !hit.title?.includes('TYRANT') &&
                            !hit.title?.includes('TRUE PREC') &&
                            !hit.title?.includes('TALON') &&
                            !hit.title?.includes('COMP');
      console.log(`   ${index + 1}. ${hit.title} ${isLikelyHandgun ? '✅' : '⚠️'}`);
    });
    
    console.log('\n🎉 Final handgun cleanup completed!');
    console.log('The Handguns category should now primarily contain actual firearms.');
    
  } catch (error) {
    console.error('❌ Error in final handgun cleanup:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
finalHandgunCleanup().then(() => {
  console.log('Final cleanup completed');
  process.exit(0);
}).catch(error => {
  console.error('Final cleanup failed:', error);
  process.exit(1);
});