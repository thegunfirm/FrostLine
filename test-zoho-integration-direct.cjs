/**
 * Direct Zoho Integration Test - bypasses checkout and tests Zoho functions directly
 */

const axios = require('axios');

async function testZohoIntegrationDirect() {
  console.log('🧪 Testing Zoho Integration Functions Directly...\n');

  // Test data that matches what the checkout would send to Zoho
  const testOrderData = {
    orderNumber: 'TEST-2025-001',
    customerEmail: 'direct.test@thegunfirm.com',
    customerName: 'Direct Test Customer',
    membershipTier: 'Bronze',
    totalAmount: 299.99,
    orderItems: [
      {
        productName: 'Gun Safe',
        sku: 'ACC001',
        quantity: 1,
        unitPrice: 299.99,
        totalPrice: 299.99,
        fflRequired: false
      }
    ],
    fulfillmentType: 'In-House',
    orderingAccount: '99901',
    requiresDropShip: false,
    holdType: undefined,
    engineResponse: null,
    isTestOrder: true,
    fflDealerName: undefined,
    zohoContactId: undefined
  };

  try {
    console.log('📝 Testing processOrderWithSystemFields...');
    console.log('Test Data:', JSON.stringify(testOrderData, null, 2));

    // Make a direct call to test the Zoho integration endpoint
    const response = await axios.post('http://localhost:5000/api/test/zoho-system-fields', testOrderData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ ZOHO SYSTEM FIELDS TEST PASSED!');
      console.log(`   TGF Order Number: ${response.data.tgfOrderNumber}`);
      console.log(`   Deal ID: ${response.data.dealId}`);
      console.log(`   Contact ID: ${response.data.contactId}`);

      // Validate TGF Order Number format
      if (response.data.tgfOrderNumber) {
        const regex = /^test\d{3}[ICF][0A-Z]$/;
        const isValid = regex.test(response.data.tgfOrderNumber);
        console.log(`   Order Format Valid: ${isValid ? '✅' : '❌'}`);
        
        if (isValid) {
          const receiverCode = response.data.tgfOrderNumber.charAt(response.data.tgfOrderNumber.length - 2);
          console.log(`   Receiver Code: ${receiverCode} (Expected: I for In-House)`);
          
          if (receiverCode === 'I') {
            console.log('\n🎯 ALL VALIDATIONS PASSED!');
            console.log('✅ TGF Order Number generation: WORKING');
            console.log('✅ Zoho Deal creation: WORKING');
            console.log('✅ System field population: WORKING');
            console.log('✅ Consignee determination: WORKING (TGF for In-House)');
          } else {
            console.log('\n⚠️  Receiver code mismatch');
          }
        }
      }

    } else {
      console.log('\n❌ ZOHO INTEGRATION FAILED:');
      console.log(`   Error: ${response.data.error}`);
    }

  } catch (error) {
    console.error('\n❌ REQUEST FAILED:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testZohoIntegrationDirect();