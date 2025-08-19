/**
 * Test UPC field population in Zoho Products module and deal subforms
 */

const fetch = require('node-fetch');

async function testUPCFieldVerification() {
  console.log('🔍 Testing UPC field population in Zoho CRM...');
  
  try {
    // Test order with a product that has UPC code
    const testOrderData = {
      customerEmail: 'test@thegunfirm.com',
      customerName: 'UPC Test Customer',
      totalAmount: 29.99,
      paymentMethod: 'credit_card',
      authorizeNetTransactionId: `UPC-TEST-${Date.now()}`,
      membershipTier: 'Bronze',
      cartItems: [
        {
          id: 90398,
          name: 'MAG RUGER 10/22 22LR 10RD BLK POLY',
          sku: '90398', // Manufacturer part number 
          quantity: 1,
          price: 29.99,
          isFirearm: false,
          requiresFFL: false,
          manufacturer: 'Magpul',
          // Additional fields for Zoho integration
          upcCode: '736676903986', // UPC code
          rsrStockNumber: 'MGRUG90398',
          distributorPartNumber: 'MGRUG90398',
          category: 'Magazines',
          dropShipEligible: true,
          inHouseOnly: false
        }
      ],
      shippingAddress: {
        name: 'UPC Test Customer',
        address1: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zip: '12345',
        country: 'US'
      },
      billingAddress: {
        name: 'UPC Test Customer',
        address1: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zip: '12345',
        country: 'US'
      }
    };

    console.log('📦 Creating test order with UPC code:', testOrderData.cartItems[0].upcCode);
    
    // Submit the test order
    const orderResponse = await fetch('http://localhost:5000/api/checkout/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    });

    const orderResult = await orderResponse.json();
    console.log('📥 Order response:', JSON.stringify(orderResult, null, 2));

    if (orderResult.success) {
      console.log(`✅ Test order created successfully`);
      console.log(`📋 Order details:`);
      console.log(`   - Order ID: ${orderResult.orderId}`);
      console.log(`   - TGF Order Number: ${orderResult.tgfOrderNumber}`);
      console.log(`   - Zoho Deal ID: ${orderResult.zohoResponse?.dealId}`);
      
      if (orderResult.zohoResponse?.dealId) {
        // Wait a moment for subform population
        console.log('⏳ Waiting for subform population...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify UPC field in deal subform
        const dealId = orderResult.zohoResponse.dealId;
        console.log(`🔍 Checking UPC field in deal ${dealId} subform...`);
        
        try {
          const verifyResponse = await fetch(`http://localhost:5000/api/admin/zoho/deals/${dealId}/verification`);
          const verifyResult = await verifyResponse.json();
          
          if (verifyResult.subformData && verifyResult.subformData.length > 0) {
            const subformItem = verifyResult.subformData[0];
            console.log(`📋 Subform data:`, JSON.stringify(subformItem, null, 2));
            
            if (subformItem.UPC) {
              console.log(`✅ UPC field populated in subform: ${subformItem.UPC}`);
              console.log(`🎯 Expected UPC: ${testOrderData.cartItems[0].upcCode}`);
              
              if (subformItem.UPC === testOrderData.cartItems[0].upcCode) {
                console.log(`🎉 UPC FIELD VERIFICATION SUCCESS! UPC code correctly populated in Zoho subform.`);
              } else {
                console.log(`❌ UPC mismatch: expected ${testOrderData.cartItems[0].upcCode}, got ${subformItem.UPC}`);
              }
            } else {
              console.log(`❌ UPC field not found in subform data`);
            }
          } else {
            console.log(`❌ No subform data found for deal ${dealId}`);
          }
        } catch (verifyError) {
          console.error('❌ Error verifying subform data:', verifyError.message);
        }
        
        // Also check if product was created with UPC in Products module
        const sku = testOrderData.cartItems[0].sku; // Manufacturer part number
        console.log(`🔍 Checking if product ${sku} was created with UPC in Products module...`);
        
        try {
          const productResponse = await fetch(`http://localhost:5000/api/zoho/products/verify/${sku}`);
          const productResult = await productResponse.json();
          
          if (productResult.found) {
            console.log(`📋 Product found in Zoho:`, JSON.stringify(productResult, null, 2));
            if (productResult.UPC) {
              console.log(`✅ UPC field populated in Product: ${productResult.UPC}`);
            } else {
              console.log(`❌ UPC field not found in Product module`);
            }
          } else {
            console.log(`❌ Product ${sku} not found in Zoho Products module`);
          }
        } catch (productError) {
          console.error('❌ Error checking product:', productError.message);
        }
      }
      
    } else {
      console.error(`❌ Test order failed:`, orderResult.error);
    }

  } catch (error) {
    console.error('❌ UPC field verification test failed:', error);
  }
}

// Run the test
testUPCFieldVerification()
  .then(() => {
    console.log('🏁 UPC field verification test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });