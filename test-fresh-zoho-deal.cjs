/**
 * Fresh Zoho Deal Test - Create a new deal with unique test user
 */

const axios = require('axios');

async function createFreshZohoDeal() {
  console.log('🆕 Creating Fresh Zoho Deal Test');
  console.log('🎯 Testing complete field population with unique user\n');

  try {
    const timestamp = Date.now();
    const testPayload = {
      orderNumber: `FRESH-${timestamp}`,
      customerEmail: `fresh.test.${timestamp}@thegunfirm.com`,
      customerName: `Fresh Test User ${timestamp}`,
      membershipTier: 'Gold Monthly',
      totalAmount: 899.99,
      orderItems: [{
        productName: 'Fresh Test Rifle',
        sku: `FRESH-${timestamp}`,
        quantity: 2,
        unitPrice: 449.99,
        totalPrice: 899.98,
        fflRequired: true
      }],
      fulfillmentType: 'Drop-Ship',
      requiresDropShip: true,
      holdType: 'FFL not on file',
      fflDealerName: 'Fresh Test FFL Dealer',
      isTestOrder: true
    };

    console.log('📋 Test Order Details:');
    console.log(`   Customer: ${testPayload.customerName}`);
    console.log(`   Email: ${testPayload.customerEmail}`);
    console.log(`   Order: ${testPayload.orderNumber}`);
    console.log(`   Tier: ${testPayload.membershipTier}`);
    console.log(`   Total: $${testPayload.totalAmount}`);
    console.log(`   Fulfillment: ${testPayload.fulfillmentType}`);
    console.log('');

    console.log('🚀 Submitting to Zoho CRM...');
    const response = await axios.post('http://localhost:5000/api/test/zoho-system-fields', testPayload);

    if (response.data.success) {
      const { dealId, contactId, tgfOrderNumber, zohoFields } = response.data;
      
      console.log('\n🎉 SUCCESS! Fresh Deal Created:');
      console.log(`   Deal ID: ${dealId}`);
      console.log(`   Contact ID: ${contactId}`);
      console.log(`   TGF Order: ${tgfOrderNumber}`);
      
      console.log('\n📊 All System Fields Populated:');
      Object.entries(zohoFields).forEach(([field, value]) => {
        console.log(`   ✅ ${field}: ${value}`);
      });

      // Validate completeness
      const expectedFields = [
        'TGF_Order_Number', 'Fulfillment_Type', 'Flow', 'Order_Status',
        'Consignee', 'Deal_Fulfillment_Summary', 'Ordering_Account',
        'Hold_Type', 'APP_Status', 'Submitted'
      ];

      const missingFields = expectedFields.filter(field => 
        !zohoFields.hasOwnProperty(field) || zohoFields[field] === null
      );

      console.log('\n🔍 Field Validation Results:');
      console.log(`   Total Fields: ${Object.keys(zohoFields).length}/10`);
      console.log(`   Missing Fields: ${missingFields.length === 0 ? 'None' : missingFields.join(', ')}`);
      
      if (missingFields.length === 0) {
        console.log('\n🏆 PERFECT SCORE: All system fields successfully populated!');
        console.log('🚀 Fresh deal demonstrates production-ready field mapping');
      }

    } else {
      console.error('❌ Failed to create fresh deal:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the fresh test
createFreshZohoDeal();