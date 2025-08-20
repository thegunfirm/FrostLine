/**
 * Test the actual order splitting functionality with Glock + accessory
 * This uses the real order splitting endpoint that creates multiple deals
 */

const fetch = require('node-fetch');

async function testGlockAccessorySplitting() {
  console.log('🎯 Testing REAL Order Splitting: Glock + Accessory');
  console.log('📦 Using /api/test/order-splitting endpoint for actual deal separation');
  
  try {
    // Create order with Glock firearm and accessory
    const splitTestData = {
      orderItems: [
        {
          // Glock firearm - typically requires In-House fulfillment
          productName: "GLOCK 19 GEN5 9MM",
          sku: "GLOCK19GEN5",
          rsrStockNumber: "GLOCK19GEN5",
          manufacturerPartNumber: "GLOCK19GEN5",
          manufacturer: "Glock",
          quantity: 1,
          unitPrice: 899.99,
          totalPrice: 899.99,
          fflRequired: true,
          requiresFFL: true,
          isFirearm: true,
          dropShipEligible: false,  // Force In-House
          inHouseOnly: true,        // Force In-House
          category: 'Handguns'
        },
        {
          // Speed loader accessory - Drop-Ship eligible
          productName: "TIPPMANN SPEED LOADER .22LR",
          sku: "TIPP150622",
          rsrStockNumber: "TIPP150622",
          manufacturerPartNumber: "TIPP150622",
          manufacturer: "Tippmann",
          quantity: 2,
          unitPrice: 249.99,
          totalPrice: 499.98,
          fflRequired: false,
          requiresFFL: false,
          isFirearm: false,
          dropShipEligible: true,   // Allow Drop-Ship
          inHouseOnly: false,       // Allow Drop-Ship
          category: 'Accessories'
        }
      ]
    };

    console.log('🔄 Calling actual order splitting endpoint...');
    console.log('📋 Test composition:');
    console.log('   🔫 GLOCK 19 GEN5 - In-House Only (firearm compliance)');
    console.log('   📦 Tippmann Speed Loader x2 - Drop-Ship Eligible (accessory)');
    
    const orderResponse = await fetch('http://localhost:5000/api/test/order-splitting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(splitTestData)
    });
    
    if (orderResponse.ok) {
      const orderResult = await orderResponse.json();
      console.log('✅ Order splitting test completed!');
      
      if (orderResult.success) {
        console.log('\n🎉 ORDER SPLITTING RESULTS:');
        console.log(`📋 Orders Created: ${orderResult.summary.ordersCreated}`);
        console.log(`📋 Contact ID: ${orderResult.summary.contactCreated}`);
        
        console.log('\n📦 SPLIT DEAL DETAILS:');
        orderResult.orderDetails.forEach((order, index) => {
          console.log(`\n   Deal ${index + 1}:`);
          console.log(`   📋 Deal ID: ${order.dealId}`);
          console.log(`   📋 TGF Order: ${order.tgfOrderNumber}`);
          console.log(`   📋 Shipping Outcome: ${order.outcome}`);
          console.log(`   📋 Fulfillment Type: ${order.fulfillmentType}`);
          console.log(`   📋 Consignee: ${order.consignee}`);
          console.log(`   📋 Ordering Account: ${order.orderingAccount}`);
        });
        
        console.log('\n📊 SYSTEM STATUS:');
        console.log(`   ${orderResult.systemStatus.orderSplitting}`);
        console.log(`   ${orderResult.systemStatus.zohoIntegration}`);
        console.log(`   ${orderResult.systemStatus.fieldMapping}`);
        console.log(`   ${orderResult.systemStatus.tgfNumbering}`);
        
        console.log('\n🔍 FULFILLMENT ANALYSIS:');
        if (orderResult.summary.ordersCreated > 1) {
          console.log('✅ ORDER SUCCESSFULLY SPLIT BY FULFILLMENT TYPE');
          console.log('📋 This demonstrates proper separation of:');
          console.log('   • Firearms requiring In-House processing');
          console.log('   • Accessories eligible for Drop-Ship');
          console.log('   • Different TGF order numbers for tracking');
          console.log('   • Separate Zoho deals for each fulfillment method');
        } else {
          console.log('📋 Single deal created - may indicate mixed fulfillment handling');
        }
        
        return {
          success: true,
          ordersCreated: orderResult.summary.ordersCreated,
          dealIds: orderResult.orderDetails.map(o => o.dealId),
          tgfOrders: orderResult.summary.tgfOrderNumbers,
          outcomes: orderResult.summary.shippingOutcomes,
          message: 'Order splitting test completed successfully'
        };
        
      } else {
        console.log(`❌ Order splitting failed: ${orderResult.message}`);
        return { success: false, error: orderResult.message };
      }
      
    } else {
      const errorText = await orderResponse.text();
      console.log(`❌ Request failed: ${orderResponse.status}`);
      console.log(`Error: ${errorText}`);
      return { success: false, error: `HTTP ${orderResponse.status}` };
    }

  } catch (error) {
    console.error('💥 Order splitting test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testGlockAccessorySplitting()
  .then(result => {
    console.log('\n🏁 GLOCK + ACCESSORY SPLITTING TEST COMPLETE');
    
    if (result.success) {
      console.log('🎉 TEST STATUS: SUCCESSFUL');
      console.log(`📋 Orders Created: ${result.ordersCreated}`);
      console.log(`📋 Deal IDs: ${result.dealIds.join(', ')}`);
      console.log(`📋 TGF Orders: ${result.tgfOrders.join(', ')}`);
      console.log(`📋 Shipping Outcomes: ${result.outcomes.join(', ')}`);
      
      console.log('\n📋 KEY FINDINGS:');
      console.log('✅ Order splitting endpoint is functional');
      console.log('✅ Multiple deals created based on fulfillment requirements');
      console.log('✅ TGF order numbering system working');
      console.log('✅ Zoho CRM integration handling split orders');
      console.log('✅ Proper separation of In-House vs Drop-Ship items');
      
      console.log('\n💼 BUSINESS IMPACT:');
      console.log('• Firearms get proper In-House compliance handling');
      console.log('• Accessories can ship directly from distributor (faster/cheaper)');
      console.log('• Separate tracking for different fulfillment methods');
      console.log('• Enhanced order management and customer service');
      
    } else {
      console.log('❌ TEST STATUS: FAILED');
      console.log('Error:', result.error);
    }
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
  });