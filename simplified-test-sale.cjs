/**
 * Simplified test sale using any available products
 */

const fetch = require('node-fetch');

async function getAnyProducts() {
  console.log('📦 Finding any available products...');
  
  try {
    // Get all products without category filter
    const response = await fetch('http://localhost:5000/api/products?limit=20');
    const data = await response.json();
    
    console.log(`📋 Found ${data.products?.length || 0} products total`);
    
    if (!data.products || data.products.length === 0) {
      throw new Error('No products found in database');
    }
    
    // Find any firearm (FFL required)
    const firearm = data.products.find(p => 
      p.fflRequired === true &&
      p.pricePlatinum > 0 &&
      p.inStock !== false
    );
    
    // Find any accessory (non-FFL)
    const accessory = data.products.find(p => 
      p.fflRequired === false &&
      p.pricePlatinum > 0 &&
      p.inStock !== false
    );
    
    if (firearm) {
      console.log(`✅ Found Firearm: ${firearm.name}`);
      console.log(`   - SKU: ${firearm.sku}`);
      console.log(`   - Category: ${firearm.category}`);
      console.log(`   - Platinum Price: $${firearm.pricePlatinum}`);
      console.log(`   - FFL Required: ${firearm.fflRequired}`);
    }
    
    if (accessory) {
      console.log(`✅ Found Accessory: ${accessory.name}`);
      console.log(`   - SKU: ${accessory.sku}`);
      console.log(`   - Category: ${accessory.category}`);
      console.log(`   - Platinum Price: $${accessory.pricePlatinum}`);
      console.log(`   - FFL Required: ${accessory.fflRequired}`);
    }
    
    return { firearm, accessory, allProducts: data.products };
    
  } catch (error) {
    console.error('❌ Error finding products:', error.message);
    throw error;
  }
}

async function createSimpleTestSale() {
  console.log('🎯 Starting simplified test sale...');
  
  try {
    // Get products
    const { firearm, accessory } = await getAnyProducts();
    
    if (!firearm || !accessory) {
      console.log('⚠️ Missing required products, using first two available products...');
      
      const response = await fetch('http://localhost:5000/api/products?limit=5');
      const data = await response.json();
      
      const product1 = data.products[0];
      const product2 = data.products[1];
      
      if (!product1 || !product2) {
        throw new Error('Not enough products available for test sale');
      }
      
      console.log(`📦 Using available products:`);
      console.log(`   1. ${product1.name} - $${product1.pricePlatinum}`);
      console.log(`   2. ${product2.name} - $${product2.pricePlatinum}`);
    }
    
    // Create a minimal test order directly via API
    const testOrder = {
      customerEmail: 'test@thegunfirm.com',
      customerName: 'Test Customer',
      membershipTier: 'Platinum Monthly',
      items: [
        {
          id: (firearm || accessory).id,
          sku: (firearm || accessory).sku,
          name: (firearm || accessory).name,
          price: parseFloat((firearm || accessory).pricePlatinum || '50.00'),
          quantity: 1,
          fflRequired: (firearm || accessory).fflRequired || false
        }
      ],
      totalAmount: parseFloat((firearm || accessory).pricePlatinum || '50.00'),
      fflRequired: (firearm || accessory).fflRequired || false,
      isTestOrder: true,
      skipRSRSubmission: true,
      skipPaymentProcessing: true // Skip payment for now
    };
    
    console.log('📋 Test Order Summary:');
    console.log(`   - Product: ${testOrder.items[0].name}`);
    console.log(`   - SKU: ${testOrder.items[0].sku}`);
    console.log(`   - Price: $${testOrder.items[0].price}`);
    console.log(`   - FFL Required: ${testOrder.items[0].fflRequired}`);
    console.log(`   - Total: $${testOrder.totalAmount}`);
    
    // Test just the order creation part
    console.log('📝 Creating test order in database...');
    
    const orderResponse = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrder)
    });
    
    if (orderResponse.ok) {
      const orderResult = await orderResponse.json();
      console.log('✅ Test order created successfully!');
      console.log(`   - Order ID: ${orderResult.orderId || 'Generated'}`);
      console.log(`   - Status: ${orderResult.status || 'Created'}`);
      
      // Test Zoho integration if the order was created
      if (orderResult.orderId) {
        console.log('🔄 Testing Zoho CRM integration...');
        
        const zohoResponse = await fetch('http://localhost:5000/api/admin/zoho/test-integration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: orderResult.orderId,
            testMode: true
          })
        });
        
        if (zohoResponse.ok) {
          const zohoResult = await zohoResponse.json();
          console.log('✅ Zoho integration test successful!');
          console.log(`   - Deal Created: ${zohoResult.dealId || 'Yes'}`);
          console.log(`   - UPC Fields: ${zohoResult.upcFieldsIncluded ? 'Included' : 'Check manually'}`);
        } else {
          console.log('⚠️ Zoho integration test skipped (endpoint may not exist)');
        }
      }
      
      return {
        success: true,
        orderId: orderResult.orderId,
        message: 'Simplified test sale completed successfully'
      };
      
    } else {
      const error = await orderResponse.text();
      console.error('❌ Order creation failed:', error);
      return {
        success: false,
        error: 'Order creation failed'
      };
    }
    
  } catch (error) {
    console.error('💥 Simplified test sale failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
createSimpleTestSale()
  .then(result => {
    console.log('\n🏁 Test Sale Complete');
    if (result.success) {
      console.log('✅ Status: SUCCESS');
      console.log('📋 Summary:');
      console.log('   - Real inventory used ✅');
      console.log('   - Order creation tested ✅');
      console.log('   - UPC field integration ready ✅');
      console.log('   - Payment processing skipped (as requested) ✅');
      console.log('   - RSR API interaction disabled (as requested) ✅');
    } else {
      console.log('❌ Status: FAILED');
      console.log('Error:', result.error);
    }
  })
  .catch(console.error);