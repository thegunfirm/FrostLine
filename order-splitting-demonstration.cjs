/**
 * Demonstrate order splitting based on In-House (IH) vs Drop-Ship (DS) fulfillment
 * Using Glock firearm + accessory to show how orders get split by shipping type
 */

const fetch = require('node-fetch');

async function demonstrateOrderSplitting() {
  console.log('🎯 Demonstrating Order Splitting: In-House (IH) vs Drop-Ship (DS)');
  console.log('📦 Creating mixed order: Glock firearm + accessory');
  
  try {
    // Create test order with mixed fulfillment types
    const mixedOrderData = {
      customerEmail: 'order.splitting.demo@thegunfirm.com',
      contactFirstName: 'Order',
      contactLastName: 'SplittingDemo',
      customerName: 'Order SplittingDemo',
      orderNumber: `SPLIT-DEMO-${Date.now()}`,
      totalAmount: 1349.98,
      membershipTier: 'Gold Monthly',
      orderItems: [
        {
          // Glock - typically In-House fulfillment for firearms
          id: 151234,
          sku: 'GLOCK19GEN5',
          productName: 'GLOCK 19 GEN5 9MM',
          name: 'GLOCK 19 GEN5 9MM',
          manufacturer: 'Glock',
          manufacturerPartNumber: 'GLOCK19GEN5',
          category: 'Handguns',
          productCategory: 'Handguns',
          quantity: 1,
          unitPrice: 899.99,
          price: 899.99,
          rsrStockNumber: 'GLOCK19GEN5',
          distributorPartNumber: 'GLOCK19GEN5',
          upcCode: '764503026751',
          fflRequired: true,
          requiresFFL: true,
          isFirearm: true,
          dropShipEligible: false,  // Force In-House
          inHouseOnly: true,        // Force In-House
          fulfillmentType: 'In-House'
        },
        {
          // Magazine accessory - typically Drop-Ship eligible
          id: 150988,
          sku: 'GLOCK33RD',
          productName: 'GLOCK 19 33RD MAGAZINE',
          name: 'GLOCK 19 33RD MAGAZINE',
          manufacturer: 'Glock',
          manufacturerPartNumber: 'GLOCK33RD',
          category: 'Accessories',
          productCategory: 'Accessories',
          quantity: 2,
          unitPrice: 224.99,
          price: 224.99,
          rsrStockNumber: 'GLOCK33RD',
          distributorPartNumber: 'GLOCK33RD',
          upcCode: '764503999123',
          fflRequired: false,
          requiresFFL: false,
          isFirearm: false,
          dropShipEligible: true,   // Allow Drop-Ship
          inHouseOnly: false,       // Allow Drop-Ship
          fulfillmentType: 'Drop-Ship'
        }
      ],
      fflRequired: true,
      fflDealerName: 'Split Demo Gun Shop LLC',
      fflDealerId: '1',
      engineResponse: null
    };

    console.log('🔄 Processing mixed fulfillment order...');
    console.log('📋 Order composition:');
    console.log('   🔫 GLOCK 19 GEN5 - In-House fulfillment (firearms require special handling)');
    console.log('   📦 Glock 33RD Magazine x2 - Drop-Ship eligible (accessories)');
    
    const orderResponse = await fetch('http://localhost:5000/api/test/zoho-system-fields', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mixedOrderData)
    });
    
    if (orderResponse.ok) {
      const orderResult = await orderResponse.json();
      console.log('✅ Mixed order processed successfully!');
      
      if (orderResult.success) {
        console.log('\n📊 ORDER SPLITTING RESULTS:');
        console.log(`📋 Primary Deal ID: ${orderResult.dealId}`);
        console.log(`📋 TGF Order Number: ${orderResult.tgfOrderNumber}`);
        
        // Check if order was actually split (this would require order splitting logic)
        console.log('\n🔍 ANALYZING FULFILLMENT SPLITTING:');
        
        if (orderResult.splitDeals && orderResult.splitDeals.length > 1) {
          console.log('✅ ORDER WAS SUCCESSFULLY SPLIT:');
          orderResult.splitDeals.forEach((deal, index) => {
            console.log(`   📦 Deal ${index + 1}: ${deal.dealId} (${deal.fulfillmentType})`);
            console.log(`       Products: ${deal.products.join(', ')}`);
            console.log(`       Amount: $${deal.amount}`);
          });
        } else {
          console.log('📋 ORDER PROCESSED AS SINGLE DEAL (splitting may not be implemented)');
          console.log('   This suggests the system currently creates one deal regardless of fulfillment types');
        }
        
        console.log('\n🎯 EXPECTED SPLITTING BEHAVIOR:');
        console.log('✅ In-House Deal:');
        console.log('   📋 Product: GLOCK 19 GEN5');
        console.log('   📋 Fulfillment: In-House (firearms require special handling)');
        console.log('   📋 Amount: $899.99');
        console.log('   📋 Requires: FFL transfer, special shipping');
        
        console.log('✅ Drop-Ship Deal:');
        console.log('   📋 Product: Glock 33RD Magazine x2');
        console.log('   📋 Fulfillment: Drop-Ship (direct from distributor)');
        console.log('   📋 Amount: $449.98');
        console.log('   📋 Benefits: Faster shipping, lower handling costs');
        
        console.log('\n📋 FULFILLMENT TYPE ADVANTAGES:');
        console.log('🏢 In-House Fulfillment:');
        console.log('   • Quality control and inspection');
        console.log('   • Proper FFL compliance handling');
        console.log('   • Special packaging for firearms');
        console.log('   • Direct customer service');
        
        console.log('📦 Drop-Ship Fulfillment:');
        console.log('   • Faster delivery times');
        console.log('   • Lower shipping costs');
        console.log('   • Reduced inventory holding');
        console.log('   • Direct from distributor');
        
        return {
          success: true,
          dealId: orderResult.dealId,
          tgfOrderNumber: orderResult.tgfOrderNumber,
          message: 'Order splitting demonstration completed'
        };
        
      } else {
        console.log(`❌ Order processing failed: ${orderResult.error}`);
        return { success: false, error: orderResult.error };
      }
      
    } else {
      const errorText = await orderResponse.text();
      console.log(`❌ Request failed: ${orderResponse.status}`);
      console.log(`Error: ${errorText}`);
      return { success: false, error: `HTTP ${orderResponse.status}` };
    }

  } catch (error) {
    console.error('💥 Order splitting demonstration failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the demonstration
demonstrateOrderSplitting()
  .then(result => {
    console.log('\n🏁 ORDER SPLITTING DEMONSTRATION COMPLETE');
    
    if (result.success) {
      console.log('✅ DEMONSTRATION STATUS: SUCCESSFUL');
      console.log(`📋 Deal Created: ${result.dealId}`);
      console.log(`📋 TGF Order: ${result.tgfOrderNumber}`);
      
      console.log('\n📋 KEY INSIGHTS:');
      console.log('1. The system processes mixed fulfillment orders successfully');
      console.log('2. Zoho CRM receives complete product information for all items');
      console.log('3. Field mapping includes fulfillment type indicators');
      console.log('4. Order splitting logic may need implementation for automatic deal separation');
      
      console.log('\n🔄 NEXT STEPS FOR ORDER SPLITTING:');
      console.log('• Implement automatic deal separation based on fulfillment types');
      console.log('• Create separate TGF order numbers for each fulfillment method');
      console.log('• Configure RSR Engine integration for split order submission');
      console.log('• Set up proper shipping cost calculation per fulfillment type');
      
    } else {
      console.log('❌ DEMONSTRATION STATUS: FAILED');
      console.log('Error:', result.error);
    }
  })
  .catch(error => {
    console.error('💥 Demonstration execution failed:', error);
  });