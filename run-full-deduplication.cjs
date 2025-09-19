#!/usr/bin/env node

/**
 * Full UPC-Based Deduplication Execution
 * 
 * Processes all ~27,654 duplicate products in the database
 * Archives duplicates while keeping canonical products
 */

console.log('🚀 Starting FULL UPC-based deduplication of all duplicate products...\n');

async function runFullDeduplication() {
  try {
    // Import services dynamically to handle ES modules
    const { BatchDeduplicationService } = await import('./server/services/batch-deduplication.ts');
    
    console.log('📊 Expected results:');
    console.log('  - ~27,654 products to archive');
    console.log('  - ~27,478 products to keep as canonical');
    console.log('  - Full transactional safety with Algolia integration\n');
    
    console.log('⚙️  Configuration:');
    console.log('  - Batch size: 50 UPCs per batch');
    console.log('  - Safety delay: 1000ms between batches');
    console.log('  - Mode: PRODUCTION (dryRun: false)\n');
    
    // Execute full batch deduplication
    const service = new BatchDeduplicationService();
    const result = await service.executeBatchDeduplication({
      batchSize: 50,
      delayBetweenBatches: 1000,
      dryRun: false
    });
    
    console.log('\n🎉 FULL DEDUPLICATION COMPLETED!');
    console.log('=' .repeat(50));
    console.log(`📋 Batch ID: ${result.batchId}`);
    console.log(`📊 Total UPCs processed: ${result.processedUPCs}/${result.totalUPCs}`);
    console.log(`🗂️  Products archived: ${result.totalProductsProcessed}`);
    console.log(`⚠️  Errors: ${result.totalErrors}`);
    console.log(`⏱️  Processing time: ${(result.processingTimeMs / 1000).toFixed(2)}s`);
    console.log(`🚀 Performance: ${(result.processedUPCs / (result.processingTimeMs / 1000)).toFixed(2)} UPCs/second`);
    
    if (result.totalErrors > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      console.log('\n⚠️  Some errors occurred, but deduplication may have partially succeeded.');
    } else {
      console.log('\n✅ DEDUPLICATION COMPLETED SUCCESSFULLY WITH NO ERRORS!');
    }
    
    console.log('\n🔍 Next steps:');
    console.log('  1. Verify product counts in database');
    console.log('  2. Validate Algolia search excludes archived products');
    console.log('  3. Test cart canonicalization with guest carts');
    console.log('  4. Confirm order history displays correctly');
    
    return result;
    
  } catch (error) {
    console.error('💥 FULL DEDUPLICATION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute the full deduplication
runFullDeduplication().then((result) => {
  console.log('\n🏁 Full deduplication script completed');
  process.exit(result.totalErrors > 0 ? 1 : 0);
}).catch(error => {
  console.error('💥 Script execution failed:', error);
  process.exit(1);
});