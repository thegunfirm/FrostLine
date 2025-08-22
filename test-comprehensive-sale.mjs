// Test comprehensive sale processing with authentic data
import { ComprehensiveOrderProcessor } from './server/services/comprehensive-order-processor.ts';

async function runComprehensiveSale() {
  console.log('🚀 Starting comprehensive sale test with real inventory...');
  
  try {
    console.log('🔄 Processing with comprehensive logging...');
    const result = await ComprehensiveOrderProcessor.demonstrateWithRealData();
    
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