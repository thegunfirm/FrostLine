/**
 * Verify Actual Zoho Integration
 * Create a new test deal and immediately check the fields that were populated
 */

const axios = require('axios');

async function verifyZohoIntegration() {
  console.log('🔍 Verifying actual Zoho CRM field population...\n');
  
  try {
    // 1. Create a new test deal with system fields
    console.log('🔬 Step 1: Creating test deal with system fields...');
    
    const testOrderData = {
      orderNumber: `VERIFY-${Date.now()}`,
      customerEmail: 'field.test@thegunfirm.com',
      customerName: 'Field Test User',
      membershipTier: 'Gold Monthly',
      totalAmount: 899.99,
      orderItems: [
        {
          productName: 'Test Handgun for Field Verification',
          sku: 'TEST-HG-001',
          quantity: 1,
          unitPrice: 899.99,
          totalPrice: 899.99,
          fflRequired: true
        }
      ],
      fulfillmentType: 'Drop-Ship',
      requiresDropShip: true,
      holdType: 'FFL not on file',
      fflDealerName: 'Test FFL Dealer'
    };
    
    const createResponse = await axios.post('http://localhost:5000/api/test/zoho-system-fields', testOrderData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📥 Create Response:', JSON.stringify(createResponse.data, null, 2));
    
    if (!createResponse.data.success) {
      console.error('❌ Failed to create test deal:', createResponse.data.error);
      return;
    }
    
    const dealId = createResponse.data.dealId;
    const tgfOrderNumber = createResponse.data.tgfOrderNumber;
    console.log(`✅ Test deal created successfully!`);
    console.log(`📋 Deal ID: ${dealId}`);
    console.log(`🔢 TGF Order Number: ${tgfOrderNumber}\n`);
    
    // 2. Wait a moment for Zoho to process
    console.log('⏳ Waiting 3 seconds for Zoho to process the deal...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Retrieve the deal to check field population
    console.log('🔍 Step 2: Retrieving deal to verify field population...');
    
    const retrieveResponse = await axios.get(`http://localhost:5000/api/test/zoho-deal/${dealId}`, {
      timeout: 30000
    });
    
    console.log('📥 Retrieve Response:', JSON.stringify(retrieveResponse.data, null, 2));
    
    if (!retrieveResponse.data.success) {
      console.error('❌ Failed to retrieve deal:', retrieveResponse.data.error);
      return;
    }
    
    const deal = retrieveResponse.data.deal;
    
    console.log('\n🔍 Checking individual system fields in actual Zoho deal:');
    
    const systemFields = [
      'TGF_Order_Number',
      'Fulfillment_Type',
      'Flow',
      'Order_Status',
      'Consignee',
      'Deal_Fulfillment_Summary',
      'Ordering_Account',
      'Hold_Type',
      'APP_Status',
      'Submitted'
    ];
    
    let fieldsPresent = 0;
    let fieldsEmpty = 0;
    
    systemFields.forEach(field => {
      const value = deal[field];
      if (value !== undefined && value !== null && value !== '') {
        console.log(`   ✅ ${field}: ${value}`);
        fieldsPresent++;
      } else {
        console.log(`   ❌ ${field}: ${value === undefined ? 'UNDEFINED' : value === null ? 'NULL' : 'EMPTY'}`);
        fieldsEmpty++;
      }
    });
    
    // Check if data is in Description instead (old behavior)
    const description = deal.Description;
    if (description) {
      console.log(`\n📝 Description field content:`);
      console.log(`   ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`);
      
      try {
        JSON.parse(description);
        console.log('   ⚠️  Description contains JSON - OLD BEHAVIOR detected!');
      } catch (e) {
        console.log('   ✅ Description is plain text - not JSON dumping');
      }
    }
    
    console.log(`\n📊 FINAL VERIFICATION RESULTS:`);
    console.log(`   Deal ID: ${dealId}`);
    console.log(`   TGF Order: ${tgfOrderNumber}`);
    console.log(`   Fields Present: ${fieldsPresent}/${systemFields.length}`);
    console.log(`   Fields Empty: ${fieldsEmpty}/${systemFields.length}`);
    
    if (fieldsPresent === 0) {
      console.log('\n❌ CRITICAL FAILURE: NO system fields populated in Zoho CRM');
      console.log('   Despite successful API calls, fields are not being saved');
      console.log('   This indicates a fundamental field mapping or API issue');
    } else if (fieldsPresent === systemFields.length) {
      console.log('\n🎉 COMPLETE SUCCESS: All system fields properly populated!');
      console.log('   The field mapping fix is working correctly');
    } else {
      console.log(`\n⚠️  PARTIAL SUCCESS: ${fieldsPresent} fields populated, ${fieldsEmpty} missing`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run verification
verifyZohoIntegration();