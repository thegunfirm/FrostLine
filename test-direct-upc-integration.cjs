/**
 * Direct test of UPC field integration in Zoho CRM
 * Bypasses payment processing to focus on UPC field mapping
 */

const fetch = require('node-fetch');

async function testDirectUPCIntegration() {
  console.log('🔍 Testing direct UPC integration with Zoho CRM...');
  
  try {
    // Create test order data with UPC code
    const testOrderData = {
      customerEmail: 'upc.test@thegunfirm.com',
      contactFirstName: 'UPC',
      contactLastName: 'Tester',
      customerName: 'UPC Tester',
      orderNumber: `UPC-TEST-${Date.now()}`,
      totalAmount: 39.99,
      membershipTier: 'Bronze',
      orderItems: [
        {
          id: 90398,
          sku: '90398', // Manufacturer part number
          productName: 'MAG RUGER 10/22 22LR 10RD BLK POLY',
          name: 'MAG RUGER 10/22 22LR 10RD BLK POLY',
          manufacturer: 'Magpul',
          category: 'Magazines',
          quantity: 1,
          unitPrice: 39.99,
          price: 39.99,
          rsrStockNumber: 'MGRUG90398',
          distributorPartNumber: 'MGRUG90398',
          upcCode: '736676903986', // UPC code to test
          fflRequired: false,
          requiresFFL: false,
          isFirearm: false,
          dropShipEligible: true,
          inHouseOnly: false
        }
      ],
      fflRequired: false,
      fflDealerName: null
    };

    console.log('📦 Testing UPC integration for product:', testOrderData.orderItems[0].productName);
    console.log('🏷️  UPC Code:', testOrderData.orderItems[0].upcCode);
    
    // Call the RSR order-to-Zoho integration directly
    const integrationResponse = await fetch('http://localhost:5000/api/admin/zoho/create-rsr-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    });

    const integrationResult = await integrationResponse.json();
    console.log('📥 Integration response:', JSON.stringify(integrationResult, null, 2));

    if (integrationResult.success) {
      console.log(`✅ Direct integration successful`);
      console.log(`📋 Deal ID: ${integrationResult.dealId}`);
      console.log(`📋 TGF Order Number: ${integrationResult.tgfOrderNumber}`);
      
      const dealId = integrationResult.dealId;
      
      // Wait for subform population
      console.log('⏳ Waiting for subform and product creation...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check the created deal for UPC field in subform
      console.log(`🔍 Verifying UPC field in deal ${dealId}...`);
      
      try {
        const verifyResponse = await fetch(`http://localhost:5000/api/admin/zoho/deals/${dealId}/verification`);
        const verifyResult = await verifyResponse.json();
        
        console.log('📋 Verification result:', JSON.stringify(verifyResult, null, 2));
        
        if (verifyResult.subformData && verifyResult.subformData.length > 0) {
          const subformItem = verifyResult.subformData[0];
          
          console.log(`📋 Subform item details:`);
          console.log(`   - Product_Name: ${subformItem.Product_Name}`);
          console.log(`   - Product_Code: ${subformItem.Product_Code}`);
          console.log(`   - Distributor_Part_Number: ${subformItem.Distributor_Part_Number}`);
          console.log(`   - UPC: ${subformItem.UPC || 'NOT FOUND'}`);
          
          if (subformItem.UPC) {
            console.log(`✅ UPC field found in subform: ${subformItem.UPC}`);
            
            if (subformItem.UPC === testOrderData.orderItems[0].upcCode) {
              console.log(`🎉 UPC INTEGRATION SUCCESS! UPC code ${subformItem.UPC} correctly populated in Zoho subform.`);
            } else {
              console.log(`❌ UPC mismatch: expected ${testOrderData.orderItems[0].upcCode}, got ${subformItem.UPC}`);
            }
          } else {
            console.log(`❌ UPC field not populated in subform`);
          }
        } else {
          console.log(`❌ No subform data found`);
        }
        
      } catch (verifyError) {
        console.error('❌ Error verifying deal:', verifyError.message);
      }
      
      // Also verify product was created with UPC in Products module
      const sku = testOrderData.orderItems[0].sku;
      console.log(`🔍 Checking product ${sku} in Products module...`);
      
      try {
        const productResponse = await fetch(`http://localhost:5000/api/zoho/products/verify/${sku}`);
        if (productResponse.ok) {
          const productResult = await productResponse.json();
          
          if (productResult.found) {
            console.log(`📋 Product found in Zoho Products module`);
            console.log(`   - Product_Name: ${productResult.Product_Name}`);
            console.log(`   - Mfg_Part_Number: ${productResult.Mfg_Part_Number}`);
            console.log(`   - RSR_Stock_Number: ${productResult.RSR_Stock_Number}`);
            console.log(`   - UPC: ${productResult.UPC || 'NOT FOUND'}`);
            
            if (productResult.UPC) {
              console.log(`✅ UPC field found in product: ${productResult.UPC}`);
              
              if (productResult.UPC === testOrderData.orderItems[0].upcCode) {
                console.log(`🎉 PRODUCT UPC SUCCESS! UPC code correctly populated in Products module.`);
              } else {
                console.log(`❌ Product UPC mismatch: expected ${testOrderData.orderItems[0].upcCode}, got ${productResult.UPC}`);
              }
            } else {
              console.log(`❌ UPC field not populated in product`);
            }
          } else {
            console.log(`❌ Product ${sku} not found in Zoho Products module`);
          }
        } else {
          console.log(`❌ Error checking product: ${productResponse.status}`);
        }
      } catch (productError) {
        console.error('❌ Error checking product:', productError.message);
      }
      
    } else {
      console.error(`❌ Direct integration failed:`, integrationResult.error);
    }

  } catch (error) {
    console.error('❌ Direct UPC integration test failed:', error);
  }
}

// Run the test
testDirectUPCIntegration()
  .then(() => {
    console.log('🏁 Direct UPC integration test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });