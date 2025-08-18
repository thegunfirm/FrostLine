const axios = require('axios');

async function runComprehensiveFakeOrderTest() {
  console.log('🎯 COMPREHENSIVE FAKE ORDER TEST');
  console.log('=================================');
  console.log('✓ Real Inventory: 3 Accessories');
  console.log('✓ Real FFL: Authentic dealer');
  console.log('✓ Authorize.Net: Sandbox environment');
  console.log('✓ Complete order flow with Zoho integration');
  
  try {
    // Step 1: Get real accessories from inventory
    console.log('\n📦 STEP 1: Fetching real accessories from inventory...');
    
    const inventoryResponse = await axios.get('http://localhost:5000/api/products', {
      params: {
        category: 'Accessories',
        limit: 10
      }
    });
    
    if (!inventoryResponse.data || inventoryResponse.data.length === 0) {
      throw new Error('No accessories found in inventory');
    }
    
    // Select 3 accessories that don't require FFL
    const accessories = inventoryResponse.data
      .filter(product => !product.requires_ffl)
      .slice(0, 3);
    
    if (accessories.length < 3) {
      throw new Error('Not enough non-FFL accessories found');
    }
    
    console.log('✅ Found 3 real accessories:');
    accessories.forEach((acc, index) => {
      console.log(`  ${index + 1}. ${acc.name} (SKU: ${acc.sku}) - $${acc.price_bronze}`);
    });
    
    // Step 2: Get a real FFL dealer
    console.log('\n🏪 STEP 2: Fetching real FFL dealer...');
    
    const fflResponse = await axios.get('http://localhost:5000/api/ffl-dealers', {
      params: {
        state: 'TX', // Texas
        limit: 1
      }
    });
    
    if (!fflResponse.data || fflResponse.data.length === 0) {
      throw new Error('No FFL dealers found');
    }
    
    const realFFL = fflResponse.data[0];
    console.log(`✅ Selected real FFL: ${realFFL.business_name}`);
    console.log(`   License: ${realFFL.license_number}`);
    console.log(`   Address: ${realFFL.premise_street}, ${realFFL.premise_city}, ${realFFL.premise_state}`);
    
    // Step 3: Create fake customer account
    console.log('\n👤 STEP 3: Creating fake customer account...');
    
    const fakeCustomer = {
      email: `test.customer.${Date.now()}@faketest.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Customer',
      tier: 'Bronze'
    };
    
    const customerResponse = await axios.post('http://localhost:5000/api/auth/register', fakeCustomer);
    
    if (!customerResponse.data.success) {
      throw new Error('Failed to create fake customer');
    }
    
    console.log(`✅ Created fake customer: ${fakeCustomer.email}`);
    console.log(`   Tier: ${fakeCustomer.tier}`);
    
    // Step 4: Calculate order total
    console.log('\n💰 STEP 4: Calculating order total...');
    
    const orderItems = accessories.map(acc => ({
      productId: acc.id,
      sku: acc.sku,
      name: acc.name,
      quantity: 1,
      unitPrice: acc.price_bronze,
      totalPrice: acc.price_bronze,
      manufacturer: acc.manufacturer,
      category: acc.category,
      rsrStockNumber: acc.rsr_stock_number,
      fflRequired: false,
      dropShipEligible: acc.drop_ship_eligible,
      inHouseOnly: acc.in_house_only
    }));
    
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.08; // 8% tax
    const shipping = 15.99; // Standard shipping
    const total = subtotal + tax + shipping;
    
    console.log('✅ Order calculation:');
    console.log(`   Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`   Tax (8%): $${tax.toFixed(2)}`);
    console.log(`   Shipping: $${shipping.toFixed(2)}`);
    console.log(`   Total: $${total.toFixed(2)}`);
    
    // Step 5: Process Authorize.Net payment (sandbox)
    console.log('\n💳 STEP 5: Processing Authorize.Net sandbox payment...');
    
    const paymentData = {
      amount: total,
      cardNumber: '4111111111111111', // Test Visa card
      expirationDate: '12/25',
      cvv: '123',
      billingAddress: {
        firstName: fakeCustomer.firstName,
        lastName: fakeCustomer.lastName,
        address: '123 Test Street',
        city: 'Test City',
        state: 'TX',
        zip: '75001'
      }
    };
    
    const paymentResponse = await axios.post('http://localhost:5000/api/payment/process', paymentData);
    
    if (!paymentResponse.data.success) {
      throw new Error('Sandbox payment failed');
    }
    
    console.log('✅ Sandbox payment processed successfully');
    console.log(`   Transaction ID: ${paymentResponse.data.transactionId}`);
    console.log(`   Amount: $${paymentResponse.data.amount}`);
    
    // Step 6: Create complete order
    console.log('\n📝 STEP 6: Creating complete order...');
    
    const orderData = {
      customerId: customerResponse.data.user.id,
      customerEmail: fakeCustomer.email,
      items: orderItems,
      subtotal: subtotal,
      tax: tax,
      shipping: shipping,
      total: total,
      paymentMethod: 'authorize_net',
      transactionId: paymentResponse.data.transactionId,
      billingAddress: paymentData.billingAddress,
      shippingAddress: paymentData.billingAddress, // Same as billing for test
      membershipTier: fakeCustomer.tier,
      fflDealerId: realFFL.id,
      fflRequired: false, // Accessories don't require FFL
      orderStatus: 'pending',
      fulfillmentType: 'direct_to_customer'
    };
    
    const orderResponse = await axios.post('http://localhost:5000/api/orders', orderData);
    
    if (!orderResponse.data.success) {
      throw new Error('Order creation failed');
    }
    
    const orderId = orderResponse.data.orderId;
    const orderNumber = orderResponse.data.orderNumber;
    
    console.log('✅ Order created successfully');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Order Number: ${orderNumber}`);
    
    // Step 7: Verify Zoho CRM integration
    console.log('\n🔗 STEP 7: Verifying Zoho CRM integration...');
    
    // Wait for Zoho processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const zohoResponse = await axios.get(`http://localhost:5000/api/zoho/verify-order-sync/${orderNumber}`);
    
    if (zohoResponse.data.success) {
      console.log('✅ Order successfully synced to Zoho CRM');
      console.log(`   Deal ID: ${zohoResponse.data.dealId}`);
      console.log(`   Deal Name: ${zohoResponse.data.dealName}`);
      
      // Verify subform population
      if (zohoResponse.data.subform && zohoResponse.data.subform.length > 0) {
        console.log(`✅ Subform populated with ${zohoResponse.data.subform.length} items`);
        
        zohoResponse.data.subform.forEach((item, index) => {
          console.log(`   Item ${index + 1}: ${item.Product_Name} (${item.Product_Code})`);
          console.log(`     RSR Stock: ${item.Distributor_Part_Number}`);
          console.log(`     Price: $${item.Unit_Price}`);
        });
      }
    }
    
    // Step 8: Comprehensive verification
    console.log('\n✅ STEP 8: Comprehensive verification...');
    
    const verificationResults = {
      realInventoryUsed: accessories.length === 3,
      realFflSelected: !!realFFL.license_number,
      paymentProcessed: paymentResponse.data.success,
      orderCreated: orderResponse.data.success,
      zohoIntegrated: zohoResponse.data.success,
      subformPopulated: zohoResponse.data.subform?.length > 0
    };
    
    console.log('🎯 COMPREHENSIVE TEST RESULTS:');
    console.log('==============================');
    console.log(`✓ Real Inventory (3 accessories): ${verificationResults.realInventoryUsed ? '✅' : '❌'}`);
    console.log(`✓ Real FFL dealer: ${verificationResults.realFflSelected ? '✅' : '❌'}`);
    console.log(`✓ Authorize.Net sandbox payment: ${verificationResults.paymentProcessed ? '✅' : '❌'}`);
    console.log(`✓ Order creation: ${verificationResults.orderCreated ? '✅' : '❌'}`);
    console.log(`✓ Zoho CRM integration: ${verificationResults.zohoIntegrated ? '✅' : '❌'}`);
    console.log(`✓ Subform population: ${verificationResults.subformPopulated ? '✅' : '❌'}`);
    
    const allTestsPassed = Object.values(verificationResults).every(result => result === true);
    
    if (allTestsPassed) {
      console.log('\n🏆 SUCCESS: All comprehensive tests PASSED!');
      console.log('🎊 The complete order flow is fully operational:');
      console.log('   • Real inventory → Order processing');
      console.log('   • Real FFL → Order routing');
      console.log('   • Authorize.Net → Payment processing');
      console.log('   • Zoho CRM → Order tracking');
      console.log('   • Subform → Product details');
      
      return {
        success: true,
        allTestsPassed: true,
        orderId: orderId,
        orderNumber: orderNumber,
        dealId: zohoResponse.data.dealId,
        accessories: accessories,
        ffl: realFFL,
        verificationResults: verificationResults
      };
    } else {
      console.log('\n⚠️ Some tests failed - see details above');
      return {
        success: false,
        verificationResults: verificationResults
      };
    }
    
  } catch (error) {
    console.error('\n❌ Comprehensive test failed:', error.message);
    console.error('Error details:', error.response?.data || error);
    
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = runComprehensiveFakeOrderTest;
}

// Run if called directly
if (require.main === module) {
  runComprehensiveFakeOrderTest().then(result => {
    console.log('\n🏁 COMPREHENSIVE FAKE ORDER TEST COMPLETE');
    console.log('=========================================');
    console.log('Final Result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.allTestsPassed) {
      console.log('\n🎉 MILESTONE ACHIEVED!');
      console.log('The complete order processing system is fully operational!');
    }
  });
}