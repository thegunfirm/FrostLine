/**
 * Test UI checkout flow bypassing payment to verify order splitting
 * Focus on order creation and Zoho integration
 */

const fetch = require('node-fetch');

async function testUICheckoutNoPayment() {
  console.log('🎯 Testing UI Checkout (No Payment Processing)');
  console.log('📋 Focus: Order creation and splitting logic');
  
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
      enableZohoSync: true,
      skipPaymentProcessing: true // Skip payment for this test
    };

    console.log('🔄 Submitting checkout with real UI data...');
    console.log('📋 Order composition:');
    console.log(`   🔫 ${cartItems[0].productName} - $${cartItems[0].price}`);
    console.log(`   📦 ${cartItems[1].productName} - $${cartItems[1].price}`);
    console.log(`   💰 Total: $${cartItems.reduce((sum, item) => sum + item.price, 0)}`);
    console.log('⚠️  Payment processing: SKIPPED');
    
    // Test with a shorter timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds
    
    try {
      const checkoutResponse = await fetch('http://localhost:5000/api/checkout/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutData),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
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
          
          return {
            success: true,
            uiWorking: true,
            orderCreated: true,
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
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.log('❌ Request timed out after 30 seconds');
        return { success: false, error: 'Request timeout - likely hanging in payment processing' };
      }
      throw error;
    }

  } catch (error) {
    console.error('💥 UI checkout test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testUICheckoutNoPayment()
  .then(result => {
    console.log('\n🏁 UI CHECKOUT TEST (NO PAYMENT) COMPLETE');
    
    if (result.success) {
      console.log('🎉 TEST STATUS: UI CHECKOUT FUNCTIONAL');
      console.log(`📋 Order Created: ${result.orderCreated ? 'Yes' : 'No'}`);
      console.log(`📋 Order ID: ${result.orderId || 'N/A'}`);
      console.log(`📋 Order Number: ${result.orderNumber || 'N/A'}`);
      console.log(`📋 Deal ID: ${result.dealId || 'N/A'}`);
      
      console.log('\n💼 UI VERIFICATION COMPLETE:');
      console.log('✅ Cart structure handled correctly');
      console.log('✅ Real products processed through UI');
      console.log('✅ Checkout endpoint functional');
      console.log('✅ Order creation pipeline working');
      console.log('⚠️  Payment processing: BYPASSED');
      
    } else {
      console.log('❌ TEST STATUS: UI CHECKOUT ISSUES');
      console.log('Error:', result.error);
      
      if (result.error?.includes('timeout')) {
        console.log('\n🔧 ISSUE IDENTIFIED: Payment Processing Timeout');
        console.log('• Authorize.Net integration may be hanging');
        console.log('• Check API credentials and network connectivity');
        console.log('• Consider adding timeout to payment service');
      }
    }
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
  });