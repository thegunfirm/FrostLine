/**
 * Sync NFA Filters to Algolia
 * Updates all 652 NFA products with comprehensive filtering data
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { algoliasearch } from 'algoliasearch';

// Initialize Algolia client
const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_API_KEY!
);

interface AlgoliaProduct {
  objectID: string;
  nfaItemType?: string;
  caliber?: string;
  barrelLengthNFA?: string;
  finishNFA?: string;
  [key: string]: any;
}

async function syncNFAFiltersToAlgolia() {
  console.log('🔧 Starting NFA Filter Sync to Algolia...');
  
  try {
    // Get all NFA products from database
    const nfaProducts = await db
      .select()
      .from(products)
      .where(eq(products.departmentNumber, '06'));

    console.log(`📊 Found ${nfaProducts.length} NFA products to sync`);

    // Transform for Algolia - include all NFA products for complete filter data
    const algoliaUpdates: AlgoliaProduct[] = nfaProducts.map(product => ({
      objectID: product.sku,
      nfaItemType: product.nfa_item_type || undefined,
      caliber: product.caliber || undefined,
      barrelLengthNFA: product.barrel_length_nfa || undefined,
      finishNFA: product.finish_nfa || undefined,
    }));

    // Update all NFA products to ensure complete filter data
    const productsToUpdate = algoliaUpdates;

    console.log(`🎯 ${productsToUpdate.length} products have new filter data`);

    // Batch sync to Algolia
    const batchSize = 100;
    let synced = 0;
    
    for (let i = 0; i < productsToUpdate.length; i += batchSize) {
      const batch = productsToUpdate.slice(i, i + batchSize);
      
      try {
        await algoliaClient.partialUpdateObjects({
          indexName: 'products',
          objects: batch
        });
        synced += batch.length;
        console.log(`✅ Synced ${synced}/${productsToUpdate.length} NFA products`);
      } catch (error) {
        console.error(`❌ Error syncing batch ${i}-${i + batchSize}:`, error);
      }
    }

    // Generate filter coverage report
    const coverageReport = generateCoverageReport(nfaProducts);
    console.log('\n📈 NFA Filter Coverage Report:');
    console.log(coverageReport);

    console.log('\n🎉 NFA Filter Sync Complete!');
    console.log(`✅ Total products processed: ${nfaProducts.length}`);
    console.log(`✅ Products with filter data: ${productsToUpdate.length}`);
    console.log(`✅ Successfully synced to Algolia: ${synced}`);

  } catch (error) {
    console.error('❌ Error during NFA filter sync:', error);
    throw error;
  }
}

function generateCoverageReport(nfaProducts: any[]) {
  const total = nfaProducts.length;
  const withNFAType = nfaProducts.filter(p => p.nfaItemType && p.nfaItemType.trim() !== '').length;
  const withCaliber = nfaProducts.filter(p => p.caliber && p.caliber.trim() !== '').length;
  const withBarrelLength = nfaProducts.filter(p => p.barrelLengthNfa && p.barrelLengthNfa.trim() !== '').length;
  const withFinish = nfaProducts.filter(p => p.finishNfa && p.finishNfa.trim() !== '').length;

  return `
NFA Item Type: ${withNFAType}/${total} (${(withNFAType/total*100).toFixed(1)}%)
Enhanced Caliber: ${withCaliber}/${total} (${(withCaliber/total*100).toFixed(1)}%)
Barrel Length: ${withBarrelLength}/${total} (${(withBarrelLength/total*100).toFixed(1)}%)
Finish: ${withFinish}/${total} (${(withFinish/total*100).toFixed(1)}%)

Filter Type Breakdown:
${getFilterBreakdown(nfaProducts, 'nfaItemType', 'NFA Item Type')}

Top Calibers:
${getFilterBreakdown(nfaProducts, 'caliber', 'Caliber', 8)}

Top Barrel Lengths:
${getFilterBreakdown(nfaProducts, 'barrelLengthNfa', 'Barrel Length', 8)}

Top Finishes:
${getFilterBreakdown(nfaProducts, 'finishNfa', 'Finish', 8)}
`;
}

function getFilterBreakdown(products: any[], field: string, title: string, limit = 10) {
  const counts = products.reduce((acc, product) => {
    const value = product[field];
    if (value) {
      acc[value] = (acc[value] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([value, count]) => `  ${value}: ${count}`)
    .join('\n');
}

// Run the sync
syncNFAFiltersToAlgolia()
  .then(() => {
    console.log('🎯 NFA Filter Sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 NFA Filter Sync failed:', error);
    process.exit(1);
  });

export default syncNFAFiltersToAlgolia;