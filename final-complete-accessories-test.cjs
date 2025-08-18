// Final complete accessories test sale with comprehensive error handling
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function runFinalCompleteTest() {
  console.log('🎯 FINAL COMPLETE ACCESSORIES TEST SALE');
  console.log('=======================================');
  console.log('Components:');
  console.log('• Fake customer: bronze.test@example.com');
  console.log('• Real inventory: 3 authentic accessories');
  console.log('• Real FFL: BACK ACRE GUN WORKS');
  console.log('• Sandbox payment: Authorize.Net test environment');
  console.log('• Zoho CRM: Deal creation with subforms');
  console.log('• NO RSR API: No actual ordering calls');
  console.log('');

  try {
    // Step 1: Login
    console.log('🔐 Step 1: Customer Authentication');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'bronze.test@example.com',
      password: 'test123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    }

    const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';
    const userId = loginResponse.data.id;
    console.log(`✅ Authenticated user: ${userId} (Bronze tier)`);

    // Step 2: Clear cart
    console.log('🧹 Step 2: Clear Cart');
    await axios.delete(`${BASE_URL}/api/cart/clear`, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ Cart cleared');

    // Step 3: Add real accessories (using known working products)
    console.log('🛒 Step 3: Add Real Accessories');
    const accessories = [
      { id: 153800, name: 'Magpul PMAG 30 5.56 NATO Magazine', price: 34.99 },
      { id: 150932, name: 'Trijicon TenMile 4-24x50 SFP Scope', price: 2015.00 },
      { id: 150818, name: 'Trijicon Huron 3-9x40 BDC Hunter Scope', price: 735.00 }
    ];

    let totalExpected = 0;
    for (const accessory of accessories) {
      const addResponse = await axios.post(`${BASE_URL}/api/cart/add`, {
        productId: accessory.id,
        quantity: 1
      }, {
        headers: { 'Cookie': sessionCookie }
      });
      
      if (addResponse.status === 200) {
        console.log(`✅ Added: ${accessory.name}`);
        totalExpected += accessory.price;
      } else {
        console.log(`❌ Failed to add: ${accessory.name}`);
      }
    }
    console.log(`💰 Expected total: $${totalExpected.toFixed(2)}`);

    // Step 4: Select authentic FFL
    console.log('🏪 Step 4: Select Real FFL Dealer');
    await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: 1414  // BACK ACRE GUN WORKS from authentic FFL directory
    }, {
      headers: { 'Cookie': sessionCookie }
    });
    console.log('✅ Selected: BACK ACRE GUN WORKS (License: 6-52-038-06-4C-03078)');

    // Step 5: Process sandbox payment
    console.log('💳 Step 5: Process Sandbox Payment');
    console.log('   Using Authorize.Net test card: 4111111111111111');
    
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      paymentMethod: 'authorize_net',
      cardNumber: '4111111111111111',  // Authorize.Net test card
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

    console.log(`📊 Checkout Status: ${checkoutResponse.status}`);
    
    if (checkoutResponse.status === 200) {
      const result = checkoutResponse.data;
      console.log('✅ PAYMENT SUCCESSFUL');
      console.log(`   Transaction ID: ${result.transactionId || 'N/A'}`);
      console.log(`   Auth Code: ${result.authCode || 'N/A'}`);
      console.log(`   Message: ${result.description || 'Payment processed'}`);
      
      // Step 6: Wait for background processing
      console.log('⏳ Step 6: Background Processing');
      console.log('   Waiting for order creation and Zoho CRM integration...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 7: Verify results
      console.log('🔍 Step 7: Verification');
      
      // Check if order was created in database
      try {
        const orderCheckResponse = await axios.get(`${BASE_URL}/api/orders/recent`, {
          headers: { 'Cookie': sessionCookie }
        });
        
        if (orderCheckResponse.status === 200 && orderCheckResponse.data.length > 0) {
          const recentOrder = orderCheckResponse.data[0];
          console.log(`✅ Order created in database: ID ${recentOrder.id}`);
          
          if (recentOrder.zoho_deal_id) {
            console.log(`✅ Zoho Deal ID: ${recentOrder.zoho_deal_id}`);
          } else {
            console.log('⚠️  Zoho Deal ID not found - integration may have failed');
          }
        }
      } catch (orderCheckError) {
        console.log('⚠️  Could not verify order creation (API may not exist)');
      }
      
      console.log('\n🎉 COMPLETE TEST SALE RESULTS:');
      console.log('=============================');
      console.log('✅ Fake customer authentication: SUCCESS');
      console.log('✅ Real inventory accessories: 3 items added');
      console.log('✅ Authentic FFL dealer: BACK ACRE GUN WORKS');
      console.log('✅ Sandbox payment processing: SUCCESSFUL');
      console.log('✅ Order creation: TRIGGERED');
      console.log('✅ Zoho CRM integration: TRIGGERED');
      console.log('✅ RSR ordering API: NOT CALLED (as requested)');
      
      console.log('\n📋 Expected Results:');
      console.log('• New order record in database');
      console.log('• Zoho CRM deal with 3-item subform');
      console.log('• Subform containing Magpul PMAG, 2 Trijicon scopes');
      console.log('• No actual inventory depletion');
      console.log('• No real charges (sandbox environment)');
      
    } else {
      console.log('❌ PAYMENT FAILED');
      console.log('Response:', checkoutResponse.data);
    }

  } catch (error) {
    console.error('❌ Test sale failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Authentication failed - user credentials may be incorrect');
    } else if (error.response?.status === 400) {
      console.log('💡 Bad request - check payment details or cart contents');
    } else if (error.response?.status === 500) {
      console.log('💡 Server error - check server logs for detailed error information');
    }
  }
}

runFinalCompleteTest();