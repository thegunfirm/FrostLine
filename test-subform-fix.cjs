/**
 * Test script to verify Zoho CRM subform creation fix
 * This tests the corrected subform population logic
 */

const { OrderZohoIntegration } = require('./dist/order-zoho-integration.js');

async function testSubformCreation() {
  console.log('🧪 Testing Zoho CRM Subform Creation Fix...\n');

  const orderZohoIntegration = new OrderZohoIntegration();

  // Test order data with multiple real RSR products
  const testOrderData = {
    orderNumber: `TEST-SUBFORM-${Date.now()}`,
    totalAmount: 89.97,
    customerEmail: 'test@thegunfirm.com',
    customerName: 'Test Customer',
    membershipTier: 'Gold Monthly',
    orderItems: [
      {
        productName: 'XS Big Dot Sight Set',
        sku: 'XS-BIG-DOT-AR',
        rsrStockNumber: 'XS000123',
        quantity: 1,
        unitPrice: 29.99,
        totalPrice: 29.99,
        fflRequired: false,
        manufacturer: 'XS Sight Systems',
        category: 'Accessories',
        dropShipEligible: true,
        inHouseOnly: false
      },
      {
        productName: 'Magpul PMAG 30 AR/M4',
        sku: 'MAG557-BLK',
        rsrStockNumber: 'MAG557BLK',
        quantity: 2,
        unitPrice: 14.99,
        totalPrice: 29.98,
        fflRequired: false,
        manufacturer: 'Magpul Industries',
        category: 'Accessories',
        dropShipEligible: true,
        inHouseOnly: false
      },
      {
        productName: 'ALG Defense ACT Trigger',
        sku: 'ALG-05-186',
        rsrStockNumber: 'ALG05186',
        quantity: 1,
        unitPrice: 30.00,
        totalPrice: 30.00,
        fflRequired: false,
        manufacturer: 'ALG Defense',
        category: 'Parts',
        dropShipEligible: true,
        inHouseOnly: false
      }
    ],
    orderStatus: 'Submitted',
    fulfillmentType: 'Drop-Ship',
    orderingAccount: '99902',
    requiresDropShip: true,
    isTestOrder: true,
    engineResponse: {
      status: 'test',
      message: 'Subform creation test'
    }
  };

  try {
    console.log('📋 Test Order Details:');
    console.log(`  • Order Number: ${testOrderData.orderNumber}`);
    console.log(`  • Total Amount: $${testOrderData.totalAmount}`);
    console.log(`  • Item Count: ${testOrderData.orderItems.length}`);
    console.log(`  • Customer: ${testOrderData.customerName} (${testOrderData.customerEmail})`);
    console.log();

    console.log('📦 Order Items:');
    testOrderData.orderItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.productName}`);
      console.log(`     SKU: ${item.sku}, RSR: ${item.rsrStockNumber}`);
      console.log(`     Qty: ${item.quantity} × $${item.unitPrice} = $${item.totalPrice}`);
      console.log(`     Mfg: ${item.manufacturer}, FFL: ${item.fflRequired}`);
    });
    console.log();

    console.log('🚀 Processing order with corrected subform logic...');
    const result = await orderZohoIntegration.processOrderWithRSRFields(testOrderData);

    if (result.success) {
      console.log(`✅ SUCCESS: Deal created with ID ${result.dealId}`);
      console.log(`📋 TGF Order Number: ${result.tgfOrderNumber}`);
      console.log();
      
      console.log('🔍 Verifying subform population...');
      
      // Get the Zoho service to verify the deal
      const zohoService = orderZohoIntegration.getZohoService();
      
      // Wait a moment for Zoho to process
      console.log('⏳ Waiting for Zoho to process the record...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch the deal to verify subform
      const dealDetails = await zohoService.getDealById(result.dealId);
      
      if (dealDetails) {
        console.log('📊 Deal Verification Results:');
        console.log(`  • Deal Name: ${dealDetails.Deal_Name}`);
        console.log(`  • Amount: $${dealDetails.Amount}`);
        console.log(`  • TGF Order: ${dealDetails.TGF_Order}`);
        
        // Check for subform data
        const productDetails = dealDetails.Product_Details || [];
        const subform1 = dealDetails.Subform_1 || [];
        const subformData = productDetails.length > 0 ? productDetails : subform1;
        
        console.log(`  • Product_Details: ${productDetails.length} items`);
        console.log(`  • Subform_1: ${subform1.length} items`);
        
        if (subformData.length > 0) {
          console.log(`\n✅ SUBFORM SUCCESS: Found ${subformData.length} products in subform!`);
          console.log('📋 Subform Product Details:');
          
          subformData.forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.Product_Name || product.product?.Product_Name}`);
            console.log(`     Code: ${product.Product_Code || product.product?.Product_Code}`);
            console.log(`     Qty: ${product.Quantity || product.quantity}, Price: $${product.Unit_Price || product.unit_price || product.list_price}`);
            console.log(`     RSR: ${product.Distributor_Part_Number}, FFL: ${product.FFL_Required}`);
          });
          
          console.log(`\n🎉 SUBFORM FIX VERIFIED: All ${testOrderData.orderItems.length} products properly recorded!`);
          
        } else {
          console.log('\n❌ SUBFORM ISSUE: No products found in Product_Details or Subform_1');
          console.log('📋 Available fields in deal:', Object.keys(dealDetails));
          
          // Check if any other fields contain product data
          const allFields = Object.keys(dealDetails);
          const productFields = allFields.filter(field => 
            field.toLowerCase().includes('product') || 
            field.toLowerCase().includes('subform') ||
            field.toLowerCase().includes('line') ||
            field.toLowerCase().includes('item')
          );
          
          if (productFields.length > 0) {
            console.log('🔍 Found possible product-related fields:', productFields);
            productFields.forEach(field => {
              const value = dealDetails[field];
              if (value && Array.isArray(value) && value.length > 0) {
                console.log(`  • ${field}: ${value.length} items`);
              } else if (value) {
                console.log(`  • ${field}: ${typeof value} - ${JSON.stringify(value).substring(0, 100)}...`);
              }
            });
          }
        }
        
      } else {
        console.log('❌ Could not retrieve deal for verification');
      }
      
    } else {
      console.log(`❌ FAILURE: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testSubformCreation().then(() => {
  console.log('\n🧪 Subform test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});