const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testComprehensiveOrderLogging() {
  console.log('🔍 COMPREHENSIVE ORDER LOGGING SYSTEM TEST');
  console.log('=' .repeat(80));
  
  try {
    // Step 1: Create a test user for order
    console.log('\n📝 Step 1: Creating test customer...');
    const testUser = {
      email: `logging_test_${Date.now()}@example.com`,
      password: 'TestPass123!',
      firstName: 'Logging',
      lastName: 'TestUser',
      membershipTier: 'Bronze'
    };

    let userResponse;
    try {
      userResponse = await axios.post(`${API_BASE}/api/auth/register`, testUser);
      console.log('✅ Test customer created:', testUser.email);
      console.log('   Registration response:', userResponse.data.message || 'Registration successful');
    } catch (error) {
      console.log('❌ User creation failed:', error.response?.data || error.message);
      return;
    }

    // Step 2: Verify real inventory exists
    console.log('\n📦 Step 2: Verifying real inventory data...');
    const inventoryResponse = await axios.get(`${API_BASE}/api/products?limit=5`);
    
    if (!inventoryResponse.data || inventoryResponse.data.length === 0) {
      console.log('❌ No real inventory found in database');
      return;
    }
    
    const realProduct = inventoryResponse.data[0];
    console.log(`✅ Real inventory verified: ${realProduct.name} (SKU: ${realProduct.sku})`);
    console.log(`   RSR Stock Number: ${realProduct.distributorStockNumber}`);
    console.log(`   Requires FFL: ${realProduct.requiresFfl}`);

    // Step 3: Get real FFL data
    console.log('\n🔫 Step 3: Getting real FFL data...');
    const fflResponse = await axios.get(`${API_BASE}/api/ffls?limit=1`);
    
    if (!fflResponse.data || fflResponse.data.length === 0) {
      console.log('❌ No real FFL data found');
      return;
    }
    
    const realFfl = fflResponse.data[0];
    console.log(`✅ Real FFL verified: ${realFfl.businessName} (License: ${realFfl.license})`);

    // Step 4: Create order with real data
    console.log('\n🛒 Step 4: Creating order with real inventory and FFL...');
    const orderData = {
      items: [{
        productId: realProduct.id,
        quantity: 1,
        price: parseFloat(realProduct.priceWholesale) || 599.99
      }],
      shippingAddress: {
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        address1: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345',
        phone: '555-0123'
      },
      billingAddress: {
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        address1: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345',
        phone: '555-0123'
      },
      selectedFflId: realFfl.id,
      paymentMethod: {
        type: 'credit_card',
        cardNumber: '4111111111111111', // Test card for Authorize.Net sandbox
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardholderName: `${testUser.firstName} ${testUser.lastName}`
      },
      customerEmail: testUser.email
    };

    console.log('💳 Processing order with comprehensive logging...');
    console.log(`   Product: ${realProduct.name}`);
    console.log(`   FFL: ${realFfl.businessName}`);
    console.log(`   Customer: ${testUser.email}`);
    
    const orderResponse = await axios.post(`${API_BASE}/api/orders`, orderData);
    
    if (orderResponse.data && orderResponse.data.orderId) {
      const orderId = orderResponse.data.orderId;
      const tgfOrderNumber = orderResponse.data.tgfOrderNumber;
      
      console.log(`✅ Order created successfully!`);
      console.log(`   Order ID: ${orderId}`);
      console.log(`   TGF Number: ${tgfOrderNumber}`);
      
      // Step 5: Wait for processing and then check activity logs
      console.log('\n⏳ Step 5: Waiting for order processing to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 6: Retrieve and display comprehensive activity logs
      console.log('\n📋 Step 6: Retrieving comprehensive activity logs...');
      try {
        const logsResponse = await axios.get(`${API_BASE}/api/orders/${orderId}/activity-logs`);
        
        if (logsResponse.data && logsResponse.data.length > 0) {
          console.log('\n📊 COMPREHENSIVE ACTIVITY LOG RESULTS:');
          console.log('=' .repeat(80));
          
          logsResponse.data.forEach((log, index) => {
            console.log(`\n${index + 1}. ${log.eventType.toUpperCase()} - ${log.eventStatus.toUpperCase()}`);
            console.log(`   Description: ${log.description}`);
            console.log(`   Category: ${log.eventCategory}`);
            console.log(`   Timestamp: ${log.createdAt}`);
            
            // Show specific tracking data
            if (log.eventType === 'order_numbering') {
              console.log(`   ✅ TGF Order Number: ${log.tgfOrderNumber}`);
            }
            
            if (log.eventType === 'inventory_verification') {
              console.log(`   ✅ Real Inventory Used: ${log.realInventoryUsed}`);
              console.log(`   ✅ Inventory Verified: ${log.inventoryVerified}`);
              if (log.inventoryItems) {
                console.log(`   📦 Items: ${JSON.stringify(log.inventoryItems, null, 6)}`);
              }
            }
            
            if (log.eventType === 'ffl_verification') {
              console.log(`   ✅ Real FFL Used: ${log.realFflUsed}`);
              console.log(`   ✅ FFL Verified: ${log.fflVerified}`);
              console.log(`   🔫 FFL License: ${log.fflLicense}`);
              console.log(`   🔫 FFL Name: ${log.fflName}`);
            }
            
            if (log.eventType === 'contact_creation') {
              console.log(`   ✅ Customer Created: ${log.customerCreated}`);
              console.log(`   👤 Zoho Contact ID: ${log.zohoContactId || 'None'}`);
              console.log(`   📋 Contact Status: ${log.zohoContactStatus || 'Not processed'}`);
            }
            
            if (log.eventType === 'product_creation') {
              console.log(`   ✅ Products Created: ${log.zohoProductsCreated}`);
              console.log(`   ✅ Products Found: ${log.zohoProductsFound}`);
              console.log(`   📋 Product Processing: ${log.productProcessingStatus}`);
              if (log.zohoProductIds) {
                console.log(`   🆔 Zoho Product IDs: ${JSON.stringify(log.zohoProductIds)}`);
              }
            }
            
            if (log.eventType === 'deal_creation') {
              console.log(`   ✅ Deal Count: ${log.dealCount}`);
              console.log(`   📋 Deal Status: ${log.zohoDealStatus}`);
              console.log(`   ✅ Subform Completed: ${log.subformCompleted}`);
              console.log(`   🆔 Zoho Deal ID: ${log.zohoDealId || 'None'}`);
              if (log.shippingOutcomes) {
                console.log(`   📦 Shipping Outcomes: ${JSON.stringify(log.shippingOutcomes, null, 6)}`);
              }
            }
            
            if (log.eventType === 'payment_processing') {
              console.log(`   💳 Payment Method: ${log.paymentMethod}`);
              console.log(`   📋 Payment Status: ${log.paymentStatus}`);
              if (log.paymentErrorCode) {
                console.log(`   ❌ Error Code: ${log.paymentErrorCode}`);
                console.log(`   ❌ Error Message: ${log.paymentErrorMessage}`);
              }
              if (log.authorizeNetResult) {
                console.log(`   💰 Authorize.Net Result: ${JSON.stringify(log.authorizeNetResult, null, 6)}`);
              }
            }
            
            if (log.appResponseData) {
              console.log(`   📄 APP Response Data: ${JSON.stringify(log.appResponseData, null, 6)}`);
            }
          });
          
          // Step 7: Get order summary for APP Response field
          console.log('\n📊 Step 7: Getting order summary for Zoho APP Response field...');
          const summaryResponse = await axios.get(`${API_BASE}/api/orders/${orderId}/activity-summary`);
          
          if (summaryResponse.data) {
            console.log('\n📋 ORDER SUMMARY FOR ZOHO APP RESPONSE FIELD:');
            console.log('=' .repeat(80));
            console.log(JSON.stringify(summaryResponse.data, null, 2));
          }
          
        } else {
          console.log('❌ No activity logs found for this order');
        }
        
      } catch (logsError) {
        console.log('❌ Failed to retrieve activity logs:', logsError.response?.data || logsError.message);
      }
      
    } else {
      console.log('❌ Order creation failed:', orderResponse.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Error details:', error.response.data.details);
    }
  }
}

// Run the comprehensive test
console.log('🚀 Starting comprehensive order logging test...');
testComprehensiveOrderLogging()
  .then(() => {
    console.log('\n✅ Comprehensive logging test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });