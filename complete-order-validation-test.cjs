const axios = require('axios');

async function completeOrderValidationTest() {
  console.log('🎯 COMPLETE ORDER VALIDATION TEST');
  console.log('Testing entire order flow with fresh token...');
  
  try {
    // Step 1: Force token refresh
    console.log('\n1️⃣ Refreshing Zoho token...');
    const refreshResponse = await axios.post('http://localhost:5000/api/zoho/refresh-token');
    
    if (!refreshResponse.data.success) {
      throw new Error('Token refresh failed');
    }
    console.log('✅ Token refreshed successfully');
    
    // Wait for token to be set properly
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Test comprehensive fake order
    console.log('\n2️⃣ Testing comprehensive fake order...');
    const orderResponse = await axios.post('http://localhost:5000/api/create-comprehensive-fake-order-test');
    
    if (!orderResponse.data.success) {
      throw new Error(`Order test failed: ${orderResponse.data.error}`);
    }
    
    console.log('✅ Order processing successful!');
    console.log('Order Number:', orderResponse.data.orderNumber);
    console.log('Total Amount:', orderResponse.data.totalAmount);
    console.log('Payment Transaction:', orderResponse.data.transactionId);
    
    // Step 3: Now test Zoho deal creation with the prepared order data
    console.log('\n3️⃣ Creating Zoho deal from order...');
    
    const dealData = {
      Deal_Name: orderResponse.data.orderNumber,
      Amount: parseFloat(orderResponse.data.totalAmount),
      Stage: 'Qualification',
      TGF_Order_Number: orderResponse.data.orderNumber,
      Customer_Email: orderResponse.data.customerEmail,
      Order_Status: 'Processing',
      Membership_Tier: 'Bronze',
      Payment_Transaction_ID: orderResponse.data.transactionId,
      Description: `Comprehensive test order with ${orderResponse.data.itemCount} items`
    };
    
    const dealCreateResponse = await axios.post('http://localhost:5000/api/zoho/create-deal-direct', {
      dealData: dealData
    });
    
    if (dealCreateResponse.data.success) {
      console.log('✅ Zoho deal created successfully!');
      console.log('Deal ID:', dealCreateResponse.data.dealId);
      console.log('Deal Name:', dealCreateResponse.data.dealName);
      
      return {
        success: true,
        orderNumber: orderResponse.data.orderNumber,
        dealId: dealCreateResponse.data.dealId,
        totalAmount: orderResponse.data.totalAmount,
        transactionId: orderResponse.data.transactionId,
        message: 'Complete order flow validated successfully!'
      };
    } else {
      console.log('❌ Zoho deal creation failed:', dealCreateResponse.data);
      return {
        success: false,
        orderSuccess: true,
        orderNumber: orderResponse.data.orderNumber,
        error: 'Deal creation failed after successful order processing'
      };
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

completeOrderValidationTest().then(result => {
  console.log('\n🏁 COMPLETE ORDER VALIDATION RESULT:');
  console.log('=====================================');
  
  if (result.success) {
    console.log('🎊 COMPLETE SUCCESS!');
    console.log(`✅ Order Number: ${result.orderNumber}`);
    console.log(`✅ Deal ID: ${result.dealId}`);
    console.log(`✅ Total Amount: ${result.totalAmount}`);
    console.log(`✅ Transaction: ${result.transactionId}`);
    console.log('🚀 ENTIRE SYSTEM IS OPERATIONAL!');
  } else {
    console.log(`❌ ${result.error}`);
    if (result.orderSuccess) {
      console.log(`⚠️ Order processing worked (${result.orderNumber}) but Zoho integration failed`);
    }
  }
});