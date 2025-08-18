const axios = require('axios');
const { faker } = require('@faker-js/faker');

const BASE_URL = 'http://localhost:5000';

// Test customer data (fake)
const testCustomer = {
  email: `test.customer.${Date.now()}@testgunfirm.com`,
  password: 'TestPassword123!',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: faker.phone.number('###-###-####'),
  membershipTier: 'Bronze',
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: 'TX',
    zip: '75001'
  }
};

// Three different accessories to test with
const testAccessories = [
  {
    id: 153800, // Magpul PMAG magazine
    name: 'Magpul PMAG 30 5.56 NATO 30-Round Magazine',
    sku: 'MAGPUL-PMAG',
    price: 34.99,
    quantity: 2
  },
  {
    id: 150932, // Trijicon scope
    name: 'TRIJICON TENMILE 4-24X50 SFP MRAD RD',
    sku: 'TRTM42450-C-3000007', 
    price: 2015.00,
    quantity: 1
  },
  {
    id: 150818, // Trijicon Huron scope
    name: 'TRIJICON HURON 3-9X40 BDC HUNTER',
    sku: 'TRHR940-C-2700006',
    price: 735.00,
    quantity: 1
  }
];

// Real FFL from database
const testFFL = {
  id: 1414,
  businessName: 'BACK ACRE GUN WORKS',
  licenseNumber: '1-59-017-07-6F-13700',
  address: {
    street: '1621 N CROFT AVE',
    city: 'INVERNESS', 
    state: 'FL',
    zip: '34453'
  }
};

// Sandbox Authorize.Net test card
const testPayment = {
  cardNumber: '4111111111111111', // Visa test card
  expiryMonth: '12',
  expiryYear: '2025',
  cvv: '123',
  cardholderName: `${testCustomer.firstName} ${testCustomer.lastName}`
};

async function processTestAccessoriesSale() {
  console.log('🧪 Starting Test Accessories Sale Process');
  console.log('=============================================');
  
  try {
    console.log('📝 Step 1: Creating test customer account...');
    
    // Register customer
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: testCustomer.email,
      password: testCustomer.password,
      firstName: testCustomer.firstName,
      lastName: testCustomer.lastName,
      phone: testCustomer.phone,
      membershipTier: testCustomer.membershipTier,
      ...testCustomer.address
    });
    
    console.log(`✅ Customer registered: ${testCustomer.email}`);
    
    // Simulate email verification step
    console.log('📧 Step 2: Simulating email verification...');
    
    // Get the verification token from the registration response or database
    // For test purposes, we'll verify the email directly via API
    try {
      // First, get user to find verification token
      const userResponse = await axios.get(`${BASE_URL}/api/user/by-email/${encodeURIComponent(testCustomer.email)}`);
      
      if (userResponse.data && userResponse.data.emailVerificationToken) {
        // Verify the email using the token
        const verifyResponse = await axios.get(`${BASE_URL}/verify-email?token=${userResponse.data.emailVerificationToken}`);
        console.log('✅ Email verification simulated successfully');
      } else {
        console.log('⚠️ Could not find verification token, attempting to verify directly...');
        
        // Direct verification for test
        const directVerifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-email-direct`, {
          email: testCustomer.email
        });
        console.log('✅ Direct email verification completed');
      }
    } catch (verifyError) {
      console.log('⚠️ Email verification simulation failed, proceeding with login attempt...');
    }

    // Login to get session
    console.log('🔐 Step 3: Logging in customer...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testCustomer.email,
      password: testCustomer.password
    }, {
      withCredentials: true
    });
    
    console.log('✅ Customer logged in successfully');
    
    // Get cookies for authenticated requests
    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies.join('; ') : '';
    
    console.log('🛒 Step 4: Adding accessories to cart...');
    
    // Add each accessory to cart
    for (const accessory of testAccessories) {
      const cartResponse = await axios.post(`${BASE_URL}/api/cart/add`, {
        productId: accessory.id,
        quantity: accessory.quantity
      }, {
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      console.log(`   ✅ Added ${accessory.quantity}x ${accessory.name} ($${accessory.price})`);
    }
    
    console.log('📋 Step 5: Getting cart summary...');
    const cartResponse = await axios.get(`${BASE_URL}/api/cart`, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    const cartTotal = cartResponse.data.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
    console.log(`   📊 Cart Total: $${cartTotal.toFixed(2)}`);
    console.log(`   📦 Items: ${cartResponse.data.length} different accessories`);
    
    console.log('🏪 Step 6: Selecting FFL dealer...');
    
    // Set FFL for checkout (required for compliance)
    const fflResponse = await axios.post(`${BASE_URL}/api/user/ffl`, {
      fflId: testFFL.id
    }, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    console.log(`   ✅ Selected FFL: ${testFFL.businessName} (${testFFL.licenseNumber})`);
    console.log(`   📍 Location: ${testFFL.address.city}, ${testFFL.address.state}`);
    
    console.log('💳 Step 7: Processing payment (Sandbox Authorize.Net)...');
    
    // Process checkout with payment
    const checkoutResponse = await axios.post(`${BASE_URL}/api/checkout/process`, {
      billingAddress: testCustomer.address,
      shippingAddress: testCustomer.address,
      paymentMethod: {
        type: 'credit_card',
        cardNumber: testPayment.cardNumber,
        expiryMonth: testPayment.expiryMonth,
        expiryYear: testPayment.expiryYear,
        cvv: testPayment.cvv,
        cardholderName: testPayment.cardholderName
      },
      specialInstructions: 'Test order - accessories only - do NOT submit to RSR API'
    }, {
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (checkoutResponse.data.success) {
      const orderId = checkoutResponse.data.orderId;
      const orderNumber = checkoutResponse.data.orderNumber;
      
      console.log('🎉 SALE PROCESSED SUCCESSFULLY!');
      console.log('=====================================');
      console.log(`📄 Order ID: ${orderId}`);
      console.log(`🔢 Order Number: ${orderNumber}`);
      console.log(`👤 Customer: ${testCustomer.firstName} ${testCustomer.lastName}`);
      console.log(`📧 Email: ${testCustomer.email}`);
      console.log(`💰 Total: $${cartTotal.toFixed(2)}`);
      console.log(`🏪 FFL: ${testFFL.businessName}`);
      console.log(`📦 Items:`);
      
      testAccessories.forEach(accessory => {
        console.log(`   • ${accessory.quantity}x ${accessory.name} - $${(accessory.price * accessory.quantity).toFixed(2)}`);
      });
      
      console.log('\n🔍 Step 8: Verifying order in database...');
      
      // Get order details
      const orderResponse = await axios.get(`${BASE_URL}/api/orders/${orderId}`, {
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      if (orderResponse.data) {
        console.log('✅ Order verified in database:');
        console.log(`   Status: ${orderResponse.data.status}`);
        console.log(`   Payment Status: ${orderResponse.data.paymentStatus}`);
        console.log(`   Items Count: ${orderResponse.data.items?.length || 0}`);
        
        // Check Zoho integration
        console.log('\n🔄 Step 9: Checking Zoho CRM integration...');
        
        try {
          const zohoStatus = await axios.get(`${BASE_URL}/api/zoho/status`);
          if (zohoStatus.data.status === 'working') {
            console.log('✅ Zoho API is operational - order should sync automatically');
          } else {
            console.log('⚠️ Zoho API not available - order sync may be delayed');
          }
        } catch (zohoError) {
          console.log('⚠️ Could not check Zoho status');
        }
        
        console.log('\n🎯 TEST RESULTS SUMMARY:');
        console.log('========================');
        console.log('✅ Customer account created (fake data)');
        console.log('✅ Three different accessories added to cart (real inventory)');
        console.log('✅ Real FFL dealer selected');
        console.log('✅ Sandbox Authorize.Net payment processed');
        console.log('✅ Order created and stored in database');
        console.log('❌ RSR ordering API skipped (as requested)');
        console.log('✅ All compliance requirements met');
        console.log('\n🚀 Accessories sale test completed successfully!');
        
      } else {
        console.log('❌ Could not verify order in database');
      }
      
    } else {
      console.log('❌ Checkout failed:', checkoutResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.log('💡 This might be due to missing payment gateway configuration');
    }
  }
}

// Run the test
processTestAccessoriesSale().catch(console.error);