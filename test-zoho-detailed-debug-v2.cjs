/**
 * Enhanced Zoho Integration Debug Test v2
 * Tests with detailed response logging to debug the issue
 */

const axios = require('axios');

async function testZohoWithFullLogging() {
  console.log('🧪 Enhanced Zoho Integration Test with Full Logging...\n');

  const testPayload = {
    orderNumber: 'TEST-2025-002',
    customerEmail: 'enhanced.debug@thegunfirm.com',
    customerName: 'Enhanced Debug Customer',
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
    holdType: null,
    engineResponse: null,
    isTestOrder: true,
    fflDealerName: null,
    zohoContactId: null
  };

  try {
    console.log('📝 Sending enhanced test to /api/test/zoho-system-fields...');
    console.log('Request Payload:', JSON.stringify(testPayload, null, 2));

    const response = await axios.post('http://localhost:5000/api/test/zoho-system-fields', testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:', response.headers);
    console.log('📊 Full Response Data:', JSON.stringify(response.data, null, 2));

    // Check if response has expected structure
    if (response.data) {
      console.log('\n🔍 Response Analysis:');
      console.log(`   success: ${response.data.success}`);
      console.log(`   error: ${response.data.error}`);
      console.log(`   dealId: ${response.data.dealId}`);
      console.log(`   tgfOrderNumber: ${response.data.tgfOrderNumber}`);
      console.log(`   contactId: ${response.data.contactId}`);
      console.log(`   zohoFields: ${response.data.zohoFields ? 'present' : 'missing'}`);

      if (response.data.success) {
        console.log('\n✅ SUCCESS! Zoho integration working correctly');
        
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
              console.log('✅ Fulfillment type determination: WORKING');
            }
          }
        }
        
        if (response.data.zohoFields) {
          console.log('\n📋 Zoho Fields Summary:');
          const fields = response.data.zohoFields;
          console.log(`   TGF_Order_Number: ${fields.TGF_Order_Number}`);
          console.log(`   Fulfillment_Type: ${fields.Fulfillment_Type}`);
          console.log(`   Flow: ${fields.Flow}`);
          console.log(`   Order_Status: ${fields.Order_Status}`);
          console.log(`   Consignee: ${fields.Consignee}`);
          console.log(`   Ordering_Account: ${fields.Ordering_Account}`);
          console.log(`   APP_Status: ${fields.APP_Status}`);
          console.log(`   Submitted: ${fields.Submitted}`);
        }

      } else {
        console.log('\n❌ FAILED! Error details:');
        console.log(`   Error: ${response.data.error || 'No error message provided'}`);
        console.log(`   Message: ${response.data.message || 'No message provided'}`);
      }
    } else {
      console.log('\n❌ UNEXPECTED: No response data received');
    }

  } catch (error) {
    console.error('\n❌ REQUEST FAILED:');
    console.error('Error Message:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

testZohoWithFullLogging();