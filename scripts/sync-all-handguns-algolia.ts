/**
 * Sync All Handgun Products to Algolia - Complete Fix
 * Properly syncs all 3,500+ handgun products with correct field mapping and ranking
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import { algoliasearch } from 'algoliasearch';

// Initialize Algolia client
const appId = process.env.ALGOLIA_APP_ID || '';
const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY || '';

if (!appId || !adminApiKey) {
  console.error('❌ Algolia credentials missing');
  process.exit(1);
}

const client = algoliasearch(appId, adminApiKey);
const indexName = 'products';

/**
 * Check if product is a complete handgun vs component
 */
function isCompleteHandgun(name: string): boolean {
  const componentKeywords = [
    'slide', 'barrel', 'frame', 'grip', 'trigger', 'sight', 'magazine',
    'mag', 'spring', 'pin', 'screw', 'bolt', 'carrier', 'guide',
    'assembly', 'kit', 'part', 'component', 'replacement', 'upgrade',
    'accessory', 'mount', 'rail', 'laser', 'light', 'holster',
    'case', 'bag', 'cleaning', 'tool', 'lubricant', 'oil'
  ];
  
  const nameWords = name.toLowerCase().split(/\s+/);
  return !componentKeywords.some(keyword => 
    nameWords.some(word => word.includes(keyword))
  );
}

/**
 * Convert database product to Algolia format
 */
function convertToAlgoliaFormat(product: any): any {
  const isComplete = isCompleteHandgun(product.name);
  
  return {
    objectID: product.sku,
    title: product.name,
    name: product.name,
    description: product.name,
    fullDescription: product.description || product.name,
    category: product.category,
    categoryName: product.category, // This is the key field for filtering
    manufacturer: product.manufacturer,
    manufacturerName: product.manufacturerName || product.manufacturer,
    sku: product.sku,
    inStock: product.inStock,
    quantity: product.quantity,
    retailPrice: product.retailPrice,
    dealerPrice: product.dealerPrice,
    msrp: product.msrp,
    retailMap: product.retailMap,
    tierPricing: product.tierPricing,
    requiresFFL: product.requiresFFL,
    tags: Array.isArray(product.tags) ? product.tags : [],
    imageUrl: product.imageUrl,
    createdAt: product.createdAt ? product.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: product.updatedAt ? product.updatedAt.toISOString() : new Date().toISOString(),
    isCompleteFirearm: isComplete ? 1 : 0 // Ranking boost for complete handguns
  };
}

/**
 * Sync all handgun products to Algolia
 */
async function syncAllHandgunsToAlgolia() {
  console.log('🔫 SYNCING ALL HANDGUN PRODUCTS TO ALGOLIA...\n');

  try {
    // Step 1: Get all handgun products
    console.log('📊 Fetching all handgun products...');
    const allHandgunProducts = await db
      .select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    console.log(`Found ${allHandgunProducts.length} handgun products\n`);
    
    // Step 2: Convert to Algolia format
    console.log('🔄 Converting products to Algolia format...');
    const algoliaProducts = allHandgunProducts.map(convertToAlgoliaFormat);
    
    // Step 3: Check complete vs component distribution
    const completeHandguns = algoliaProducts.filter(p => p.isCompleteFirearm === 1);
    const components = algoliaProducts.filter(p => p.isCompleteFirearm === 0);
    
    console.log(`📈 Product breakdown:`);
    console.log(`  🔫 Complete handguns: ${completeHandguns.length}`);
    console.log(`  🔧 Components/accessories: ${components.length}\n`);
    
    // Step 4: Batch upload to Algolia (500 at a time)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < algoliaProducts.length; i += batchSize) {
      batches.push(algoliaProducts.slice(i, i + batchSize));
    }
    
    console.log(`🚀 Uploading ${batches.length} batches to Algolia...`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      await client.saveObjects({
        indexName,
        objects: batch
      });
      console.log(`  ✅ Batch ${i + 1}/${batches.length} uploaded (${batch.length} products)`);
    }
    
    // Step 5: Update search settings
    console.log('\n⚙️  Updating search settings...');
    await client.setSettings({
      indexName,
      indexSettings: {
        searchableAttributes: [
          'name,description',
          'fullDescription',
          'manufacturer',
          'sku',
          'category',
          'tags'
        ],
        attributesForFaceting: [
          'filterOnly(categoryName)',
          'filterOnly(manufacturer)',
          'filterOnly(inStock)',
          'filterOnly(tags)'
        ],
        customRanking: [
          'desc(isCompleteFirearm)', // Complete handguns first
          'desc(inStock)',
          'asc(retailPrice)'
        ],
        ranking: [
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom'
        ]
      }
    });
    console.log('✅ Search settings updated\n');
    
    // Step 6: Test the results
    console.log('🧪 Testing handgun search results...');
    const testResult = await client.search({
      indexName,
      searchParams: {
        query: '',
        filters: 'categoryName:"Handguns"',
        hitsPerPage: 10
      }
    });
    
    console.log('📋 TOP 10 HANDGUN RESULTS:');
    console.log('-'.repeat(80));
    
    testResult.hits.forEach((hit: any, index: number) => {
      const icon = hit.isCompleteFirearm === 1 ? '🔫' : '🔧';
      console.log(`${index + 1}. ${icon} ${hit.name}`);
    });
    
    console.log('\n✅ HANDGUN SYNC COMPLETE');
    console.log(`\n📊 FINAL STATS:`);
    console.log(`- Total products synced: ${algoliaProducts.length}`);
    console.log(`- Complete handguns: ${completeHandguns.length} (prioritized in search)`);
    console.log(`- Components/accessories: ${components.length} (ranked lower)`);
    console.log(`- Search results: ${testResult.nbHits} products available`);
    console.log(`\n💡 Complete handguns now appear before slides, barrels, and parts!`);
    
  } catch (error) {
    console.error('❌ Error syncing handguns to Algolia:', error);
    throw error;
  }
}

// Run the sync
syncAllHandgunsToAlgolia().catch(console.error);