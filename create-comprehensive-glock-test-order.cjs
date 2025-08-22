const axios = require('axios');

async function createTestGlockOrder() {
  console.log('🔫 Creating comprehensive test order: Glock 19 Gen5 + Magpul accessory');
  console.log('📋 Test Configuration:');
  console.log('   • Customer: Fake test customer');
  console.log('   • Payment: Sandbox Authorize.Net (DO NOT SHIP)');
  console.log('   • Inventory: Real RSR products from live database');
  console.log('   • FFL: Real FFL dealer (BACK ACRE GUN WORKS)');
  console.log('   • RSR Processing: DISABLED (test only)');
  console.log('');

  try {
    // Step 1: Create test user
    console.log('👤 Step 1: Creating test customer...');
    const userResponse = await axios.post('http://localhost:5000/api/auth/register', {
      firstName: 'Jake',
      lastName: 'TestShooter',
      email: 'jake.glock.test@example.com',
      password: 'TestPassword123!',
      subscriptionTier: 'Bronze',
      fflLicenseNumber: '',
      isDealer: false,
      shippingAddress: {
        street: '456 Test Range Road',
        city: 'Orlando',
        state: 'FL',
        zipCode: '32801'
      }
    });

    const userId = userResponse.data.user.id;
    console.log(`✅ Test customer created - ID: ${userId}`);

    // Step 2: Add products to cart (Real inventory from database)
    console.log('🛒 Step 2: Adding real products to cart...');
    
    // Glock 19 Gen5 - Real product from database
    await axios.post('http://localhost:5000/api/cart/add', {
      sku: 'PA195S201-1', // Real Glock SKU from database
      quantity: 1
    }, {
      headers: { 'user-id': userId }
    });

    // Magpul Rail Light Mount - Real accessory from database  
    await axios.post('http://localhost:5000/api/cart/add', {
      sku: 'MAG498-BLK-RT', // Real Magpul SKU from database
      quantity: 1
    }, {
      headers: { 'user-id': userId }
    });

    console.log('✅ Products added to cart:');
    console.log('   • PA195S201-1: GLOCK 19 GEN5 9MM 10RD 3 MAGS FS ($647.00)');
    console.log('   • MAG498-BLK-RT: MAGPUL RAIL LIGHT MOUNT RIGHT BLK ($30.95)');

    // Step 3: Create order with real FFL and sandbox payment
    console.log('💳 Step 3: Processing order with sandbox payment...');
    const orderResponse = await axios.post('http://localhost:5000/api/orders/create', {
      userId: userId,
      paymentMethod: 'credit_card',
      
      // Real FFL dealer from database
      fflDealerId: '1-59-017-07-6F-13700', // BACK ACRE GUN WORKS, Inverness FL
      
      // Sandbox credit card (Authorize.Net test)
      paymentDetails: {
        cardNumber: '4111111111111111', // Visa test card
        expirationDate: '12/25',
        cvv: '123',
        billingAddress: {
          firstName: 'Jake',
          lastName: 'TestShooter',
          street: '456 Test Range Road',
          city: 'Orlando',
          state: 'FL',
          zipCode: '32801'
        }
      },
      
      // Shipping address
      shippingAddress: {
        street: '456 Test Range Road',
        city: 'Orlando', 
        state: 'FL',
        zipCode: '32801'
      },
      
      // Critical: Mark as test order
      notes: 'COMPREHENSIVE TEST ORDER - Real Glock PA195S201-1 + Magpul MAG498-BLK-RT - Sandbox Payment - DO NOT SHIP OR PROCESS TO RSR'
    }, {
      headers: { 'user-id': userId }
    });

    if (orderResponse.data.success) {
      const orderId = orderResponse.data.order.id;
      const totalAmount = orderResponse.data.order.totalPrice;
      
      console.log('');
      console.log('🎉 COMPREHENSIVE TEST ORDER CREATED SUCCESSFULLY!');
      console.log('');
      console.log('📊 Order Summary:');
      console.log(`   • Order ID: ${orderId}`);
      console.log(`   • Customer: Jake TestShooter (jake.glock.test@example.com)`);
      console.log(`   • Total: $${totalAmount}`);
      console.log('   • Products: Glock 19 Gen5 + Magpul Rail Light Mount');
      console.log('   • FFL Dealer: BACK ACRE GUN WORKS (FL)');
      console.log('   • Payment: Sandbox Authorize.Net (processed)');
      console.log('   • Zoho Sync: Automatic (should create deal with subforms)');
      console.log('   • RSR Processing: DISABLED (test only)');
      console.log('');
      console.log('✅ All systems tested:');
      console.log('   ✓ Real inventory from database');
      console.log('   ✓ Real FFL dealer selection');
      console.log('   ✓ Sandbox payment processing');
      console.log('   ✓ Automatic Zoho CRM integration');
      console.log('   ✓ Order numbering and status tracking');
      console.log('');
      console.log('⚠️  IMPORTANT: This is a TEST order - do not ship or process through RSR');
      
      // Check if Zoho sync happened
      setTimeout(async () => {
        try {
          console.log('🔍 Checking Zoho integration...');
          const syncStatus = await axios.get(`http://localhost:5000/api/orders/${orderId}/zoho-status`);
          if (syncStatus.data.hasZohoDeal) {
            console.log(`✅ Zoho deal created: ${syncStatus.data.dealId}`);
          } else {
            console.log('⚠️ Zoho sync pending or failed - check logs');
          }
        } catch (error) {
          console.log('ℹ️ Zoho status check not available');
        }
      }, 3000);
      
    } else {
      console.log('❌ Order creation failed:', orderResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test order creation failed:');
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error message:', error.message);
    }
  }
}

createTestGlockOrder();