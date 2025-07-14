/**
 * Add Traditional Handgun Field to Algolia
 * Adds isTraditionalHandgun field to handgun products for proper sorting
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
  console.error('❌ Missing Algolia credentials');
  process.exit(1);
}

/**
 * Determine if a handgun product is a traditional handgun vs rifle-style platform
 */
function isTraditionalHandgun(name: string, description: string): boolean {
  const combined = `${name} ${description}`.toLowerCase();
  
  // Traditional handgun indicators
  const traditionalPatterns = [
    'pistol', 'revolver', '1911', 'glock', 'sig sauer', 'beretta',
    'smith & wesson', 'colt', 'ruger', 'springfield', 'kimber',
    'walther', 'h&k', 'heckler & koch', 'taurus', 'canik',
    'derringer', 'single action', 'double action', 'striker fired',
    'compact', 'subcompact', 'full size', 'carry', 'concealed'
  ];
  
  // Rifle-style platform indicators (these override traditional patterns)
  const rifleStylePatterns = [
    'rifle', 'carbine', 'ar-15', 'ar15', 'ak-47', 'ak47',
    'sbr', 'short barrel', 'without stock', 'no stock',
    'platform', 'receiver', 'upper', 'lower', 'muzzle device',
    'buffer tube', 'brace', 'stabilizing'
  ];
  
  // Check for rifle-style patterns first (these are disqualifying)
  if (rifleStylePatterns.some(pattern => combined.includes(pattern))) {
    return false;
  }
  
  // Check for traditional patterns
  if (traditionalPatterns.some(pattern => combined.includes(pattern))) {
    return true;
  }
  
  // Default to traditional if it's in handgun category but no clear indicators
  return true;
}

async function addTraditionalHandgunField() {
  try {
    console.log('🔄 Adding isTraditionalHandgun field to Algolia handgun products...');
    
    // Get all handgun products from database
    const handgunProducts = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '01'));
    
    console.log(`📊 Found ${handgunProducts.length} handgun products to process`);
    
    // Process in batches
    const batchSize = 100;
    let totalProcessed = 0;
    let traditionalCount = 0;
    let rifleStyleCount = 0;
    
    for (let i = 0; i < handgunProducts.length; i += batchSize) {
      const batch = handgunProducts.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(handgunProducts.length / batchSize)} (${batch.length} products)...`);
      
      // Transform products for Algolia with isTraditionalHandgun field
      const algoliaUpdates = batch.map(product => {
        const isTraditional = isTraditionalHandgun(product.name, product.description || '');
        
        if (isTraditional) {
          traditionalCount++;
        } else {
          rifleStyleCount++;
        }
        
        return {
          objectID: product.sku,
          isTraditionalHandgun: isTraditional
        };
      });
      
      // Update Algolia with partial update
      const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
      
      const payload = {
        requests: algoliaUpdates.map(product => ({
          action: 'partialUpdateObject',
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
      
      totalProcessed += response.data.objectIDs?.length || 0;
      console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1}: ${response.data.objectIDs?.length || 0} products`);
      
      // Small delay to avoid rate limiting
      if (i + batchSize < handgunProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n✅ Successfully added isTraditionalHandgun field to ${totalProcessed} handgun products`);
    console.log(`📊 Traditional handguns: ${traditionalCount}`);
    console.log(`📊 Rifle-style platforms: ${rifleStyleCount}`);
    
    // Test the traditional handgun sorting
    console.log('\n🧪 Testing traditional handgun sorting...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    const sortTest = await axios.post(testUrl, {
      query: '',
      filters: 'departmentNumber:"01"',
      sort: ['isTraditionalHandgun:desc', 'inStock:desc', 'name:asc'],
      hitsPerPage: 10
    }, {
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🎯 Sort test results: ${sortTest.data.nbHits} total handguns`);
    console.log('First 5 results:');
    sortTest.data.hits.slice(0, 5).forEach((hit: any, index: number) => {
      console.log(`${index + 1}. ${hit.name} (Traditional: ${hit.isTraditionalHandgun})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding traditional handgun field:', error);
    process.exit(1);
  }
}

// Run the script
addTraditionalHandgunField()
  .then(() => {
    console.log('\n🎉 Traditional handgun field addition completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });