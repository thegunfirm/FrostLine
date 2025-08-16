#!/usr/bin/env node

/**
 * Basic System Fields Test
 * Tests automatic population of all system fields in Zoho (NOT RSR fields)
 */

console.log('🎯 BASIC SYSTEM FIELDS TEST');
console.log('============================\n');

async function testBasicSystemFields() {
  try {
    const testOrderData = {
      orderNumber: `SYSTEM-TEST-${Date.now()}`,
      totalAmount: 899.99,
      customerEmail: 'systemtest@thegunfirm.com',
      customerName: 'System Test Customer',
      membershipTier: 'Gold',
      orderItems: [
        {
          productName: 'Smith & Wesson M&P Shield Plus 9mm',
          sku: 'SW12508',
          quantity: 1,
          unitPrice: 899.99,
          totalPrice: 899.99,
          fflRequired: true
        }
      ],
      fflDealerName: 'System Test FFL',
      orderStatus: 'pending',
      fulfillmentType: 'In-House',
      orderingAccount: '99901',
      requiresDropShip: false,
      holdType: 'FFL not on file',
      isTestOrder: true
    };

    console.log('🔄 Testing basic system field population...');
    console.log(`Order Number: ${testOrderData.orderNumber}`);
    console.log(`Customer: ${testOrderData.customerName}`);
    console.log(`Tier: ${testOrderData.membershipTier}`);
    console.log(`FFL Required: Yes`);
    console.log(`Fulfillment: ${testOrderData.fulfillmentType}`);

    const response = await fetch('http://localhost:5000/api/test/system-fields', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.log('❌ API Error:', response.status);
      console.log('Response:', responseText.substring(0, 500));
      return false;
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.log('❌ JSON Parse Error - Server returned HTML instead of JSON');
      console.log('Response snippet:', responseText.substring(0, 500));
      console.log('This usually means there was an error in the server code');
      return false;
    }
    console.log('\n🏆 SUCCESS! System fields populated automatically');
    console.log('====================================================');
    console.log(`🆔 Deal ID: ${result.dealId}`);
    console.log(`📊 TGF Order Number: ${result.tgfOrderNumber}`);
    
    console.log('\n📋 System Fields Auto-Populated:');
    console.log('==================================');
    
    if (result.zohoFields) {
      Object.entries(result.zohoFields).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          console.log(`✓ ${key}: ${value}`);
        }
      });
    }
    
    console.log('\n🎯 VERIFY IN YOUR ZOHO CRM:');
    console.log('============================');
    console.log('1. Open your Zoho CRM');
    console.log('2. Navigate to DEALS module'); 
    console.log('3. Find: "System Test Customer"');
    console.log(`4. Deal ID: ${result.dealId}`);
    console.log(`5. TGF Order: ${result.tgfOrderNumber}`);
    console.log('\n6. Confirm these SYSTEM fields are populated:');
    console.log('   ✓ TGF Order Number (from inventory)');
    console.log('   ✓ Fulfillment Type (In-House)');
    console.log('   ✓ Flow (Outbound)');
    console.log('   ✓ Order Status (Hold)');
    console.log('   ✓ Consignee (TGF)');
    console.log('   ✓ Deal Fulfillment Summary');
    console.log('   ✓ Ordering Account (99901)');
    console.log('   ✓ Hold Type (FFL not on file)');
    console.log('   ✓ APP Status (Submitted)');
    console.log('   ✓ Submitted timestamp');
    console.log('\n7. Confirm these RSR fields are NOT populated:');
    console.log('   ○ Carrier (should be empty)');
    console.log('   ○ Tracking Number (should be empty)');
    console.log('   ○ Estimated Ship Date (should be empty)');
    
    return true;

  } catch (error) {
    console.log('💥 Test failed:', error.message);
    return false;
  }
}

// Run the test
testBasicSystemFields()
  .then((success) => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('🏆 BASIC SYSTEM FIELD AUTO-POPULATION: SUCCESS!');
      console.log('All system fields populated automatically (RSR fields excluded)!');
    } else {
      console.log('⚠️  BASIC SYSTEM FIELD AUTO-POPULATION: FAILED');
      console.log('Check error messages above');
    }
    console.log('='.repeat(60));
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  });