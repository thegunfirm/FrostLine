/**
 * Direct test of Zoho UPC field integration by calling the internal order processing
 */

async function testZohoUPCDirect() {
  console.log('🔍 Testing Zoho UPC field integration directly...');
  
  try {
    // Import the order-zoho-integration service
    const { OrderToZohoIntegration } = await import('./server/order-zoho-integration.ts');
    
    // Create test order data with UPC code
    const testOrderData = {
      customerEmail: 'upc.direct.test@thegunfirm.com',
      contactFirstName: 'UPC',
      contactLastName: 'DirectTest',
      customerName: 'UPC DirectTest',
      orderNumber: `UPC-DIRECT-${Date.now()}`,
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
      fflDealerName: null,
      engineResponse: null // No RSR engine response for testing
    };

    console.log('📦 Testing UPC field for product:', testOrderData.orderItems[0].productName);
    console.log('🏷️  UPC Code:', testOrderData.orderItems[0].upcCode);
    console.log('📋 RSR Stock Number:', testOrderData.orderItems[0].rsrStockNumber);
    
    // Create the integration service and process the order
    const integration = new OrderToZohoIntegration();
    
    console.log('🔄 Processing order through Zoho integration...');
    const result = await integration.processSystemOrder(testOrderData);
    
    console.log('📥 Integration result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(`✅ Order processed successfully`);
      console.log(`📋 Deal ID: ${result.dealId}`);
      console.log(`📋 TGF Order Number: ${result.tgfOrderNumber}`);
      
      const dealId = result.dealId;
      
      // Wait for subform population
      console.log('⏳ Waiting for subform population...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Import Zoho service to check the deal
      const { ZohoService } = await import('./server/zoho-service.ts');
      const zohoService = new ZohoService();
      
      console.log(`🔍 Checking deal ${dealId} for UPC field...`);
      
      try {
        // Get the deal details
        const dealResponse = await zohoService.makeAPIRequest(`Deals/${dealId}`);
        console.log('📋 Deal details:', JSON.stringify(dealResponse, null, 2));
        
        // Check for subform data
        if (dealResponse.data && dealResponse.data.length > 0) {
          const deal = dealResponse.data[0];
          
          // Check if the deal has subform data with UPC
          if (deal.Subform_1 && deal.Subform_1.length > 0) {
            const subformItem = deal.Subform_1[0];
            
            console.log(`📋 Subform data found:`);
            console.log(`   - Product_Name: ${subformItem.Product_Name}`);
            console.log(`   - Product_Code: ${subformItem.Product_Code}`);
            console.log(`   - Distributor_Part_Number: ${subformItem.Distributor_Part_Number}`);
            console.log(`   - UPC: ${subformItem.UPC || 'NOT FOUND'}`);
            
            if (subformItem.UPC) {
              console.log(`✅ UPC field populated: ${subformItem.UPC}`);
              
              if (subformItem.UPC === testOrderData.orderItems[0].upcCode) {
                console.log(`🎉 UPC FIELD SUCCESS! UPC code ${subformItem.UPC} correctly populated in Zoho subform.`);
                return true;
              } else {
                console.log(`❌ UPC mismatch: expected ${testOrderData.orderItems[0].upcCode}, got ${subformItem.UPC}`);
                return false;
              }
            } else {
              console.log(`❌ UPC field missing from subform`);
              return false;
            }
          } else {
            console.log(`❌ No subform data found in deal`);
            return false;
          }
        } else {
          console.log(`❌ No deal data found`);
          return false;
        }
        
      } catch (checkError) {
        console.error('❌ Error checking deal:', checkError.message);
        return false;
      }
      
    } else {
      console.error(`❌ Order processing failed:`, result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Direct UPC test failed:', error.message);
    return false;
  }
}

// Run the test
testZohoUPCDirect()
  .then((success) => {
    console.log('🏁 Direct Zoho UPC test completed');
    if (success) {
      console.log('✅ UPC field integration is working correctly!');
    } else {
      console.log('❌ UPC field integration needs attention');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });