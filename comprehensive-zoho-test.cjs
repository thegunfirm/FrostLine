/**
 * Comprehensive Zoho Fields Mapping Test
 * Tests multiple scenarios to verify individual field mapping is working correctly
 */

const axios = require('axios');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runComprehensiveTest() {
  console.log('🚀 Running Comprehensive Zoho Fields Mapping Test\n');

  const testCases = [
    {
      name: 'Drop-Ship FFL Hold Order',
      payload: {
        orderNumber: 'COMP-TEST-001',
        customerEmail: 'dropship@test.com',
        customerName: 'Drop Ship User',
        membershipTier: 'Bronze',
        totalAmount: 599.99,
        orderItems: [{
          productName: 'Drop-Ship Rifle',
          sku: 'DROP001',
          quantity: 1,
          unitPrice: 599.99,
          totalPrice: 599.99,
          fflRequired: true
        }],
        fulfillmentType: 'Drop-Ship',
        requiresDropShip: true,
        holdType: 'FFL not on file',
        fflDealerName: 'Drop-Ship FFL'
      },
      expectedFields: {
        Fulfillment_Type: 'Drop-Ship',
        Order_Status: 'Hold',
        Consignee: 'FFL',
        Hold_Type: 'FFL not on file',
        Ordering_Account: '99901'
      }
    },
    {
      name: 'In-House Gun Count Hold',
      payload: {
        orderNumber: 'COMP-TEST-002',
        customerEmail: 'inhouse@test.com',
        customerName: 'In House User',
        membershipTier: 'Gold Monthly',
        totalAmount: 1199.99,
        orderItems: [{
          productName: 'In-House Rifle',
          sku: 'HOUSE001',
          quantity: 1,
          unitPrice: 1199.99,
          totalPrice: 1199.99,
          fflRequired: true
        }],
        fulfillmentType: 'In-House',
        requiresDropShip: false,
        holdType: 'Gun Count Rule',
        fflDealerName: 'In-House FFL'
      },
      expectedFields: {
        Fulfillment_Type: 'In-House',
        Order_Status: 'Hold',
        Consignee: 'TGF',
        Hold_Type: 'Gun Count Rule',
        Ordering_Account: '99901'
      }
    },
    {
      name: 'No Hold Non-FFL Order',
      payload: {
        orderNumber: 'COMP-TEST-003',
        customerEmail: 'nohold@test.com',
        customerName: 'No Hold User',
        membershipTier: 'Platinum Monthly',
        totalAmount: 49.99,
        orderItems: [{
          productName: 'Scope Mount',
          sku: 'MOUNT001',
          quantity: 1,
          unitPrice: 49.99,
          totalPrice: 49.99,
          fflRequired: false
        }],
        fulfillmentType: 'In-House',
        requiresDropShip: false,
        fflDealerName: null
      },
      expectedFields: {
        Fulfillment_Type: 'In-House',
        Order_Status: 'Submitted',
        Consignee: 'TGF', // In-House orders ship to TGF first (correct behavior)
        Hold_Type: null,
        Ordering_Account: '99901'
      }
    }
  ];

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 Test ${i + 1}: ${testCase.name}`);
    
    try {
      const response = await axios.post('http://localhost:5000/api/test/zoho-system-fields', testCase.payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data.success) {
        const fields = response.data.zohoFields;
        let passed = 0;
        let total = 0;

        console.log(`   ✅ Deal Created: ${response.data.dealId}`);
        console.log(`   📄 TGF Order: ${response.data.tgfOrderNumber}`);

        // Verify expected fields
        for (const [fieldName, expectedValue] of Object.entries(testCase.expectedFields)) {
          total++;
          const actualValue = fields[fieldName];
          
          if (expectedValue === null) {
            if (actualValue === null || actualValue === undefined) {
              console.log(`   ✅ ${fieldName}: NULL (as expected)`);
              passed++;
            } else {
              console.log(`   ❌ ${fieldName}: Expected NULL, got "${actualValue}"`);
            }
          } else {
            if (actualValue === expectedValue) {
              console.log(`   ✅ ${fieldName}: ${actualValue}`);
              passed++;
            } else {
              console.log(`   ❌ ${fieldName}: Expected "${expectedValue}", got "${actualValue}"`);
            }
          }
        }

        // Verify common fields are present
        const commonFields = ['TGF_Order_Number', 'Flow', 'APP_Status', 'Submitted'];
        commonFields.forEach(field => {
          total++;
          if (fields[field]) {
            console.log(`   ✅ ${field}: ${fields[field]}`);
            passed++;
          } else {
            console.log(`   ❌ ${field}: MISSING`);
          }
        });

        results.push({
          test: testCase.name,
          passed: passed,
          total: total,
          success: passed === total,
          dealId: response.data.dealId
        });

        console.log(`   📊 Score: ${passed}/${total} fields correct\n`);

      } else {
        console.log(`   ❌ Test failed: ${response.data.error}\n`);
        results.push({
          test: testCase.name,
          passed: 0,
          total: 0,
          success: false,
          error: response.data.error
        });
      }

      // Wait between tests to avoid overwhelming the API
      if (i < testCases.length - 1) {
        await sleep(2000);
      }

    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}\n`);
      results.push({
        test: testCase.name,
        passed: 0,
        total: 0,
        success: false,
        error: error.message
      });
    }
  }

  // Final Results Summary
  console.log('📊 COMPREHENSIVE TEST RESULTS:');
  console.log('═'.repeat(50));

  let totalPassed = 0;
  let totalTests = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.test}`);
    if (result.dealId) {
      console.log(`      Deal ID: ${result.dealId}`);
    }
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
    if (result.total > 0) {
      console.log(`      Score: ${result.passed}/${result.total} fields`);
    }
    
    if (result.success) totalPassed++;
    totalTests++;
  });

  console.log('═'.repeat(50));
  console.log(`🎯 OVERALL RESULT: ${totalPassed}/${totalTests} tests passed`);

  if (totalPassed === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Zoho fields mapping is working correctly');
    console.log('✅ Individual system fields are properly mapped to Zoho CRM');
    console.log('✅ No more data dumping into Description field');
    console.log('✅ System handles different order types correctly');
  } else {
    console.log('⚠️  Some tests failed - review the individual field mappings');
  }
}

// Run the comprehensive test
runComprehensiveTest().catch(error => {
  console.error('❌ Test suite failed:', error);
});