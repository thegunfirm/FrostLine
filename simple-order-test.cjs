/**
 * Simple Order Test - Direct API Test
 * Two accessories + one Glock pistol
 * Bypasses complex authentication for direct testing
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

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

async function testDirectOrderProcessing() {
  console.log('🧪 Testing Direct Order Processing');
  console.log('📦 Items:', orderItems.map(item => `${item.sku} - ${item.name}`));
  console.log('🏪 FFL:', selectedFfl.businessName);
  console.log('⚠️  Bypassing authentication for direct test');
  
  try {
    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.0825; // 8.25% TX tax
    const total = subtotal + tax;
    
    console.log(`\n💰 Order Summary:`);
    console.log(`   Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`   Tax (8.25%): $${tax.toFixed(2)}`);
    console.log(`   Total: $${total.toFixed(2)}`);
    
    // Test 1: Verify inventory exists
    console.log('\n📋 Step 1: Verifying inventory exists...');
    for (const item of orderItems) {
      try {
        const response = await axios.get(`${BASE_URL}/api/products/${item.sku}`);
        if (response.data) {
          console.log(`✅ ${item.sku}: In stock (${response.data.stock_quantity || 'Unknown'} units)`);
        } else {
          console.log(`❌ ${item.sku}: Not found in inventory`);
        }
      } catch (error) {
        console.log(`⚠️ ${item.sku}: Could not verify inventory`);
      }
    }
    
    // Test 2: Verify FFL exists
    console.log('\n🏪 Step 2: Verifying FFL dealer...');
    try {
      const fflResponse = await axios.get(`${BASE_URL}/api/ffls/search?license=${selectedFfl.licenseNumber}`);
      if (fflResponse.data && fflResponse.data.length > 0) {
        console.log(`✅ FFL verified: ${fflResponse.data[0].business_name}`);
      } else {
        console.log(`❌ FFL not found: ${selectedFfl.licenseNumber}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not verify FFL: ${error.message}`);
    }
    
    // Test 3: Test Zoho product lookup
    console.log('\n🔗 Step 3: Testing Zoho product lookup...');
    for (const item of orderItems) {
      try {
        const zohoResponse = await axios.post(`${BASE_URL}/api/admin/zoho/products/find-or-create`, {
          sku: item.sku,
          productName: item.name,
          manufacturer: item.sku.split('-')[0], // Extract manufacturer from SKU
          category: item.category
        });
        
        if (zohoResponse.data.productId) {
          console.log(`✅ ${item.sku}: Zoho Product ID ${zohoResponse.data.productId}`);
        } else {
          console.log(`⚠️ ${item.sku}: Could not create/find in Zoho`);
        }
      } catch (error) {
        console.log(`⚠️ ${item.sku}: Zoho lookup failed: ${error.response?.data?.error || error.message}`);
      }
    }
    
    // Test 4: Test deal creation (simulated)
    console.log('\n📋 Step 4: Testing Zoho deal creation...');
    try {
      const dealData = {
        contactId: '12345678901234567890', // Dummy contact ID
        orderNumber: `TGF-TEST-${Date.now()}`,
        totalAmount: total,
        orderItems: orderItems.map(item => ({
          productName: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          requiresFfl: item.requiresFfl
        })),
        membershipTier: 'Bronze',
        fflRequired: orderItems.some(item => item.requiresFfl),
        fflDealerName: selectedFfl.businessName,
        orderStatus: 'Pending Payment'
      };
      
      const dealResponse = await axios.post(`${BASE_URL}/api/admin/zoho/deals/create`, dealData);
      
      if (dealResponse.data.success) {
        console.log(`✅ Zoho Deal created: ${dealResponse.data.dealId}`);
      } else {
        console.log(`⚠️ Zoho Deal creation failed: ${dealResponse.data.error}`);
      }
    } catch (error) {
      console.log(`⚠️ Zoho Deal test failed: ${error.response?.data?.error || error.message}`);
    }
    
    // Test 5: Test payment processing (sandbox)
    console.log('\n💳 Step 5: Testing sandbox payment...');
    try {
      const paymentData = {
        amount: total,
        cardNumber: '4111111111111111', // Visa test card
        expiryMonth: '12',
        expiryYear: '2027',
        cvv: '123',
        cardholderName: 'John Tester',
        billingAddress: {
          firstName: 'John',
          lastName: 'Tester',
          address: '123 Test Street',
          city: 'Test City',
          state: 'TX',
          zip: '75001'
        }
      };
      
      const paymentResponse = await axios.post(`${BASE_URL}/api/payments/test-sandbox`, paymentData);
      
      if (paymentResponse.data.success) {
        console.log(`✅ Payment test successful: ${paymentResponse.data.transactionId}`);
      } else {
        console.log(`⚠️ Payment test failed: ${paymentResponse.data.error}`);
      }
    } catch (error) {
      console.log(`⚠️ Payment test failed: ${error.response?.data?.error || error.message}`);
    }
    
    console.log('\n🎉 DIRECT ORDER PROCESSING TEST COMPLETE!');
    console.log('📋 Summary:');
    console.log(`   Items: ${orderItems.length} (2 accessories + 1 Glock)`);
    console.log(`   FFL: ${selectedFfl.businessName}`);
    console.log(`   Total: $${total.toFixed(2)}`);
    console.log(`   Tests completed without RSR API interaction`);
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.response?.data || error.message);
  }
}

// Run the test
testDirectOrderProcessing().catch(console.error);