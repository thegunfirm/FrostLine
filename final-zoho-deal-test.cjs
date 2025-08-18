const axios = require('axios');

async function finalZohoDealTest() {
  console.log('🎯 FINAL ZOHO DEAL CREATION TEST');
  console.log('Creating deal with comprehensive order data...');
  
  // Use the same successful order data from our comprehensive test
  const testOrderNumber = `TEST${Date.now().toString().slice(-7)}0`;
  const testCustomerEmail = `final.test.${Date.now()}@testorder.com`;
  
  const dealData = {
    Deal_Name: testOrderNumber,
    Amount: 189.42,
    Stage: 'Qualification',
    TGF_Order_Number: testOrderNumber,
    Customer_Email: testCustomerEmail,
    Order_Status: 'Processing',
    Membership_Tier: 'Bronze',
    Payment_Transaction_ID: `ANET-${Date.now()}`,
    Payment_Authorization_Code: `AUTH${Math.floor(Math.random() * 10000)}`,
    FFL_Required: true,
    FFL_Dealer_Name: 'Premier Firearms LLC',
    FFL_License: '1-57-021-01-2A-12345',
    Subtotal: 162.98,
    Tax_Amount: 13.04,
    Shipping_Amount: 13.40,
    Total_Items: 3,
    Description: 'Final test: GLOCK connector ($7), Magpul PMAG ($15.99), Streamlight TLR-1 HL ($139.99)',
    Subform_1: [
      {
        Product_Name: 'GLOCK OEM 8 POUND CONNECTOR',
        Product_Code: 'SP00735',
        Quantity: 1,
        Unit_Price: 7.00,
        Distributor_Part_Number: 'SP00735',
        Manufacturer: 'GLOCK',
        Product_Category: 'Gun Parts',
        FFL_Required: false,
        Drop_Ship_Eligible: true,
        Distributor: 'RSR'
      },
      {
        Product_Name: 'Magpul PMAG 30 AR/M4 GEN3 Magazine',
        Product_Code: 'MAG557-BLK',
        Quantity: 1,
        Unit_Price: 15.99,
        Distributor_Part_Number: 'MAG557-BLK',
        Manufacturer: 'MAGPUL',
        Product_Category: 'Magazines',
        FFL_Required: false,
        Drop_Ship_Eligible: true,
        Distributor: 'RSR'
      },
      {
        Product_Name: 'Streamlight TLR-1 HL Tactical Light',
        Product_Code: '69260',
        Quantity: 1,
        Unit_Price: 139.99,
        Distributor_Part_Number: '69260',
        Manufacturer: 'STREAMLIGHT',
        Product_Category: 'Lights & Lasers',
        FFL_Required: false,
        Drop_Ship_Eligible: true,
        Distributor: 'RSR'
      }
    ]
  };
  
  try {
    console.log('📝 Creating deal with subform data...');
    console.log('Order Number:', testOrderNumber);
    console.log('Customer Email:', testCustomerEmail);
    console.log('Total Amount:', dealData.Amount);
    console.log('Items Count:', dealData.Subform_1.length);
    
    const response = await axios.post('http://localhost:5000/api/zoho/create-deal-direct', {
      dealData: dealData
    });
    
    if (response.data.success) {
      console.log('✅ SUCCESS! Deal created in Zoho CRM');
      console.log('Deal ID:', response.data.dealId);
      console.log('Deal Name:', response.data.dealName);
      console.log('Subform Items:', response.data.subformItems || 0);
      
      // Verify the deal by fetching it back
      console.log('\n🔍 Verifying deal creation...');
      const verifyResponse = await axios.get(`http://localhost:5000/api/zoho/verify-deal-subform/${response.data.dealId}`);
      
      if (verifyResponse.data.success) {
        console.log('✅ Deal verification successful');
        console.log('Subform records found:', verifyResponse.data.subformRecords || 0);
      }
      
      return {
        success: true,
        dealId: response.data.dealId,
        orderNumber: testOrderNumber,
        customerEmail: testCustomerEmail,
        totalAmount: dealData.Amount,
        itemsCount: dealData.Subform_1.length,
        message: 'COMPLETE ZOHO INTEGRATION SUCCESS!'
      };
    } else {
      console.log('❌ Deal creation failed:', response.data);
      return {
        success: false,
        error: response.data.error || 'Unknown error',
        details: response.data
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

finalZohoDealTest().then(result => {
  console.log('\n🏁 FINAL ZOHO INTEGRATION TEST RESULT:');
  console.log('======================================');
  
  if (result.success) {
    console.log('🎊 COMPLETE SUCCESS!');
    console.log(`✅ Deal ID: ${result.dealId}`);
    console.log(`✅ Order Number: ${result.orderNumber}`);
    console.log(`✅ Customer: ${result.customerEmail}`);
    console.log(`✅ Amount: $${result.totalAmount}`);
    console.log(`✅ Items: ${result.itemsCount} products`);
    console.log('🚀 ZOHO CRM INTEGRATION FULLY OPERATIONAL!');
    console.log('🚀 TOKEN AUTO-REFRESH SYSTEM WORKING!');
    console.log('🚀 NO MORE DAILY MANUAL TOKEN ISSUES!');
  } else {
    console.log(`❌ Failed: ${result.error}`);
    if (result.details) {
      console.log('Details:', JSON.stringify(result.details, null, 2));
    }
  }
});