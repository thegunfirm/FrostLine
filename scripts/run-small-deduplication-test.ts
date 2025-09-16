import { BatchDeduplicationService } from '../server/services/batch-deduplication';

/**
 * Run actual deduplication on a small batch to verify the system works end-to-end
 */

async function runSmallDeduplicationTest() {
  console.log('🚀 Running small batch deduplication test (5 UPCs)...\n');

  try {
    // Run test deduplication with 5 UPCs
    const result = await BatchDeduplicationService.testDeduplication(5);
    
    console.log('\n📋 TEST RESULTS:');
    console.log('================');
    console.log(`Batch ID: ${result.batchId}`);
    console.log(`Total UPCs processed: ${result.processedUPCs}/${result.totalUPCs}`);
    console.log(`Products archived: ${result.totalProductsProcessed}`);
    console.log(`Errors: ${result.totalErrors}`);
    console.log(`Processing time: ${(result.processingTimeMs / 1000).toFixed(2)}s`);
    
    if (result.totalErrors > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('\n✅ Test completed successfully with no errors!');
    }

    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
runSmallDeduplicationTest().then((result) => {
  console.log('\n✨ Small batch deduplication test completed');
  process.exit(result.totalErrors > 0 ? 1 : 0);
}).catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});