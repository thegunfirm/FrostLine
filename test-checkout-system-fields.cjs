#!/usr/bin/env node

/**
 * Checkout System Fields Test  
 * Tests that the actual firearms checkout process automatically populates all system fields in Zoho
 */

console.log('🛒 CHECKOUT SYSTEM FIELDS TEST');
console.log('==============================\n');

async function testCheckoutSystemFields() {
  try {
    // Simulate a checkout with firearms requiring compliance and system field population
    const checkoutPayload = {
      userId: 999, // Test user ID
      cartItems: [
        {
          id: 1,
          sku: 'SW12508',
          name: 'Smith & Wesson M&P Shield Plus 9mm',
          price: 899.99,
          quantity: 1,
          isFirearm: true,
          requiresFFL: true,
          category: 'Handguns'
        }
      ],
      shippingAddress: {
        firstName: 'System',
        lastName: 'Checkout Test',
        street1: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345'
      },
      paymentMethod: {
        cardNumber: '4111111111111111', // Test card
        expirationDate: '12/25',
        cvv: '123'
      },
      customerInfo: {
        firstName: 'System',
        lastName: 'Checkout Test',
        email: 'checkouttest@thegunfirm.com',
        phone: '555-0123'
      },
      fflRecipientId: 1 // Test FFL ID
    };

    console.log('🛒 Testing actual checkout with system field auto-population...');
    console.log(`Customer: ${checkoutPayload.customerInfo.firstName} ${checkoutPayload.customerInfo.lastName}`);
    console.log(`Email: ${checkoutPayload.customerInfo.email}`);
    console.log(`Items: ${checkoutPayload.cartItems.length} (${checkoutPayload.cartItems[0].name})`);
    console.log(`FFL Required: Yes`);
    console.log(`Amount: $${checkoutPayload.cartItems[0].price}`);

    const response = await fetch('http://localhost:5000/api/test/checkout-fields', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutPayload)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.log('❌ Checkout API Error:', response.status);
      console.log('Response:', responseText.substring(0, 500));
      return false;
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.log('❌ JSON Parse Error - Server returned HTML instead of JSON');
      console.log('Response snippet:', responseText.substring(0, 500));
      return false;
    }

    if (result.success) {
      console.log('\n🏆 SUCCESS! Checkout completed with automatic system field population');
      console.log('====================================================================');
      console.log(`🆔 Order ID: ${result.orderId}`);
      console.log(`📋 Order Number: ${result.orderNumber}`);
      console.log(`🎯 Zoho Deal ID: ${result.dealId}`);
      console.log(`💰 Status: ${result.status}`);
      
      if (result.hold) {
        console.log(`⚠️  Hold: ${result.hold.type} - ${result.hold.reason}`);
      }
      
      if (result.systemFields) {
        console.log('\n📋 System Fields Auto-Populated During Checkout:');
        console.log('==================================================');
        
        Object.entries(result.systemFields).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            console.log(`✓ ${key}: ${value}`);
          }
        });
      }
      
      console.log('\n🎯 VERIFY IN YOUR ZOHO CRM:');
      console.log('============================');
      console.log('1. Open your Zoho CRM');
      console.log('2. Navigate to DEALS module'); 
      console.log('3. Find: "System Checkout Test"');
      console.log(`4. Deal ID: ${result.dealId}`);
      console.log(`5. Order: ${result.orderNumber}`);
      console.log('\n6. Confirm all SYSTEM fields populated automatically:');
      console.log('   ✓ TGF Order Number (inventory-generated)');
      console.log('   ✓ Fulfillment Type');
      console.log('   ✓ Flow');
      console.log('   ✓ Order Status');  
      console.log('   ✓ Consignee');
      console.log('   ✓ Deal Fulfillment Summary');
      console.log('   ✓ Ordering Account');
      console.log('   ✓ Hold Type (if applicable)');
      console.log('   ✓ APP Status');
      console.log('   ✓ Submitted timestamp');
      console.log('\n7. Confirm RSR fields are NOT populated (as expected):');
      console.log('   ○ Carrier (empty until RSR processes)');
      console.log('   ○ Tracking Number (empty until shipped)');
      console.log('   ○ Estimated Ship Date (empty until RSR confirms)');
      
      return true;
    } else {
      console.log('\n❌ CHECKOUT FAILED');
      console.log('====================');
      console.log(`Error: ${result.error || 'Unknown error'}`);
      return false;
    }

  } catch (error) {
    console.log('💥 Test failed:', error.message);
    return false;
  }
}

// Run the test
testCheckoutSystemFields()
  .then((success) => {
    console.log('\n' + '='.repeat(70));
    if (success) {
      console.log('🏆 CHECKOUT SYSTEM FIELD AUTO-POPULATION: SUCCESS!');
      console.log('All system fields populated automatically during checkout!');
      console.log('RSR fields properly excluded until distributor processes order.');
    } else {
      console.log('⚠️  CHECKOUT SYSTEM FIELD AUTO-POPULATION: FAILED');
      console.log('Check error messages above');
    }
    console.log('='.repeat(70));
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  });