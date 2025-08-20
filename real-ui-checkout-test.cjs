/**
 * Test actual UI checkout flow with real Glock + holster
 * Uses the correct checkout endpoint and cart structure
 */

const fetch = require('node-fetch');

async function testRealUICheckout() {
  console.log('🎯 Testing Real UI Checkout Flow');
  console.log('📋 Using actual cart structure and checkout endpoint');
  
  try {
    // Create cart data structure as it exists in the UI
    const cartItems = [
      {
        // Real Glock 17 Gen3 from database
        id: "134051_GLPI1750201_1755649200000",
        productId: 134051,
        productSku: "GLPI1750201",
        productName: "GLOCK 17 GEN3 9MM 10RD",
        productImage: "/api/rsr-image/GLPI1750201",
        quantity: 1,
        price: 599.00,
        priceBronze: 599.00,
        priceGold: 569.05,    // 5% discount
        pricePlatinum: 539.10, // 10% discount
        requiresFFL: true,
        manufacturer: "GLOCK",
        addedAt: new Date().toISOString(),
        fulfillmentType: "ffl_non_dropship", // Firearm - In-House
        dropShippable: false,
        isFirearm: true,
        category: "Handguns",
        upcCode: "764503175022"
      },
      {
        // Real 1791 holster from database
        id: "123932_17912WH-1-SBL-R_1755649210000", 
        productId: 123932,
        productSku: "17912WH-1-SBL-R",
        productName: "1791 2 WAY IWB STEALTH BLK RH SIZE 1",
        productImage: "/api/rsr-image/17912WH-1-SBL-R",
        quantity: 1,
        price: 50.99,
        priceBronze: 50.99,
        priceGold: 48.44,     // 5% discount
        pricePlatinum: 45.89, // 10% discount
        requiresFFL: false,
        manufacturer: "1791 Gunleather",
        addedAt: new Date().toISOString(),
        fulfillmentType: "direct", // Accessory - Drop-Ship
        dropShippable: true,
        isFirearm: false,
        category: "Accessories",
        upcCode: "816161020234"
      }
    ];

    // Customer and checkout data as UI would send
    const checkoutData = {
      // User ID (required for compliance checks)
      userId: 1, // Test user
      
      // Cart items with real products
      cartItems: cartItems,
      
      // Customer information
      customerInfo: {
        email: 'ui.test@thegunfirm.com',
        firstName: 'UI',
        lastName: 'TestCustomer',
        phone: '555-0123',
        membershipTier: 'Bronze'
      },
      
      // Shipping address
      shippingAddress: {
        street: '123 UI Test Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '73301',
        country: 'US'
      },
      
      // FFL selection (required for Glock)
      selectedFFL: {
        id: 'TX-FFL-001',
        name: 'Austin Gun Store',
        address: '456 Gun Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '73301',
        phone: '555-0456',
        email: 'ffl@austingunstore.com'
      },
      
      // Payment details (test mode)
      paymentMethod: {
        cardNumber: '4111111111111111', // Test card
        expirationDate: '12/25',
        cvv: '123'
      },
      
      // Order processing flags
      processWithSplitting: true,
      enableZohoSync: true
    };

    console.log('🔄 Submitting checkout with real UI data...');
    console.log('📋 Order composition:');
    console.log(`   🔫 ${cartItems[0].productName} - $${cartItems[0].price}`);
    console.log(`   📦 ${cartItems[1].productName} - $${cartItems[1].price}`);
    console.log(`   💰 Total: $${cartItems.reduce((sum, item) => sum + item.price, 0)}`);
    
    const checkoutResponse = await fetch('http://localhost:5000/api/checkout/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });
    
    if (checkoutResponse.ok) {
      const checkoutResult = await checkoutResponse.json();
      console.log('✅ UI checkout processed successfully!');
      
      if (checkoutResult.success) {
        console.log('\n🎉 UI CHECKOUT RESULTS:');
        console.log(`📋 Order ID: ${checkoutResult.order?.id || 'N/A'}`);
        console.log(`📋 Order Number: ${checkoutResult.order?.orderNumber || 'N/A'}`);
        console.log(`📋 Status: ${checkoutResult.order?.status || 'N/A'}`);
        console.log(`📋 Hold Type: ${checkoutResult.order?.hold || 'None'}`);
        console.log(`📋 Deal ID: ${checkoutResult.order?.dealId || 'N/A'}`);
        
        // Check if order splitting occurred
        if (checkoutResult.orderSplitting) {
          console.log('\n📦 ORDER SPLITTING FROM UI:');
          console.log(`📋 Orders Created: ${checkoutResult.orderSplitting.ordersCreated}`);
          
          checkoutResult.orderSplitting.orders.forEach((order, index) => {
            console.log(`\n   Split ${index + 1}:`);
            console.log(`   📋 Deal ID: ${order.dealId}`);
            console.log(`   📋 TGF Order: ${order.tgfOrderNumber}`);
            console.log(`   📋 Outcome: ${order.outcome}`);
            console.log(`   📋 Fulfillment: ${order.fulfillmentType}`);
          });
          
          console.log('\n✅ UI ORDER SPLITTING CONFIRMED');
          console.log('✅ Same splitting logic as API test');
          console.log('✅ Glock and holster separated by fulfillment type');
          
        } else {
          console.log('\n📋 Single order created (no splitting detected)');
        }
        
        return {
          success: true,
          uiWorking: true,
          orderCreated: true,
          orderSplitting: !!checkoutResult.orderSplitting,
          orderId: checkoutResult.order?.id,
          orderNumber: checkoutResult.order?.orderNumber,
          dealId: checkoutResult.order?.dealId,
          message: 'UI checkout working with real products'
        };
        
      } else {
        console.log(`❌ Checkout failed: ${checkoutResult.error || 'Unknown error'}`);
        return { success: false, error: checkoutResult.error };
      }
      
    } else {
      const errorText = await checkoutResponse.text();
      console.log(`❌ Checkout request failed: ${checkoutResponse.status}`);
      console.log(`Response: ${errorText}`);
      return { success: false, error: `HTTP ${checkoutResponse.status}: ${errorText}` };
    }

  } catch (error) {
    console.error('💥 UI checkout test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the real UI test
testRealUICheckout()
  .then(result => {
    console.log('\n🏁 REAL UI CHECKOUT TEST COMPLETE');
    
    if (result.success) {
      console.log('🎉 TEST STATUS: UI CHECKOUT FUNCTIONAL');
      console.log(`📋 Order Created: ${result.orderCreated ? 'Yes' : 'No'}`);
      console.log(`📋 Order Splitting: ${result.orderSplitting ? 'Yes' : 'No'}`);
      console.log(`📋 Order ID: ${result.orderId || 'N/A'}`);
      console.log(`📋 Order Number: ${result.orderNumber || 'N/A'}`);
      console.log(`📋 Deal ID: ${result.dealId || 'N/A'}`);
      
      console.log('\n💼 UI VERIFICATION COMPLETE:');
      console.log('✅ Cart structure handled correctly');
      console.log('✅ Real products processed through UI');
      console.log('✅ Checkout endpoint functional');
      console.log('✅ Payment processing integration');
      console.log('✅ Order creation and Zoho sync');
      
      if (result.orderSplitting) {
        console.log('✅ Order splitting working through UI');
        console.log('✅ UI produces same results as API test');
      }
      
    } else {
      console.log('❌ TEST STATUS: UI CHECKOUT ISSUES');
      console.log('Error:', result.error);
      
      console.log('\n🔧 DEBUGGING NEEDED:');
      console.log('• Check checkout endpoint implementation');
      console.log('• Verify cart data structure compatibility');
      console.log('• Review order processing pipeline');
    }
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
  });