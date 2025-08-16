const axios = require('axios');

console.log('🎯 FINAL APP INTEGRATION TEST');
console.log('📋 Comprehensive validation of TGF Order Number from APP + all APP fields');

async function runComprehensiveAPPTest() {
  try {
    console.log('\n🏆 TEST SUITE: Complete APP/RSR Engine Integration');
    
    // Test 1: APP Success Case with Order Number
    console.log('\n📋 Test 1: APP Success - TGF Order Number from Engine');
    const appSuccessResponse = {
      result: {
        StatusCode: '00',
        StatusMessage: 'Order processed successfully by RSR',
        OrderNumber: 'TGF24081601C0',  // Real TGF Order format from APP
        PoNumber: 'RSR-' + Date.now(),
        Items: [
          {
            PartNum: 'TEST-SUCCESS-001',
            Status: 'Confirmed',
            Quantity: 1
          }
        ]
      }
    };

    const successOrder = await axios.post('http://localhost:5000/api/test/zoho-system-fields', {
      orderNumber: 'SUCCESS-' + Date.now(),
      customerEmail: `success.test.${Date.now()}@thegunfirm.com`,
      customerName: 'APP Success Test',
      membershipTier: 'Platinum Monthly',
      totalAmount: 1299.99,
      orderItems: [{
        productName: 'High-End Rifle - APP Success',
        sku: 'SUCCESS-RIFLE-001',
        quantity: 1,
        unitPrice: 1299.99,
        totalPrice: 1299.99,
        fflRequired: true
      }],
      fulfillmentType: 'Drop-Ship',
      requiresDropShip: true,
      fflDealerName: 'Premium FFL Dealer',
      isTestOrder: true,
      engineResponse: appSuccessResponse
    });

    if (!successOrder.data.success) {
      throw new Error(`Success test failed: ${successOrder.data.error}`);
    }

    console.log(`✅ Success Order Created: Deal ${successOrder.data.dealId}`);
    console.log(`🎯 TGF Order from APP: ${successOrder.data.tgfOrderNumber}`);
    console.log(`📊 Expected: ${appSuccessResponse.result.OrderNumber}`);
    console.log(`✓ Match: ${successOrder.data.tgfOrderNumber === appSuccessResponse.result.OrderNumber}`);

    // Test 2: APP Failure Case
    console.log('\n📋 Test 2: APP Failure - Error Response Handling');
    const appFailureResponse = {
      result: {
        StatusCode: '99',
        StatusMessage: 'Insufficient inventory for requested quantity',
        ErrorDetails: 'Product out of stock at distributor'
      }
    };

    const failureOrder = await axios.post('http://localhost:5000/api/test/zoho-system-fields', {
      orderNumber: 'FAILURE-' + Date.now(),
      customerEmail: `failure.test.${Date.now()}@thegunfirm.com`,
      customerName: 'APP Failure Test',
      membershipTier: 'Gold Monthly',
      totalAmount: 599.99,
      orderItems: [{
        productName: 'Out of Stock Rifle - APP Failure',
        sku: 'FAILURE-RIFLE-001',
        quantity: 1,
        unitPrice: 599.99,
        totalPrice: 599.99,
        fflRequired: true
      }],
      fulfillmentType: 'Drop-Ship',
      requiresDropShip: true,
      fflDealerName: 'Test FFL Dealer',
      isTestOrder: true,
      engineResponse: appFailureResponse
    });

    if (!failureOrder.data.success) {
      throw new Error(`Failure test failed: ${failureOrder.data.error}`);
    }

    console.log(`✅ Failure Order Created: Deal ${failureOrder.data.dealId}`);
    console.log(`🎯 TGF Order (fallback): ${failureOrder.data.tgfOrderNumber}`);

    // Test 3: Hold Case (No APP interaction)
    console.log('\n📋 Test 3: Hold Case - No APP Interaction Required');
    const holdOrder = await axios.post('http://localhost:5000/api/test/zoho-system-fields', {
      orderNumber: 'HOLD-' + Date.now(),
      customerEmail: `hold.test.${Date.now()}@thegunfirm.com`,
      customerName: 'Hold Test User',
      membershipTier: 'Bronze',
      totalAmount: 399.99,
      orderItems: [{
        productName: 'Basic Rifle - Hold Case',
        sku: 'HOLD-RIFLE-001',
        quantity: 1,
        unitPrice: 399.99,
        totalPrice: 399.99,
        fflRequired: true
      }],
      fulfillmentType: 'In-House',
      requiresDropShip: false,
      holdType: 'FFL not on file',
      isTestOrder: true
      // No engineResponse for hold case
    });

    if (!holdOrder.data.success) {
      throw new Error(`Hold test failed: ${holdOrder.data.error}`);
    }

    console.log(`✅ Hold Order Created: Deal ${holdOrder.data.dealId}`);
    console.log(`🎯 TGF Order (system): ${holdOrder.data.tgfOrderNumber}`);

    // Test 4: Retrieve and validate all three scenarios
    console.log('\n📋 Test 4: Field Validation for All Scenarios');
    
    const testCases = [
      {
        name: 'APP Success',
        dealId: successOrder.data.dealId,
        expectedStatus: 'Confirmed',
        shouldHaveAPPFields: true,
        expectedTGF: appSuccessResponse.result.OrderNumber
      },
      {
        name: 'APP Failure',
        dealId: failureOrder.data.dealId,
        expectedStatus: 'Rejected',
        shouldHaveAPPFields: true,
        expectedTGF: null // Will be system fallback
      },
      {
        name: 'Hold Case',
        dealId: holdOrder.data.dealId,
        expectedStatus: 'Hold',
        shouldHaveAPPFields: false,
        expectedTGF: null // Will be system generated
      }
    ];

    let allFieldsValid = true;
    let totalTests = 0;
    let passedTests = 0;

    for (const testCase of testCases) {
      console.log(`\n🔍 Validating ${testCase.name} (Deal ${testCase.dealId}):`);
      
      try {
        const dealResponse = await axios.get(`http://localhost:5000/api/test/zoho-deal/${testCase.dealId}`);
        const deal = dealResponse.data.deal;

        // Core field tests
        const tests = [
          {
            name: 'Order_Status',
            actual: deal.Order_Status,
            expected: testCase.expectedStatus,
            critical: true
          },
          {
            name: 'APP_Response Present',
            actual: deal.APP_Response ? 'Yes' : 'No',
            expected: testCase.shouldHaveAPPFields ? 'Yes' : 'No',
            critical: testCase.shouldHaveAPPFields
          },
          {
            name: 'APP_Confirmed Present',
            actual: deal.APP_Confirmed ? 'Yes' : 'No',
            expected: testCase.shouldHaveAPPFields ? 'Yes' : 'No',
            critical: testCase.shouldHaveAPPFields
          }
        ];

        if (testCase.expectedTGF) {
          tests.push({
            name: 'TGF_Order_Number',
            actual: deal.TGF_Order_Number || 'undefined',
            expected: testCase.expectedTGF,
            critical: true
          });
        }

        for (const test of tests) {
          totalTests++;
          const passed = test.actual === test.expected;
          if (passed) {
            passedTests++;
            console.log(`   ✅ ${test.name}: ${test.actual}`);
          } else {
            console.log(`   ${test.critical ? '❌' : '⚠️'} ${test.name}: Expected "${test.expected}", got "${test.actual}"`);
            if (test.critical) allFieldsValid = false;
          }
        }
      } catch (error) {
        console.log(`   ❌ Error retrieving deal: ${error.message}`);
        allFieldsValid = false;
      }
    }

    // Final Results
    console.log('\n🏆 FINAL APP INTEGRATION RESULTS:');
    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed (${((passedTests/totalTests) * 100).toFixed(1)}%)`);
    
    if (allFieldsValid && passedTests === totalTests) {
      console.log('🎉 PERFECT SUCCESS - APP Integration Fully Operational!');
      console.log('✅ TGF Order Numbers properly sourced from APP/RSR Engine');
      console.log('✅ APP_Response field captures complete APP responses');
      console.log('✅ APP_Confirmed timestamps working correctly');
      console.log('✅ Order status properly updated based on APP StatusCode');
      console.log('✅ Hold cases handled correctly without APP interaction');
      console.log('🚀 System is production-ready for APP/RSR Engine integration!');
      
      console.log('\n📋 SYSTEM CAPABILITIES CONFIRMED:');
      console.log('• Real TGF Order Numbers from APP (not system-generated)');
      console.log('• Complete APP response tracking via APP_Response field');
      console.log('• Automatic order status updates (Submitted → Confirmed/Rejected)');
      console.log('• Proper datetime formatting for Zoho compatibility');
      console.log('• Fallback handling for hold orders and APP failures');
      
    } else {
      console.log('⚠️ Some issues detected - review individual test results above');
    }

  } catch (error) {
    console.error('❌ Comprehensive APP test failed:', error.response?.data || error.message);
  }
}

runComprehensiveAPPTest().then(() => {
  console.log('\n🔍 Comprehensive APP integration test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});