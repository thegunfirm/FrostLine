/**
 * Simple test of UPC field integration using existing API endpoints
 */

const fetch = require('node-fetch');

async function testUPCSimple() {
  console.log('🔍 Testing UPC field integration...');
  
  try {
    const testSKU = '90398'; // Magpul magazine
    const testUPC = '736676903986';
    
    console.log(`📦 Testing product: ${testSKU}`);
    console.log(`🏷️  UPC Code: ${testUPC}`);
    
    // Test 1: Create a product with UPC using the test endpoint
    console.log('\n📋 Step 1: Testing product creation with UPC...');
    
    const productData = {
      sku: testSKU,
      productName: 'MAG RUGER 10/22 22LR 10RD BLK POLY',
      manufacturer: 'Magpul',
      category: 'Magazines',
      rsrStockNumber: 'MGRUG90398',
      distributorPartNumber: 'MGRUG90398',
      upcCode: testUPC,
      fflRequired: false,
      dropShipEligible: true,
      inHouseOnly: false
    };
    
    const createResponse = await fetch('http://localhost:5000/api/test/zoho-product-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });
    
    const createResult = await createResponse.json();
    console.log('📥 Product creation result:', JSON.stringify(createResult, null, 2));
    
    if (createResult.success) {
      console.log(`✅ Product created successfully: ${createResult.productId}`);
      
      // Test 2: Search for the created product to verify UPC field
      console.log('\n🔍 Step 2: Searching for created product...');
      
      const searchResponse = await fetch(`http://localhost:5000/api/test/zoho-product-search?sku=${testSKU}`);
      const searchResult = await searchResponse.json();
      
      console.log('📥 Product search result:', JSON.stringify(searchResult, null, 2));
      
      if (searchResult.found) {
        console.log(`✅ Product found in Zoho`);
        
        // Check UPC field
        if (searchResult.UPC) {
          console.log(`✅ UPC field populated: ${searchResult.UPC}`);
          
          if (searchResult.UPC === testUPC) {
            console.log(`🎉 UPC FIELD SUCCESS! UPC code correctly stored in Zoho Products module.`);
          } else {
            console.log(`❌ UPC mismatch: expected ${testUPC}, got ${searchResult.UPC}`);
          }
        } else {
          console.log(`❌ UPC field not found in product`);
        }
        
        // Test 3: Test subform creation
        console.log('\n📋 Step 3: Testing subform creation with UPC...');
        
        const orderItems = [
          {
            id: 90398,
            sku: testSKU,
            productName: 'MAG RUGER 10/22 22LR 10RD BLK POLY',
            name: 'MAG RUGER 10/22 22LR 10RD BLK POLY',
            manufacturer: 'Magpul',
            category: 'Magazines',
            quantity: 1,
            unitPrice: 39.99,
            price: 39.99,
            rsrStockNumber: 'MGRUG90398',
            distributorPartNumber: 'MGRUG90398',
            upcCode: testUPC,
            fflRequired: false,
            dropShipEligible: true,
            inHouseOnly: false
          }
        ];
        
        const dealData = {
          contactId: 'test-contact',
          orderNumber: `UPC-TEST-${Date.now()}`,
          totalAmount: 39.99,
          orderItems: orderItems,
          membershipTier: 'Bronze',
          fflRequired: false,
          fflDealerName: null,
          orderStatus: 'Submitted'
        };
        
        const dealResponse = await fetch('http://localhost:5000/api/test/zoho-deal-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dealData)
        });
        
        if (dealResponse.ok) {
          const dealResult = await dealResponse.json();
          console.log('📥 Deal creation result:', JSON.stringify(dealResult, null, 2));
          
          if (dealResult.success) {
            console.log(`✅ Deal created successfully: ${dealResult.dealId}`);
            
            // Wait for subform population
            console.log('⏳ Waiting for subform population...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check subform for UPC
            const verifyResponse = await fetch(`http://localhost:5000/api/admin/zoho/deals/${dealResult.dealId}/verification`);
            if (verifyResponse.ok) {
              const verifyResult = await verifyResponse.json();
              
              if (verifyResult.subformData && verifyResult.subformData.length > 0) {
                const subformItem = verifyResult.subformData[0];
                console.log('📋 Subform item:', JSON.stringify(subformItem, null, 2));
                
                if (subformItem.UPC) {
                  console.log(`✅ UPC in subform: ${subformItem.UPC}`);
                  
                  if (subformItem.UPC === testUPC) {
                    console.log(`🎉 SUBFORM UPC SUCCESS! UPC code correctly populated in deal subform.`);
                    return true;
                  } else {
                    console.log(`❌ Subform UPC mismatch: expected ${testUPC}, got ${subformItem.UPC}`);
                  }
                } else {
                  console.log(`❌ UPC field missing from subform`);
                }
              } else {
                console.log(`❌ No subform data found`);
              }
            } else {
              console.log(`❌ Could not verify deal: ${verifyResponse.status}`);
            }
          } else {
            console.log(`❌ Deal creation failed: ${dealResult.error}`);
          }
        } else {
          console.log(`❌ Deal creation request failed: ${dealResponse.status}`);
        }
        
      } else {
        console.log(`❌ Product not found after creation`);
      }
      
    } else {
      console.log(`❌ Product creation failed: ${createResult.error}`);
    }
    
    return false;

  } catch (error) {
    console.error('❌ UPC test failed:', error.message);
    return false;
  }
}

// Run the test
testUPCSimple()
  .then((success) => {
    console.log('\n🏁 UPC field test completed');
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