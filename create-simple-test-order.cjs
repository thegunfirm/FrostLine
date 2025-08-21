const axios = require('axios');

async function createSimpleTestOrder() {
  console.log('🔫 Creating test order with real inventory...');
  
  const baseURL = 'https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev';
  
  try {
    // Step 1: Create a session by making an initial request
    console.log('🔧 Establishing session...');
    const sessionResponse = await axios.get(`${baseURL}/api/products?limit=1`);
    
    // Extract session cookie
    const sessionCookie = sessionResponse.headers['set-cookie']?.[0]?.split(';')[0];
    const headers = sessionCookie ? { Cookie: sessionCookie } : {};
    console.log('✅ Session established');
    
    // Step 2: Add products to cart (as guest user)
    console.log('🛒 Adding products to cart...');
    
    // Add Glock 17 (requires FFL)
    const glockResponse = await axios.post(`${baseURL}/api/cart/add`, {
      sku: 'PA175S204N-1', // GLOCK 17CK GEN5 9MM 17RD W/ACRO
      quantity: 1
    }, { headers });
    console.log('✅ Added Glock to cart');
    
    // Add accessory (no FFL required)
    const accessoryResponse = await axios.post(`${baseURL}/api/cart/add`, {
      sku: '100-121', // REPTILIA ROF SAR 30MM APNT MICRO FDE
      quantity: 1
    }, { headers });
    console.log('✅ Added accessory to cart');
    
    // Step 3: Get cart contents to verify
    const cartResponse = await axios.get(`${baseURL}/api/cart`, { headers });
    console.log('📋 Cart verification:', cartResponse.data);
    
    // Step 4: Register and login user with cart
    console.log('👤 Creating authenticated user...');
    const userData = {
      firstName: 'John',
      lastName: 'TestCustomer',
      email: `test.order.${Date.now()}@example.com`,
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
    
    // Register user
    const registerResponse = await axios.post(`${baseURL}/api/register`, userData, { headers });
    console.log('✅ User registered:', userData.email);
    
    // Get new session after registration (should be logged in)
    const newSessionCookie = registerResponse.headers['set-cookie']?.[0]?.split(';')[0];
    const authHeaders = newSessionCookie ? { Cookie: newSessionCookie } : headers;
    
    // Check if we're authenticated
    const meResponse = await axios.get(`${baseURL}/api/me`, { headers: authHeaders });
    console.log('👤 Authentication status:', meResponse.data);
    
    // Step 5: Process order directly using order creation API
    console.log('💳 Creating order...');
    const orderData = {
      customerInfo: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone
      },
      items: [
        {
          sku: 'PA175S204N-1',
          quantity: 1,
          name: 'GLOCK 17CK GEN5 9MM 17RD W/ACRO',
          price: 1495.00
        },
        {
          sku: '100-121',
          quantity: 1,
          name: 'REPTILIA ROF SAR 30MM APNT MICRO FDE',
          price: 159.95
        }
      ],
      shippingAddress: userData.shippingAddress,
      billingAddress: userData.billingAddress,
      selectedFFL: {
        licenseNumber: '1-59-017-07-6F-13700',
        businessName: 'BACK ACRE GUN WORKS',
        address: {
          street: '1621 N CROFT AVE',
          city: 'INVERNESS',
          state: 'FL',
          zip: '344530570'
        }
      },
      paymentMethod: 'credit_card',
      paymentInfo: {
        cardNumber: '4111111111111111', // Test card
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: 'John TestCustomer'
      },
      specialInstructions: 'TEST ORDER - SANDBOX PAYMENT - DO NOT PROCESS TO RSR',
      skipRSRProcessing: true,
      testMode: true
    };
    
    // Try creating order via POST to orders API
    const createOrderResponse = await axios.post(`${baseURL}/api/orders`, orderData, { headers: authHeaders });
    
    if (createOrderResponse.data.success) {
      console.log('✅ Order created successfully!');
      console.log('📋 Order Summary:');
      console.log(`   Order ID: ${createOrderResponse.data.orderId}`);
      console.log(`   Customer: ${userData.firstName} ${userData.lastName}`);
      console.log(`   Total: $${createOrderResponse.data.total}`);
      console.log(`   Items: Glock 17CK + Reptilia Accessory`);
      console.log(`   FFL: ${orderData.selectedFFL.businessName}`);
      console.log(`   Payment: Sandbox Authorize.Net`);
      
      return createOrderResponse.data;
    } else {
      console.log('❌ Order creation failed:', createOrderResponse.data);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
      
      // If order endpoint doesn't exist, try the checkout endpoint
      if (error.response.status === 404 && error.config.url.includes('/api/orders')) {
        console.log('🔄 Trying alternate checkout endpoint...');
        // We can implement the checkout endpoint approach here
      }
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

createSimpleTestOrder();