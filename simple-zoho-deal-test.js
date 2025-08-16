#!/usr/bin/env node

/**
 * Simple Zoho Deal Test - Using Node.js fetch to test the integration endpoint
 */

async function testZohoDeals() {
  console.log('\n🎯 TESTING ZOHO DEAL CREATION');
  console.log('=============================');

  const testData = {
    customerEmail: 'test.customer@thegunfirm.com',
    customerName: 'Test Customer',
    customerTier: 'Bronze', 
    totalAmount: 619.99,
    items: [{
      name: 'GLOCK 19 Gen 5 9mm Luger',
      sku: 'PI1950203',
      price: 619.99,
      quantity: 1,
      isFirearm: true
    }],
    fulfillmentType: 'Drop-Ship',
    fflDealer: {
      businessName: 'BACK ACRE GUN WORKS',
      licenseNumber: '1-59-017-07-6F-13700'
    }
  };

  try {
    console.log('📦 Creating test deal in Zoho CRM...');
    console.log(`   Customer: ${testData.customerName}`);
    console.log(`   Email: ${testData.customerEmail}`);
    console.log(`   Amount: $${testData.totalAmount}`);
    console.log(`   Product: ${testData.items[0].name}`);

    const response = await fetch('http://localhost:5000/api/test/order-zoho-integration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('\n✅ DEAL CREATED SUCCESSFULLY!');
      console.log(`🆔 Deal ID: ${result.dealId}`);
      console.log(`👤 Contact ID: ${result.contactId}`);
      console.log(`📋 Message: ${result.message}`);
      
      console.log('\n🎯 CHECK YOUR ZOHO CRM NOW!');
      console.log('The deal should be visible in the Deals module.');
      console.log('Look for RSR integration fields populated with order data.');
      
      return result;
    } else {
      console.log('\n❌ DEAL CREATION FAILED');
      console.log(`Error: ${result.error || 'Unknown error'}`);
      console.log(`Message: ${result.message || 'No message'}`);
      return null;
    }

  } catch (error) {
    console.error('\n💥 REQUEST FAILED:', error.message);
    return null;
  }
}

// Now let's also check if the deal appears in Zoho
async function checkZohoDeals(email) {
  try {
    console.log(`\n🔍 Checking existing deals for ${email}...`);
    
    const response = await fetch(`http://localhost:5000/api/test/zoho-deals/${email}`);
    const result = await response.json();

    if (response.ok) {
      console.log(`\n📊 FOUND ${result.total} DEALS:`);
      if (result.deals && result.deals.length > 0) {
        result.deals.forEach((deal, index) => {
          console.log(`   ${index + 1}. ${deal.Deal_Name} - $${deal.Amount} (${deal.Stage})`);
        });
      } else {
        console.log('   No deals found for this contact.');
      }
      return result;
    } else {
      console.log(`❌ Error checking deals: ${result.error}`);
      return null;
    }
  } catch (error) {
    console.error(`💥 Error checking deals: ${error.message}`);
    return null;
  }
}

// Run the test
async function runFullTest() {
  console.log('🚀 Starting comprehensive Zoho integration test...');
  
  // First check existing deals
  await checkZohoDeals('test.customer@thegunfirm.com');
  
  // Create new deal
  const createResult = await testZohoDeals();
  
  if (createResult) {
    // Wait a moment for the deal to be created
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check deals again to see the new one
    console.log('\n🔄 Rechecking deals after creation...');
    await checkZohoDeals('test.customer@thegunfirm.com');
  }
  
  console.log('\n🏁 Test completed');
}

runFullTest().catch(console.error);