const axios = require('axios');

console.log('🏆 Final Zoho Integration Verification');
console.log('📊 Testing complete end-to-end field mapping and retrieval');

async function finalVerification() {
  try {
    // Create a new deal with all fields
    console.log('\n📋 Step 1: Creating complete test deal...');
    const createResponse = await axios.post('http://localhost:5000/api/test/zoho-system-fields', {
      orderNumber: 'FINAL-VERIFY-' + Date.now(),
      customerEmail: `final.verify.${Date.now()}@thegunfirm.com`,
      customerName: 'Final Verification User',
      membershipTier: 'Platinum Monthly',
      totalAmount: 1299.99,
      orderItems: [{
        productName: 'Final Verification Rifle',
        sku: 'FINAL-VERIFY',
        quantity: 1,
        unitPrice: 1299.99,
        totalPrice: 1299.99,
        fflRequired: true
      }],
      fulfillmentType: 'Drop-Ship',
      requiresDropShip: true,
      holdType: 'FFL not on file',
      fflDealerName: 'Final Verification FFL',
      isTestOrder: true
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

    // Step 2: Test deal retrieval to verify fields are actually set
    console.log('\n📋 Step 2: Retrieving deal to verify field mapping...');
    const retrieveResponse = await axios.get(`http://localhost:5000/api/test/zoho-deal/${dealId}`);
    
    if (!retrieveResponse.data.success) {
      throw new Error(`Deal retrieval failed: ${retrieveResponse.data.error}`);
    }

    const dealData = retrieveResponse.data.deal;
    console.log(`✅ Deal retrieved successfully`);

    // Step 3: Verify all 10 system fields are present and correct
    console.log('\n📊 Step 3: Validating all system fields...');
    
    const expectedFields = {
      'TGF_Order_Number': tgfOrderNumber,
      'Fulfillment_Type': 'Drop-Ship',
      'Flow': 'TGF',
      'Order_Status': 'Hold',
      'Consignee': 'FFL',
      'Deal_Fulfillment_Summary': 'Delivered to TGF',
      'Ordering_Account': '99901',
      'Hold_Type': 'FFL not on file',
      'APP_Status': 'Submitted',
      'Submitted': true // Just check presence for datetime
    };

    let fieldsValid = 0;
    let totalFields = Object.keys(expectedFields).length;

    for (const [fieldName, expectedValue] of Object.entries(expectedFields)) {
      const actualValue = dealData[fieldName];
      
      if (fieldName === 'Submitted') {
        // For datetime fields, just check presence and format
        if (actualValue && typeof actualValue === 'string' && actualValue.includes('T')) {
          console.log(`   ✅ ${fieldName}: ${actualValue} (Valid datetime format)`);
          fieldsValid++;
        } else {
          console.log(`   ❌ ${fieldName}: Missing or invalid format`);
        }
      } else {
        if (actualValue === expectedValue) {
          console.log(`   ✅ ${fieldName}: ${actualValue}`);
          fieldsValid++;
        } else {
          console.log(`   ❌ ${fieldName}: Expected "${expectedValue}", got "${actualValue}"`);
        }
      }
    }

    // Final results
    console.log('\n🏆 FINAL VERIFICATION RESULTS:');
    console.log(`   System Fields Valid: ${fieldsValid}/${totalFields}`);
    console.log(`   Success Rate: ${((fieldsValid/totalFields) * 100).toFixed(1)}%`);
    
    if (fieldsValid === totalFields) {
      console.log('   🎉 PERFECT SCORE - All system fields working correctly!');
      console.log('   🚀 Zoho individual field mapping is production-ready!');
      console.log('   ✅ RESOLVED: JSON dumping issue completely fixed');
    } else {
      console.log('   ⚠️  Some fields need attention');
    }

  } catch (error) {
    console.error('❌ Final verification failed:', error.response?.data || error.message);
  }
}

finalVerification().then(() => {
  console.log('\n🔍 Final verification completed');
  process.exit(0);
}).catch(error => {
  console.error('Final verification error:', error);
  process.exit(1);
});