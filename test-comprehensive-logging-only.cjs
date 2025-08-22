// Test comprehensive logging with existing order data
const { createRequire } = require('module');

async function testComprehensiveLogging() {
  console.log('🚀 Testing comprehensive order activity logging system...');
  
  try {
    // Import the comprehensive processor
    const { ComprehensiveOrderProcessor } = await import('./server/services/comprehensive-order-processor.ts');
    
    console.log('📋 Simulating order processing with authentic data...');
    
    // Create test processing data with real inventory
    const processingData = {
      orderId: 99999, // Use a unique test order ID
      tgfOrderNumber: 'test00099999',
      orderItems: [
        {
          sku: 'PA175S204N-1',
          name: 'GLOCK 17CK GEN5 9MM 17RD W/ACRO',
          quantity: 1,
          price: 1192.00,
          productId: 133979,
          fflRequired: true,
          distributorStockNumber: 'GLPA175S204NCK1SCT'
        },
        {
          sku: 'UP64B',
          name: 'MAGLULA 22LR-380 PSTL BABYUPLULA BLK',
          quantity: 1,
          price: 24.08,
          productId: 140442,
          fflRequired: false,
          distributorStockNumber: 'MLUP64B'
        }
      ],
      customerInfo: {
        email: 'testorder@gunfirm.local',
        firstName: 'End',
        lastName: 'ToEnd',
        membershipTier: 'Bronze'
      },
      fflInfo: {
        license: '1-59-017-07-6F-13700',
        businessName: 'BACK ACRE GUN WORKS',
        address: { city: 'INVERNESS', state: 'FL' }
      },
      paymentData: {
        method: 'credit_card',
        cardNumber: '4111111111111111',
        result: {
          transactionId: `test_auth_${Date.now()}`,
          responseCode: '1',
          authCode: 'TEST123',
          sandbox: true
        }
      }
    };

    console.log('🔫 Products to process:');
    processingData.orderItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.sku}) - $${item.price} ${item.fflRequired ? '🔫 FFL Required' : '🔧 Accessory'}`);
    });
    
    console.log('🏢 FFL Dealer:', processingData.fflInfo.businessName);
    console.log('📧 Customer:', processingData.customerInfo.email);
    console.log('🔢 TGF Order Number:', processingData.tgfOrderNumber);
    
    // First create a dummy order in the database to satisfy foreign key constraints
    console.log('\n📝 Creating test order in database...');
    const { db } = await import('./server/db.ts');
    const { orders } = await import('./shared/schema.ts');
    
    const [testOrder] = await db.insert(orders).values({
      userId: 5, // Use existing verified user
      totalPrice: '1216.08',
      status: 'pending',
      items: JSON.stringify(processingData.orderItems),
      fflRecipientId: 1414, // BACK ACRE GUN WORKS
      paymentMethod: 'credit_card',
      shippingAddress: JSON.stringify({
        street: '123 Test Street',
        city: 'Test City',
        state: 'FL',
        zipCode: '12345'
      })
    }).returning();
    
    console.log('✅ Test order created with ID:', testOrder.id);
    
    // Update processing data with real order ID
    processingData.orderId = testOrder.id;
    processingData.tgfOrderNumber = `test${String(testOrder.id).padStart(8, '0')}`;
    
    console.log('\n🔄 Processing with comprehensive activity logging...');
    const result = await ComprehensiveOrderProcessor.processWithLogging(processingData);
    
    if (result.success) {
      console.log('✅ Comprehensive logging completed successfully!');
      console.log('📊 Total activity logs generated:', result.logs.length);
      
      if (result.logs && result.logs.length > 0) {
        console.log('\n📋 Activity Log Summary:');
        result.logs.forEach((log, index) => {
          console.log(`${index + 1}. ${log.event_type}: ${log.success ? '✅ Success' : '❌ Failed'}`);
          if (log.details && typeof log.details === 'object') {
            console.log(`   Details: ${JSON.stringify(log.details).substring(0, 100)}...`);
          }
        });
      }
      
      // Check for APP Response compilation
      const appResponseLog = result.logs.find(log => log.event_type === 'app_response_compilation');
      if (appResponseLog) {
        console.log('\n📄 APP Response Field Data (for Zoho Deal):');
        console.log(appResponseLog.details);
      }
      
      console.log('\n🔍 Verification Steps:');
      console.log('1. Check order_activity_logs table for order ID:', testOrder.id);
      console.log('2. Verify TGF order number format:', processingData.tgfOrderNumber);
      console.log('3. Check Zoho CRM integration results');
      console.log('   - Contacts module for:', processingData.customerInfo.email);
      console.log('   - Products module for SKUs:', processingData.orderItems.map(i => i.sku).join(', '));
      console.log('   - Deals module with APP Response field populated');
      
      return {
        success: true,
        orderId: testOrder.id,
        tgfOrderNumber: processingData.tgfOrderNumber,
        totalLogs: result.logs.length,
        appResponseGenerated: Boolean(appResponseLog)
      };
      
    } else {
      throw new Error(result.error || 'Processing failed');
    }
    
  } catch (error) {
    console.error('❌ Comprehensive logging test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the test
testComprehensiveLogging()
  .then((result) => {
    console.log('\n🎉 Comprehensive logging system test completed successfully!');
    console.log('📊 Final Results:', result);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
  });