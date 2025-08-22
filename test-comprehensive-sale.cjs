// Test comprehensive sale processing with authentic data
const { createRequire } = require('module');
const require = createRequire(import.meta.url);

async function runComprehensiveSale() {
  console.log('🚀 Starting comprehensive sale test with real inventory...');
  
  try {
    // Import with dynamic import for ESM compatibility
    const { ComprehensiveOrderProcessor } = await import('./server/services/comprehensive-order-processor.ts');
    
    console.log('📦 Creating order processor...');
    const processor = new ComprehensiveOrderProcessor();
    
    // Test the static method
    console.log('🔄 Processing with comprehensive logging...');
    const result = await processor.demonstrateComprehensiveLogging();
    
    console.log('✅ Sale processing completed successfully!');
    console.log('📊 Order Result:', {
      success: result.success,
      orderId: result.orderId,
      tgfOrderNumber: result.tgfOrderNumber,
      totalLogs: result.logs?.length || 0
    });
    
    if (result.logs && result.logs.length > 0) {
      console.log('\n📋 Activity Log Summary:');
      result.logs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.event_type}: ${log.success ? '✅ Success' : '❌ Failed'}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Sale processing failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Run the test
runComprehensiveSale()
  .then((result) => {
    console.log('\n🎉 Comprehensive sale test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Comprehensive sale test failed:', error);
    process.exit(1);
  });