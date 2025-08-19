/**
 * Complete Test Sale - Real Inventory, Fake Customer, Real FFL, Sandbox Auth.Net
 * Two accessories + one Glock pistol
 * Does NOT interact with RSR ordering API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test customer data (fake)
const testCustomer = {
  email: 'john.tester@testgunfirm.com',
  password: 'TestPassword123!',
  firstName: 'John',
  lastName: 'Tester',
  phone: '555-123-4567',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'TX',
    zip: '75001'
  },
  membershipTier: 'Bronze'
};

// Selected real inventory items
const orderItems = [
  {
    sku: '1791TAC-IWB-G43XMOS-BR',
    name: '1791 KYDEX IWB GLOCK 43XMOS BLK RH',
    quantity: 1,
    price: 64.99,
    requiresFfl: false,
    category: 'Accessories'
  },
  {
    sku: '1791SCH-3-NSB-R', 
    name: '1791 SMTH CNCL NIGHT SKY BLK RH SZ 3',
    quantity: 1,
    price: 47.99,
    requiresFfl: false,
    category: 'Accessories'
  },
  {
    sku: 'GLPA175S203',
    name: 'GLOCK 17 GEN5 9MM 17RD 3 MAGS FS',
    quantity: 1,
    price: 647.00,
    requiresFfl: true,
    category: 'Handguns'
  }
];

// Real FFL dealer
const selectedFfl = {
  licenseNumber: '1-59-017-07-6F-13700',
  businessName: 'BACK ACRE GUN WORKS',
  address: {
    street: '1621 N CROFT AVE',
    city: 'INVERNESS',
    state: 'FL',
    zip: '34452'
  }
};

// Sandbox payment data
const testPayment = {
  cardNumber: '4111111111111111', // Visa test card
  expiryMonth: '12',
  expiryYear: '2027',
  cvv: '123',
  cardholderName: 'John Tester'
};

async function processTestSale() {
  console.log('🧪 Starting Complete Test Sale Process');
  console.log('📦 Items:', orderItems.map(item => `${item.sku} - ${item.name}`));
  console.log('🏪 FFL:', selectedFfl.businessName);
  console.log('💳 Payment: Sandbox Authorize.Net');
  console.log('⚠️  RSR API: DISABLED (Test mode)');
  
  try {
    // Step 1: Register test customer
    console.log('\n🔑 Step 1: Registering test customer...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: testCustomer.email,
      password: testCustomer.password,
      firstName: testCustomer.firstName,
      lastName: testCustomer.lastName,
      phone: testCustomer.phone,
      address: testCustomer.address,
      membershipTier: testCustomer.membershipTier
    });
    
    console.log('✅ Customer registered:', registerResponse.data.user?.email);
    
    // Step 1.5: Skip email verification for test (directly verify in database)
    console.log('\n📧 Step 1.5: Bypassing email verification for test...');
    
    // For this test, we'll use a backdoor to verify the email
    try {
      await axios.post(`${BASE_URL}/api/auth/debug/verify-email-direct`, {
        email: testCustomer.email
      });
      console.log('✅ Email verification bypassed for testing');
    } catch (verifyError) {
      console.log('⚠️ Email verification bypass failed, trying direct login...');
    }
    
    // Step 2: Login to get session
    console.log('\n🔐 Step 2: Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testCustomer.email,
      password: testCustomer.password
    }, {
      withCredentials: true
    });
    
    // Extract session cookie
    const sessionCookie = loginResponse.headers['set-cookie']?.[0];
    const axiosConfig = {
      headers: {
        'Cookie': sessionCookie
      },
      withCredentials: true
    };
    
    console.log('✅ Login successful, session obtained');
    
    // Step 3: Add items to cart
    console.log('\n🛒 Step 3: Adding items to cart...');
    for (const item of orderItems) {
      console.log(`  Adding: ${item.sku} - ${item.name}`);
      await axios.post(`${BASE_URL}/api/cart/add`, {
        productId: item.sku, // Using SKU as product ID for this test
        quantity: item.quantity,
        sku: item.sku,
        name: item.name,
        price: item.price,
        requiresFfl: item.requiresFfl
      }, axiosConfig);
    }
    
    console.log('✅ All items added to cart');
    
    // Step 4: Get cart contents
    console.log('\n📋 Step 4: Verifying cart contents...');
    const cartResponse = await axios.get(`${BASE_URL}/api/cart`, axiosConfig);
    const cartItems = cartResponse.data;
    
    console.log(`✅ Cart verified: ${cartItems.length} items`);
    cartItems.forEach(item => {
      console.log(`  - ${item.sku}: ${item.name} (Qty: ${item.quantity}, $${item.price})`);
    });
    
    // Step 5: Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.0825; // 8.25% TX tax
    const total = subtotal + tax;
    
    console.log(`\n💰 Order Summary:`);
    console.log(`   Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`   Tax (8.25%): $${tax.toFixed(2)}`);
    console.log(`   Total: $${total.toFixed(2)}`);
    
    // Step 6: Create order with real FFL
    console.log('\n🏪 Step 5: Creating order with FFL selection...');
    const orderData = {
      items: cartItems.map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        requiresFfl: item.requiresFfl
      })),
      fflDealer: selectedFfl,
      paymentMethod: 'credit_card',
      billingAddress: testCustomer.address,
      shippingAddress: selectedFfl.address,
      subtotal: subtotal,
      tax: tax,
      total: total,
      testMode: true, // Ensures we don't hit RSR API
      skipRsrSubmission: true // Additional safeguard
    };
    
    const orderResponse = await axios.post(`${BASE_URL}/api/orders/create`, orderData, axiosConfig);
    const orderNumber = orderResponse.data.orderNumber;
    const orderId = orderResponse.data.orderId;
    
    console.log(`✅ Order created: ${orderNumber} (ID: ${orderId})`);
    
    // Step 7: Process sandbox payment
    console.log('\n💳 Step 6: Processing sandbox payment...');
    const paymentData = {
      orderId: orderId,
      paymentDetails: {
        cardNumber: testPayment.cardNumber,
        expiryMonth: testPayment.expiryMonth,
        expiryYear: testPayment.expiryYear,
        cvv: testPayment.cvv,
        cardholderName: testPayment.cardholderName
      },
      billingAddress: testCustomer.address,
      amount: total
    };
    
    const paymentResponse = await axios.post(`${BASE_URL}/api/payments/process`, paymentData, axiosConfig);
    
    if (paymentResponse.data.success) {
      console.log('✅ Payment processed successfully');
      console.log(`   Transaction ID: ${paymentResponse.data.transactionId}`);
      console.log(`   Auth Code: ${paymentResponse.data.authCode}`);
    } else {
      console.error('❌ Payment failed:', paymentResponse.data.error);
      return;
    }
    
    // Step 8: Verify order status
    console.log('\n📊 Step 7: Verifying final order status...');
    const finalOrderResponse = await axios.get(`${BASE_URL}/api/orders/${orderNumber}`, axiosConfig);
    const finalOrder = finalOrderResponse.data;
    
    console.log('✅ Final Order Status:');
    console.log(`   Order Number: ${finalOrder.orderNumber}`);
    console.log(`   Status: ${finalOrder.status}`);
    console.log(`   Payment Status: ${finalOrder.paymentStatus}`);
    console.log(`   Total: $${finalOrder.total}`);
    console.log(`   Items: ${finalOrder.items.length}`);
    console.log(`   FFL Required: ${finalOrder.items.some(item => item.requiresFfl)}`);
    console.log(`   FFL Dealer: ${finalOrder.fflDealer?.businessName}`);
    
    // Step 9: Verify Zoho CRM integration
    console.log('\n🔗 Step 8: Checking Zoho CRM integration...');
    try {
      const zohoResponse = await axios.get(`${BASE_URL}/api/admin/zoho/deals/search/${orderNumber}`, axiosConfig);
      if (zohoResponse.data.dealId) {
        console.log(`✅ Zoho Deal created: ${zohoResponse.data.dealId}`);
        console.log(`   Deal Name: ${zohoResponse.data.dealName}`);
        console.log(`   Stage: ${zohoResponse.data.stage}`);
        console.log(`   Products in Subform: ${zohoResponse.data.productCount || 'N/A'}`);
      } else {
        console.log('⚠️  Zoho Deal not found or not yet synchronized');
      }
    } catch (zohoError) {
      console.log('⚠️  Could not verify Zoho integration (may not be accessible in test)');
    }
    
    console.log('\n🎉 COMPLETE TEST SALE SUCCESSFUL!');
    console.log('📋 Summary:');
    console.log(`   ✅ Customer: ${testCustomer.email}`);
    console.log(`   ✅ Order: ${orderNumber}`);
    console.log(`   ✅ Items: ${orderItems.length} (2 accessories + 1 Glock)`);
    console.log(`   ✅ FFL: ${selectedFfl.businessName}`);
    console.log(`   ✅ Payment: Sandbox processed`);
    console.log(`   ✅ RSR API: Safely bypassed`);
    console.log(`   ✅ Total: $${total.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Test sale failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400 || error.response?.status === 422) {
      console.error('📋 Validation details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
processTestSale().catch(console.error);