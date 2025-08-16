const axios = require('axios');

console.log('🔧 Testing APP Fields Integration');
console.log('📝 Verifying TGF Order Number from APP, APP_Response, and APP_Confirmed fields');

async function testAPPFieldsIntegration() {
  try {
    console.log('\n📋 Test 1: Creating order with APP response simulation...');
    
    // Simulate an APP/RSR Engine response with TGF Order Number
    const mockEngineResponse = {
      result: {
        StatusCode: '00',
        StatusMessage: 'Order accepted by RSR',
        OrderNumber: 'TGF24082501F0',  // APP-provided TGF Order Number
        PoNumber: 'TEST-APP-' + Date.now(),
        Items: [
          {
            PartNum: 'TEST-SKU-001',
            Status: 'Confirmed',
            Quantity: 1
          }
        ]
      }
    };

    const createResponse = await axios.post('http://localhost:5000/api/test/zoho-system-fields', {
      orderNumber: 'TEST-APP-' + Date.now(),
      customerEmail: `app.test.${Date.now()}@thegunfirm.com`,
      customerName: 'APP Test User',
      membershipTier: 'Gold Monthly',
      totalAmount: 899.99,
      orderItems: [{
        productName: 'Test Rifle with APP Response',
        sku: 'TEST-APP-001',
        quantity: 1,
        unitPrice: 899.99,
        totalPrice: 899.99,
        fflRequired: true
      }],
      fulfillmentType: 'Drop-Ship',
      requiresDropShip: true,
      holdType: undefined,  // No hold - order goes to APP
      fflDealerName: 'Test FFL Dealer',
      isTestOrder: true,
      // Simulate APP response
      engineResponse: mockEngineResponse
    });

    if (!createResponse.data.success) {
      throw new Error(`Deal creation failed: ${createResponse.data.error}`);
    }

    const dealId = createResponse.data.dealId;
    const tgfOrderNumber = createResponse.data.tgfOrderNumber;
    
    console.log(`✅ Deal created successfully:`);
    console.log(`   Deal ID: ${dealId}`);
    console.log(`   TGF Order: ${tgfOrderNumber}`);
    console.log(`   Contact ID: ${createResponse.data.contactId}`);

    // Test 2: Verify APP fields are populated correctly
    console.log('\n📋 Test 2: Retrieving deal to verify APP fields...');
    const retrieveResponse = await axios.get(`http://localhost:5000/api/test/zoho-deal/${dealId}`);
    
    if (!retrieveResponse.data.success) {
      throw new Error(`Deal retrieval failed: ${retrieveResponse.data.error}`);
    }

    const dealData = retrieveResponse.data.deal;
    console.log(`✅ Deal retrieved successfully`);

    // Test 3: Validate APP fields specifically
    console.log('\n📊 Test 3: Validating APP-specific fields...');
    
    const appFields = {
      'TGF_Order_Number': mockEngineResponse.result.OrderNumber,  // Should come from APP
      'APP_Status': true,        // Should contain RSR confirmation
      'APP_Response': true,      // Should contain full APP response
      'APP_Confirmed': true,     // Should have confirmation timestamp
      'Order_Status': 'Confirmed'  // Should be confirmed due to StatusCode '00'
    };

    let appFieldsValid = 0;
    let totalAppFields = Object.keys(appFields).length;

    for (const [fieldName, expectedValue] of Object.entries(appFields)) {
      const actualValue = dealData[fieldName];
      
      if (fieldName === 'TGF_Order_Number') {
        if (actualValue === expectedValue) {
          console.log(`   ✅ ${fieldName}: ${actualValue} (From APP!)`);
          appFieldsValid++;
        } else {
          console.log(`   ❌ ${fieldName}: Expected "${expectedValue}" from APP, got "${actualValue}"`);
        }
      } else if (fieldName === 'APP_Status') {
        if (actualValue && actualValue.includes('RSR Confirmed')) {
          console.log(`   ✅ ${fieldName}: ${actualValue}`);
          appFieldsValid++;
        } else {
          console.log(`   ❌ ${fieldName}: Expected RSR confirmation status, got "${actualValue}"`);
        }
      } else if (fieldName === 'APP_Response') {
        if (actualValue && (typeof actualValue === 'string' && actualValue.includes('StatusCode'))) {
          console.log(`   ✅ ${fieldName}: Full APP response stored`);
          appFieldsValid++;
        } else {
          console.log(`   ❌ ${fieldName}: Expected full APP response, got "${actualValue}"`);
        }
      } else if (fieldName === 'APP_Confirmed') {
        if (actualValue && typeof actualValue === 'string' && actualValue.includes('T')) {
          console.log(`   ✅ ${fieldName}: ${actualValue} (Valid confirmation time)`);
          appFieldsValid++;
        } else {
          console.log(`   ❌ ${fieldName}: Expected confirmation timestamp, got "${actualValue}"`);
        }
      } else if (fieldName === 'Order_Status') {
        if (actualValue === expectedValue) {
          console.log(`   ✅ ${fieldName}: ${actualValue} (Confirmed by APP)`);
          appFieldsValid++;
        } else {
          console.log(`   ❌ ${fieldName}: Expected "${expectedValue}", got "${actualValue}"`);
        }
      }
    }

    // Final results
    console.log('\n🏆 APP FIELDS INTEGRATION RESULTS:');
    console.log(`   APP Fields Valid: ${appFieldsValid}/${totalAppFields}`);
    console.log(`   Success Rate: ${((appFieldsValid/totalAppFields) * 100).toFixed(1)}%`);
    
    if (appFieldsValid === totalAppFields) {
      console.log('   🎉 PERFECT - All APP fields working correctly!');
      console.log('   ✅ TGF Order Number properly sourced from APP');
      console.log('   ✅ APP_Response field captures full APP details');
      console.log('   ✅ APP_Confirmed timestamp working');
      console.log('   🚀 APP integration is production-ready!');
    } else {
      console.log('   ⚠️  Some APP fields need attention');
    }

    // Test 4: Test hold scenario (no APP interaction)
    console.log('\n📋 Test 4: Testing hold scenario (no APP interaction)...');
    const holdResponse = await axios.post('http://localhost:5000/api/test/zoho-system-fields', {
      orderNumber: 'HOLD-TEST-' + Date.now(),
      customerEmail: `hold.test.${Date.now()}@thegunfirm.com`,
      customerName: 'Hold Test User',
      membershipTier: 'Bronze',
      totalAmount: 599.99,
      orderItems: [{
        productName: 'Test Rifle - Hold Case',
        sku: 'HOLD-TEST-001',
        quantity: 1,
        unitPrice: 599.99,
        totalPrice: 599.99,
        fflRequired: true
      }],
      fulfillmentType: 'In-House',
      requiresDropShip: false,
      holdType: 'FFL not on file',  // This creates a hold
      fflDealerName: undefined,
      isTestOrder: true
      // No engineResponse for hold case
    });

    if (holdResponse.data.success) {
      console.log(`   ✅ Hold order created: ${holdResponse.data.dealId}`);
      console.log(`   📝 TGF Order: ${holdResponse.data.tgfOrderNumber} (System generated for hold)`);
      console.log(`   🔒 Status: Hold (no APP interaction required)`);
    }

  } catch (error) {
    console.error('❌ APP fields integration test failed:', error.response?.data || error.message);
  }
}

testAPPFieldsIntegration().then(() => {
  console.log('\n🔍 APP fields integration test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});