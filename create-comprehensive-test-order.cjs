const axios = require('axios');

async function createTestOrder() {
  console.log('🔫 Creating comprehensive test order with real inventory...');
  
  const baseURL = 'https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev';
  
  // Step 1: Create test customer account
  console.log('📝 Creating test customer account...');
  const customerData = {
    firstName: 'John',
    lastName: 'TestCustomer',
    email: `test.customer.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    tier: 'bronze',
    phone: '555-123-4567',
    dateOfBirth: '1985-06-15',
    shippingAddress: {
      street: '123 Test Street',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701'
    },
    billingAddress: {
      street: '123 Test Street',
      city: 'Austin', 
      state: 'TX',
      zipCode: '78701'
    }
  };
  
  try {
    // Register customer
    const registerResponse = await axios.post(`${baseURL}/api/register`, customerData);
    console.log('✅ Customer registered:', customerData.email);
    
    // Login the customer to get authenticated session
    const loginResponse = await axios.post(`${baseURL}/api/login`, {
      email: customerData.email,
      password: customerData.password
    });
    console.log('✅ Customer logged in successfully');
    
    // Get session cookies for authentication
    const sessionCookie = loginResponse.headers['set-cookie']?.[0]?.split(';')[0];
    const headers = sessionCookie ? { Cookie: sessionCookie } : {};
    
    // Step 2: Add products to cart
    console.log('🛒 Adding products to cart...');
    
    // Add Glock 17 (requires FFL)
    const glockResponse = await axios.post(`${baseURL}/api/cart/add`, {
      sku: 'PA175S204N-1', // GLOCK 17CK GEN5 9MM 17RD W/ACRO
      quantity: 1
    }, { headers });
    console.log('✅ Added Glock to cart:', glockResponse.data);
    
    // Add accessory (no FFL required)
    const accessoryResponse = await axios.post(`${baseURL}/api/cart/add`, {
      sku: '100-121', // REPTILIA ROF SAR 30MM APNT MICRO FDE
      quantity: 1
    }, { headers });
    console.log('✅ Added accessory to cart:', accessoryResponse.data);
    
    // Step 3: Get cart contents
    const cartResponse = await axios.get(`${baseURL}/api/cart`, { headers });
    console.log('📋 Cart contents:', JSON.stringify(cartResponse.data, null, 2));
    
    // Step 4: Checkout with real FFL and sandbox payment
    console.log('💳 Processing checkout...');
    const checkoutData = {
      paymentInfo: {
        cardNumber: '4111111111111111', // Authorize.Net test card
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'John TestCustomer'
      },
      billingAddress: customerData.billingAddress,
      shippingAddress: customerData.shippingAddress,
      selectedFFL: {
        licenseNumber: '1-59-017-07-6F-13700', // BACK ACRE GUN WORKS
        businessName: 'BACK ACRE GUN WORKS',
        address: {
          street: '1621 N CROFT AVE',
          city: 'INVERNESS',
          state: 'FL',
          zip: '344530570'
        }
      },
      specialInstructions: 'TEST ORDER - DO NOT PROCESS TO RSR. Sandbox payment testing.',
      processToRSR: false, // Explicitly disable RSR processing
      testMode: true
    };
    
    const orderResponse = await axios.post(`${baseURL}/api/checkout/process`, checkoutData, { headers });
    
    if (orderResponse.data.success) {
      console.log('✅ Order processed successfully!');
      console.log('📋 Order Details:');
      console.log(`   Order ID: ${orderResponse.data.orderId}`);
      console.log(`   Total: $${orderResponse.data.total}`);
      console.log(`   Payment Status: ${orderResponse.data.paymentStatus}`);
      console.log(`   FFL: ${checkoutData.selectedFFL.businessName}`);
      console.log(`   Products: Glock + Accessory`);
      
      if (orderResponse.data.zohoStatus) {
        console.log(`   Zoho CRM: ${orderResponse.data.zohoStatus}`);
      }
      
      // Step 5: Verify order in database
      console.log('🔍 Verifying order in database...');
      const orderCheckResponse = await axios.get(`${baseURL}/api/orders/${orderResponse.data.orderId}`, { headers });
      console.log('📊 Database verification:', JSON.stringify(orderCheckResponse.data, null, 2));
      
    } else {
      console.log('❌ Order processing failed:', orderResponse.data);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

createTestOrder();