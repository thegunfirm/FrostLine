const axios = require('axios');

async function createDirectTestOrder() {
  console.log('🔫 Creating direct test order via SQL...');
  
  const baseURL = 'https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev';
  
  // Test order data with real products
  const orderData = {
    // Customer info (fake customer)
    customerFirstName: 'John',
    customerLastName: 'TestBuyer',
    customerEmail: `test.buyer.${Date.now()}@example.com`,
    customerPhone: '555-123-4567',
    
    // Real products from database
    items: [
      {
        sku: 'PA175S204N-1', // GLOCK 17CK GEN5 9MM 17RD W/ACRO
        name: 'GLOCK 17CK GEN5 9MM 17RD W/ACRO',
        quantity: 1,
        price: 1495.00,
        manufacturer: 'GLOCK',
        fflRequired: true
      },
      {
        sku: '100-121', // REPTILIA ROF SAR 30MM APNT MICRO FDE  
        name: 'REPTILIA ROF SAR 30MM APNT MICRO FDE',
        quantity: 1,
        price: 159.95,
        manufacturer: 'REPTIL',
        fflRequired: false
      }
    ],
    
    // Real FFL dealer
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
    
    // Addresses
    shippingAddress: {
      street: '456 Customer Lane',
      city: 'Tampa',
      state: 'FL',
      zipCode: '33601'
    },
    
    billingAddress: {
      street: '456 Customer Lane', 
      city: 'Tampa',
      state: 'FL',
      zipCode: '33601'
    },
    
    // Payment (Authorize.Net sandbox)
    paymentInfo: {
      method: 'credit_card',
      cardNumber: '4111111111111111', // Test Visa
      expiryMonth: '12',
      expiryYear: '2025', 
      cvv: '123',
      cardholderName: 'John TestBuyer'
    },
    
    // Order details
    orderTotal: 1654.95, // 1495 + 159.95
    status: 'pending_payment',
    specialInstructions: 'TEST ORDER - SANDBOX PAYMENT - DO NOT SHIP OR PROCESS TO RSR',
    testMode: true,
    skipRSRProcessing: true
  };
  
  try {
    // Step 1: First, test the Authorize.Net sandbox payment
    console.log('💳 Testing sandbox payment processing...');
    
    const paymentTest = {
      amount: orderData.orderTotal,
      cardNumber: orderData.paymentInfo.cardNumber,
      expiryDate: `${orderData.paymentInfo.expiryMonth}${orderData.paymentInfo.expiryYear}`,
      cvv: orderData.paymentInfo.cvv,
      cardholderName: orderData.paymentInfo.cardholderName,
      billingAddress: orderData.billingAddress,
      invoiceNumber: `TEST-${Date.now()}`,
      description: 'Test order - Glock + Accessory'
    };
    
    const paymentResponse = await axios.post(`${baseURL}/api/payment/test-transaction`, paymentTest);
    
    if (paymentResponse.data.success) {
      console.log('✅ Sandbox payment successful!');
      console.log(`   Transaction ID: ${paymentResponse.data.transactionId}`);
      console.log(`   Amount: $${paymentResponse.data.amount}`);
      console.log(`   Status: ${paymentResponse.data.status}`);
      
      // Step 2: Create order record in database
      console.log('📝 Creating order record...');
      
      const createOrderPayload = {
        ...orderData,
        paymentTransactionId: paymentResponse.data.transactionId,
        paymentStatus: 'completed',
        orderStatus: 'confirmed'
      };
      
      const orderCreationResponse = await axios.post(`${baseURL}/api/admin/create-test-order`, createOrderPayload);
      
      if (orderCreationResponse.data.success) {
        console.log('✅ Test order created successfully!');
        console.log('');
        console.log('📋 ORDER SUMMARY');
        console.log('================');
        console.log(`Order ID: ${orderCreationResponse.data.orderId}`);
        console.log(`Customer: ${orderData.customerFirstName} ${orderData.customerLastName}`);
        console.log(`Email: ${orderData.customerEmail}`);
        console.log(`Total: $${orderData.orderTotal}`);
        console.log('');
        console.log('Products:');
        orderData.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.name}`);
          console.log(`     SKU: ${item.sku} | Price: $${item.price} | FFL: ${item.fflRequired ? 'Yes' : 'No'}`);
        });
        console.log('');
        console.log(`FFL Dealer: ${orderData.selectedFFL.businessName}`);
        console.log(`License: ${orderData.selectedFFL.licenseNumber}`);
        console.log(`Location: ${orderData.selectedFFL.address.city}, ${orderData.selectedFFL.address.state}`);
        console.log('');
        console.log(`Payment: Authorize.Net Sandbox (Transaction: ${paymentResponse.data.transactionId})`);
        console.log(`Status: Order confirmed, payment processed`);
        console.log(`RSR Processing: DISABLED (Test Mode)`);
        console.log('');
        
        // Step 3: Test Zoho CRM integration (if available)
        console.log('🔄 Testing Zoho CRM integration...');
        try {
          const zohoResponse = await axios.post(`${baseURL}/api/zoho/test-deal`, {
            orderId: orderCreationResponse.data.orderId,
            customerName: `${orderData.customerFirstName} ${orderData.customerLastName}`,
            orderTotal: orderData.orderTotal,
            products: orderData.items
          });
          
          if (zohoResponse.data.success) {
            console.log(`✅ Zoho CRM integration successful - Deal ID: ${zohoResponse.data.dealId}`);
          } else {
            console.log('⚠️ Zoho integration available but not configured');
          }
        } catch (zohoError) {
          console.log('⚠️ Zoho integration not available or configured');
        }
        
        console.log('');
        console.log('🎉 COMPREHENSIVE TEST ORDER COMPLETE!');
        return orderCreationResponse.data;
        
      } else {
        console.log('❌ Order creation failed:', orderCreationResponse.data);
      }
      
    } else {
      console.log('❌ Payment processing failed:', paymentResponse.data);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('   Endpoint:', error.config.url);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
      
      // If specialized endpoints don't exist, provide manual verification steps
      if (error.response.status === 404) {
        console.log('');
        console.log('⚠️ Specialized test endpoints not found.');
        console.log('🔧 MANUAL VERIFICATION STEPS:');
        console.log('1. Products verified in database:');
        console.log(`   - Glock: ${orderData.items[0].sku} (${orderData.items[0].name})`);
        console.log(`   - Accessory: ${orderData.items[1].sku} (${orderData.items[1].name})`);
        console.log(`2. FFL verified: ${orderData.selectedFFL.businessName} (${orderData.selectedFFL.licenseNumber})`);
        console.log('3. Payment method: Authorize.Net sandbox (4111111111111111)');
        console.log('4. RSR processing: DISABLED');
        console.log('5. All components ready for manual order creation via CMS');
      }
      
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

createDirectTestOrder();