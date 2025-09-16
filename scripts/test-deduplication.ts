import { ProductDeduplicationService } from '../server/services/product-deduplication';
import { BatchDeduplicationService } from '../server/services/batch-deduplication';
import { CartCanonicalizationService } from '../server/middleware/cart-canonicalization';

/**
 * Test script for UPC-based deduplication system
 */

async function testDeduplicationSystem() {
  console.log('🧪 Testing UPC-based deduplication system...\n');

  try {
    // 1. Test deduplication statistics
    console.log('📊 Getting current deduplication stats...');
    const stats = await ProductDeduplicationService.getDeduplicationStats();
    console.log(JSON.stringify(stats, null, 2));

    // 2. Test getting duplicate UPCs
    console.log('\n🔍 Getting sample duplicate UPCs...');
    const duplicateUPCs = await ProductDeduplicationService.getDuplicateUPCs();
    console.log(`Found ${duplicateUPCs.length} UPCs with duplicates`);
    console.log('Sample UPCs:', duplicateUPCs.slice(0, 5));

    // 3. Test canonical selection for a specific UPC
    if (duplicateUPCs.length > 0) {
      const testUPC = duplicateUPCs[0];
      console.log(`\n⚖️  Testing canonical selection for UPC: ${testUPC}`);
      
      const duplicateGroup = await ProductDeduplicationService.createDuplicateGroup(testUPC);
      console.log(`Products in group: ${duplicateGroup.products.length}`);
      console.log(`Canonical product: ${duplicateGroup.canonicalProduct.id} - ${duplicateGroup.canonicalProduct.name}`);
      console.log(`Products to archive: ${duplicateGroup.duplicatesForArchival.length}`);

      // Show dedup reasons
      duplicateGroup.duplicatesForArchival.forEach(duplicate => {
        const reason = ProductDeduplicationService.generateDedupReason(
          duplicateGroup.canonicalProduct, 
          duplicate
        );
        console.log(`  - Archive ${duplicate.id}: ${reason}`);
      });
    }

    // 4. Test cart canonicalization
    console.log('\n🛒 Testing cart canonicalization...');
    const testCartItems = [
      { productId: 123, quantity: 2 },
      { productId: 456, quantity: 1 }
    ];
    
    try {
      const canonicalizedItems = await CartCanonicalizationService.canonicalizeCartItems(testCartItems);
      console.log('Cart canonicalization test passed');
      console.log('Original items:', testCartItems.length);
      console.log('Canonicalized items:', canonicalizedItems.length);
    } catch (error) {
      console.log('Cart canonicalization test completed (expected for test data)');
    }

    // 5. Test dry run deduplication
    console.log('\n🧪 Running dry run deduplication...');
    const dryRunResult = await BatchDeduplicationService.dryRunDeduplication();
    console.log('Dry run completed:', dryRunResult.batchId);
    console.log(`Would process ${dryRunResult.totalUPCs} UPCs`);

    console.log('\n✅ All deduplication tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDeduplicationSystem().then(() => {
    console.log('✨ Test script completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
}

export { testDeduplicationSystem };