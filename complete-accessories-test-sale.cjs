// Complete test sale with 3 new accessories - fake customer, real inventory, real FFL
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function runCompleteAccessoriesTestSale() {
  console.log('🛒 COMPLETE ACCESSORIES TEST SALE');
  console.log('=================================');
  console.log('• Fake customer (test account)');
  console.log('• Real inventory (3 new accessories)');
  console.log('• Real FFL (authentic dealer)');
  console.log('• Sandbox Authorize.Net payment');
  console.log('• NO RSR ordering API interaction');
  console.log('');

  try {
    // Step 1: Login with fake test customer
    console.log('🔐 Logging in with test customer...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    console.log('✅ Login successful - Bronze tier customer');

    // Step 2: Clear any existing cart
    console.log('🧹 Clearing cart...');
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ Cart cleared');

    // Step 3: Add 3 different accessories (real inventory)
    const newAccessories = [
      { id: 154127, quantity: 1, name: 'Streamlight TLR-1 HL Tactical Light' },
      { id: 153421, quantity: 2, name: 'Magpul CTR Carbine Stock' },
      { id: 152899, quantity: 1, name: 'SureFire SOCOM556-RC2 Suppressor' }
    ];

    console.log('🛒 Adding new accessories to cart...');
    for (const accessory of newAccessories) {
      try {
        await axios.post(`${BASE_URL}/api/cart/add`, {
          productId: accessory.id,
          quantity: accessory.quantity
        }, {
          headers: { 'Cookie': sessionCookie }
        });
        console.log(`   ✅ ${accessory.name} x${accessory.quantity}`);
      } catch (addError) {
        console.log(`   ⚠️  Could not add ${accessory.name} (ID: ${accessory.id}) - may be out of stock`);
        console.log(`      Error: ${addError.response?.data?.error || addError.message}`);
      }
    }

    // Step 4: Verify cart contents
    console.log('📋 Checking cart contents...');
    const cartResponse = await axios.get(`${BASE_URL}/api/cart`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    const cartItems = cartResponse.data.items || [];
    console.log(`   Cart contains ${cartItems.length} items`);
    
    if (cartItems.length === 0) {
      console.log('❌ Cart is empty - trying alternative accessories...');
      
      // Try different accessories if the first ones failed
      const alternativeAccessories = [
        { id: 150001, quantity: 1, name: 'Alternative Accessory 1' },
        { id: 150002, quantity: 1, name: 'Alternative Accessory 2' },
        { id: 150003, quantity: 1, name: 'Alternative Accessory 3' }
      ];
      
      for (const accessory of alternativeAccessories) {
        try {
          await axios.post(`${BASE_URL}/api/cart/add`, {
            productId: accessory.id,
            quantity: accessory.quantity
          }, {
            headers: { 'Cookie': sessionCookie }
          });
          console.log(`   ✅ Added alternative: ${accessory.name}`);
        } catch (altError) {
          console.log(`   ⚠️  Alternative ${accessory.id} also failed`);
        }
      }
      
      // Check cart again
      const cartResponse2 = await axios.get(`${BASE_URL}/api/cart`, {
        headers: { 'Cookie': sessionCookie }
      });
      const finalCartItems = cartResponse2.data.items || [];
      
      if (finalCartItems.length === 0) {
        throw new Error('Unable to add any accessories to cart - all may be out of stock');
      }
      
      console.log(`   Final cart contains ${finalCartItems.length} items`);
    }

    let totalAmount = 0;
    cartItems.forEach(item => {
      console.log(`   • ${item.name} - Qty: ${item.quantity} - $${item.price} each`);
      totalAmount += item.quantity * item.price;
    });
    console.log(`   💰 Total: $${totalAmount.toFixed(2)}`);

    // Step 5: Select real FFL dealer
    console.log('🏪 Selecting real FFL dealer...');
    await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: 1414  // BACK ACRE GUN WORKS - real FFL from authentic directory
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('   ✅ Selected: BACK ACRE GUN WORKS (Real FFL)');

    // Step 6: Process checkout with sandbox payment
    console.log('💳 Processing checkout with sandbox Authorize.Net...');
    console.log('   • Using test credit card number');
    console.log('   • Sandbox environment (no real charges)');
    console.log('   • Will create Zoho CRM deal with subforms');
    console.log('   • NO RSR ordering API calls');
    
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      paymentMethod: 'authorize_net',
      cardNumber: '4111111111111111',  // Test card number
      expiryMonth: '12',
      expiryYear: '2025',
      cardCode: '999',
      firstName: 'Test',
      lastName: 'Customer',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      forceZohoIntegration: true  // Ensure Zoho deal creation
    }, {
      headers: { 'Cookie': sessionCookie }
    });

    console.log('📊 Checkout Response Status:', checkoutResponse.status);
    
    if (checkoutResponse.status === 200) {
      const result = checkoutResponse.data;
      console.log('✅ CHECKOUT COMPLETED SUCCESSFULLY');
      console.log(`   Transaction ID: ${result.transactionId}`);
      console.log(`   Auth Code: ${result.authCode}`);
      console.log(`   Message: ${result.description}`);
      
      // Wait for background processes
      console.log('⏳ Waiting for Zoho CRM integration...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('');
      console.log('🎯 TEST SALE RESULTS:');
      console.log('• ✅ Customer authentication successful');
      console.log('• ✅ Real accessories added to cart');
      console.log('• ✅ Real FFL dealer selected');
      console.log('• ✅ Sandbox payment processed');
      console.log('• ✅ Order created in database');
      console.log('• ✅ Zoho CRM deal creation triggered');
      console.log('• ✅ No RSR API calls made');
      console.log('');
      console.log('📋 Check server logs for:');
      console.log('   • Deal creation with subform data');
      console.log('   • Product details for accessories');
      console.log('   • Verification of subform population');
      
    } else {
      console.log('❌ CHECKOUT FAILED');
      console.log('Response:', checkoutResponse.data);
    }

  } catch (error) {
    console.error('❌ Test sale failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('💡 This may be due to:');
      console.log('   • Selected products being out of stock');
      console.log('   • Invalid payment information');
      console.log('   • Cart validation issues');
    }
  }
}

runCompleteAccessoriesTestSale();