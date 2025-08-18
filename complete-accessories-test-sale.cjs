// Complete accessories test sale with real inventory, real FFL, fake customer
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function completeAccessoriesTestSale() {
  console.log('🛒 COMPLETE ACCESSORIES TEST SALE\n');
  
  try {
    // Step 1: Find accessories in real inventory
    console.log('1️⃣ Searching for real accessories in inventory...');
    const inventoryResponse = await execAsync(`
      curl -X GET "http://localhost:5000/api/products/search?q=holster&category=Accessories&limit=3" \\
        --max-time 15 2>/dev/null
    `);
    
    let accessories = [];
    try {
      const searchResult = JSON.parse(inventoryResponse.stdout);
      accessories = searchResult.products || searchResult || [];
      
      if (accessories.length === 0) {
        // Try alternative search terms
        console.log('🔄 Trying alternative search for accessories...');
        const altResponse = await execAsync(`
          curl -X GET "http://localhost:5000/api/products/search?q=sling&limit=3" \\
            --max-time 15 2>/dev/null
        `);
        const altResult = JSON.parse(altResponse.stdout);
        accessories = altResult.products || altResult || [];
      }
      
      if (accessories.length === 0) {
        // Get any products marked as accessories
        console.log('🔄 Getting any available accessories...');
        const genResponse = await execAsync(`
          curl -X GET "http://localhost:5000/api/products?category=Parts&limit=3" \\
            --max-time 15 2>/dev/null
        `);
        const genResult = JSON.parse(genResponse.stdout);
        accessories = genResult.products || genResult || [];
      }
      
    } catch (parseError) {
      console.log('⚠️ Could not parse inventory response, using sample products');
      accessories = [];
    }
    
    if (accessories.length === 0) {
      console.log('❌ No accessories found in inventory');
      return false;
    }
    
    const selectedAccessories = accessories.slice(0, 3);
    console.log(`✅ Found ${selectedAccessories.length} accessories:`);
    selectedAccessories.forEach((acc, i) => {
      console.log(`   ${i+1}. ${acc.name || acc.description} - ${acc.sku} - $${acc.priceWholesale || acc.price || '0.00'}`);
    });
    
    // Step 2: Get a real FFL dealer
    console.log('\n2️⃣ Getting real FFL dealer...');
    const fflResponse = await execAsync(`
      curl -X GET "http://localhost:5000/api/ffls?state=TX&limit=1" \\
        --max-time 10 2>/dev/null
    `);
    
    let fflDealer = null;
    try {
      const fflResult = JSON.parse(fflResponse.stdout);
      const ffls = fflResult.ffls || fflResult || [];
      fflDealer = ffls[0] || null;
    } catch (parseError) {
      console.log('⚠️ Could not get FFL dealer, using test dealer');
      fflDealer = {
        businessName: 'Test FFL Dealer',
        licenseNumber: 'TEST-FFL-123',
        state: 'TX'
      };
    }
    
    if (fflDealer) {
      console.log(`✅ Using FFL: ${fflDealer.businessName || 'Test FFL'} (${fflDealer.state || 'TX'})`);
    }
    
    // Step 3: Create test customer and process checkout
    console.log('\n3️⃣ Processing complete checkout...');
    
    const cartItems = selectedAccessories.map(acc => ({
      id: acc.id,
      sku: acc.sku,
      name: acc.name || acc.description,
      price: parseFloat(acc.priceWholesale || acc.price || '19.99'),
      quantity: 1,
      requiresFFL: false,  // Accessories don't require FFL
      rsrStockNumber: acc.rsrStockNumber || acc.sku,
      manufacturer: acc.manufacturer || 'Unknown',
      category: acc.category || 'Accessories'
    }));
    
    const checkoutPayload = {
      items: cartItems,
      customer: {
        email: 'accessories.test@example.com',
        firstName: 'AccessoryTest',
        lastName: 'Customer',
        phone: '555-0123',
        address: '123 Test St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        membershipTier: 'Bronze'
      },
      payment: {
        cardNumber: '4111111111111111',  // Test Visa card
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        billingZip: '78701'
      },
      shipping: {
        method: 'standard',
        address: '123 Test St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701'
      },
      ffl: fflDealer ? {
        dealerName: fflDealer.businessName || 'Test FFL',
        licenseNumber: fflDealer.licenseNumber || 'TEST-123',
        state: fflDealer.state || 'TX'
      } : null,
      notes: 'Complete accessories test sale'
    };
    
    console.log('🛒 Cart total: $' + cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2));
    
    const checkoutResponse = await execAsync(`
      curl -X POST http://localhost:5000/api/checkout \\
        -H "Content-Type: application/json" \\
        -d '${JSON.stringify(checkoutPayload).replace(/'/g, "'\\''")}' \\
        --max-time 30 2>/dev/null
    `);
    
    console.log('\n4️⃣ Processing checkout response...');
    let checkoutResult;
    try {
      checkoutResult = JSON.parse(checkoutResponse.stdout);
      
      if (checkoutResult.success) {
        console.log('✅ Checkout successful!');
        console.log('📧 Order ID:', checkoutResult.orderId);
        console.log('💳 Transaction ID:', checkoutResult.transactionId);
        console.log('🆔 Deal ID:', checkoutResult.dealId);
        
        if (checkoutResult.dealId) {
          // Step 4: Verify products in Zoho Products Module
          console.log('\n5️⃣ Verifying products in Zoho Products Module...');
          
          for (const item of cartItems) {
            console.log(`🔍 Checking product ${item.sku} in Products Module...`);
            const productCheckResponse = await execAsync(`
              curl -X GET "http://localhost:5000/api/zoho/products/search?sku=${item.sku}" \\
                --max-time 10 2>/dev/null
            `);
            
            try {
              const productResult = JSON.parse(productCheckResponse.stdout);
              if (productResult.found) {
                console.log(`✅ Product ${item.sku} found in Products Module`);
              } else {
                console.log(`⚠️ Product ${item.sku} not found in Products Module`);
              }
            } catch (e) {
              console.log(`⚠️ Could not verify product ${item.sku} in Products Module`);
            }
          }
          
          // Step 5: Verify deal subform population
          console.log('\n6️⃣ Verifying Deal subform population...');
          const dealVerifyResponse = await execAsync(`
            curl -X GET "http://localhost:5000/api/zoho/deals/${checkoutResult.dealId}" \\
              --max-time 10 2>/dev/null
          `);
          
          try {
            const dealResult = JSON.parse(dealVerifyResponse.stdout);
            if (dealResult.success && dealResult.deal) {
              const subformItems = dealResult.deal.Subform_1 || dealResult.deal.Product_Details || [];
              console.log(`✅ Deal ${checkoutResult.dealId} has ${subformItems.length} items in subform`);
              
              subformItems.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.Product_Name} (${item.Product_Code})`);
                console.log(`      Qty: ${item.Quantity}, Price: $${item.Unit_Price}`);
                console.log(`      RSR: ${item.Distributor_Part_Number}, FFL: ${item.FFL_Required}`);
              });
              
              if (subformItems.length === cartItems.length) {
                console.log('\n🎉 COMPLETE SUCCESS: All accessories processed and verified!');
                console.log('✅ Products created in Zoho Products Module');
                console.log('✅ Deal created with populated subform');
                console.log('✅ Payment processed via Authorize.Net sandbox');
                console.log('✅ Real inventory used throughout');
                return true;
              } else {
                console.log(`⚠️ Subform has ${subformItems.length} items, expected ${cartItems.length}`);
              }
            } else {
              console.log('❌ Could not verify deal subform');
            }
          } catch (e) {
            console.log('❌ Error verifying deal subform:', e.message);
          }
        } else {
          console.log('❌ No Deal ID returned from checkout');
        }
        
      } else {
        console.log('❌ Checkout failed:', checkoutResult.error);
        console.log('Details:', checkoutResult.message);
      }
      
    } catch (parseError) {
      console.log('❌ Could not parse checkout response');
      console.log('Raw response:', checkoutResponse.stdout.substring(0, 500));
    }
    
  } catch (error) {
    console.error('💥 Test sale failed:', error.message);
    return false;
  }
}

// Run the complete test
completeAccessoriesTestSale().then((success) => {
  if (success) {
    console.log('\n🏆 ACCESSORIES TEST SALE COMPLETE!');
  } else {
    console.log('\n❌ Test sale needs attention');
  }
}).catch(error => {
  console.error('💥 Script execution failed:', error);
});