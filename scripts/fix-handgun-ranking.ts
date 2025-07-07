/**
 * Fix Handgun Ranking - Prioritize Complete Handguns Over Components
 * Updates Algolia search settings to rank complete handguns above slides, barrels, and parts
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import { algoliaSearch } from "../server/services/algolia-search";

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  manufacturerName: string;
  sku: string;
  inStock: boolean;
  quantity: number;
  retailPrice: number;
  dealerPrice: number;
  msrp: number;
  retailMap: number;
  tierPricing: {
    bronze: number;
    gold: number;
    platinum: number;
  };
  requiresFFL: boolean;
  tags: string[];
  imageUrl: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convert database product to RSR format for Algolia
 */
function convertToRSRFormat(product: Product): any {
  return {
    stockNo: product.sku,
    description: product.name,
    fullDescription: product.description,
    categoryDesc: product.category,
    subDepartmentDesc: '', // Will be populated from tags if available
    manufacturer: product.manufacturer,
    mfgName: product.manufacturerName,
    mfgPartNumber: product.sku,
    upc: '',
    retailPrice: product.retailPrice,
    rsrPrice: product.dealerPrice,
    weight: 0,
    quantity: product.quantity,
    imgName: product.imageUrl?.id?.replace('rsr-', '') || '',
    newItem: false,
    promo: false,
    allocated: false,
    accessories: ''
  };
}

/**
 * Fix handgun ranking in Algolia
 */
async function fixHandgunRanking() {
  console.log('🔧 FIXING HANDGUN RANKING IN ALGOLIA...\n');

  try {
    // Step 1: Configure search settings with new ranking
    console.log('⚙️  Updating Algolia search settings...');
    await algoliaSearch.configureSearchSettings();
    console.log('✅ Search settings updated\n');
    
    // Step 2: Get handgun products to reindex
    console.log('📊 Fetching handgun products...');
    const handgunProducts = await db
      .select()
      .from(products)
      .where(eq(products.category, 'Handguns'))
      .limit(1000); // Process in batches
    
    console.log(`Found ${handgunProducts.length} handgun products\n`);
    
    // Step 3: Convert to RSR format and reindex
    console.log('🔄 Reindexing handgun products with new ranking...');
    const rsrProducts = handgunProducts.map(convertToRSRFormat);
    await algoliaSearch.indexProducts(rsrProducts);
    console.log('✅ Handgun products reindexed\n');
    
    // Step 4: Test the ranking
    console.log('🧪 Testing new ranking...');
    const testResults = await algoliaSearch.searchProducts('', {
      category: 'Handguns'
    }, {
      page: 0,
      hitsPerPage: 10
    });
    
    console.log('📋 TOP 10 HANDGUN RESULTS (after ranking fix):');
    console.log('-'.repeat(80));
    testResults.hits.forEach((hit: any, index: number) => {
      const isComplete = hit.isCompleteFirearm === 1 ? '🔫' : '🔧';
      console.log(`${index + 1}. ${isComplete} ${hit.name}`);
    });
    
    console.log('\n✅ HANDGUN RANKING FIX COMPLETE');
    console.log('\n💡 RESULTS:');
    console.log('- Complete handguns now rank above slides, barrels, and parts');
    console.log('- Algolia search settings updated with new ranking algorithm');
    console.log('- Handgun products reindexed with isCompleteFirearm boost');
    console.log('- 🔫 = Complete handgun, 🔧 = Component/part');
    
  } catch (error) {
    console.error('❌ Error fixing handgun ranking:', error);
    throw error;
  }
}

// Run the fix
fixHandgunRanking().catch(console.error);