/**
 * Test to verify actual Products are being created in Zoho CRM
 */

async function testProductsCreation() {
  try {
    console.log('🔍 Testing actual Products creation in Zoho...');
    
    // Test creating a product directly via API endpoint
    const response = await fetch('http://localhost:5000/api/test/zoho-product-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sku: `TEST-PRODUCT-${Date.now()}`,
        productName: 'Test Firearm for Verification',
        manufacturer: 'Test Manufacturer',
        category: 'Test Category',
        fflRequired: true,
        rsrStockNumber: 'TEST123456',
        distributor: 'RSR'
      })
    });

    const result = await response.json();
    console.log('📊 Product creation result:', result);

    if (result.success && result.productId && result.productId !== 'DEAL_LINE_ITEM_TEST') {
      console.log('✅ CONFIRMED: Real Products API is working!');
      console.log(`🆔 Product ID: ${result.productId}`);
      
      // Now verify we can search for it
      const searchResponse = await fetch(`http://localhost:5000/api/test/zoho-product-search?sku=${result.sku}`);
      const searchResult = await searchResponse.json();
      console.log('🔍 Search result:', searchResult);
      
      return { success: true, productId: result.productId, verified: true };
    } else {
      console.log('❌ Products API still using workaround approach');
      return { success: false, error: 'Still using Deal line items' };
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testProductsCreation().then(result => {
  console.log('\n🏁 Final verification:', result.success ? 'SUCCESS' : 'FAILED');
}).catch(err => {
  console.error('💥 Critical error:', err);
});