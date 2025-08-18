// Test the new real product lookup service
import { productLookupService } from './server/services/product-lookup-service.js';

async function testRealProductLookup() {
  console.log('🧪 Testing Real Product Lookup Service...\n');
  
  try {
    // Test 1: Get sample products
    console.log('📦 Test 1: Getting sample real products...');
    const sampleProducts = await productLookupService.getSampleProducts(3);
    console.log(`✅ Found ${sampleProducts.length} real products:`);
    sampleProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.sku} - ${product.name}`);
      console.log(`     Manufacturer: ${product.manufacturer || 'N/A'}`);
      console.log(`     Price: $${product.priceWholesale}`);
      console.log(`     FFL Required: ${product.requiresFFL}`);
      console.log(`     RSR Stock#: ${product.rsrStockNumber || 'Not Populated'}`);
      console.log(`     Manufacturer Part#: ${product.manufacturerPartNumber || 'N/A'}`);
      console.log('');
    });
    
    if (sampleProducts.length > 0) {
      // Test 2: Look up specific product by SKU
      const testSku = sampleProducts[0].sku;
      console.log(`🔍 Test 2: Looking up product by SKU: ${testSku}`);
      const foundProduct = await productLookupService.findProductBySku(testSku);
      if (foundProduct) {
        console.log(`✅ Found product: ${foundProduct.name}`);
      } else {
        console.log(`❌ Product not found for SKU: ${testSku}`);
      }
      
      // Test 3: Convert to Zoho subform format
      console.log('\n📋 Test 3: Converting to Zoho subform format...');
      const testOrderItems = sampleProducts.slice(0, 2).map(product => ({
        sku: product.sku,
        quantity: 1,
        price: parseFloat(product.priceWholesale)
      }));
      
      const subformResult = await productLookupService.processOrderItemsForZoho(testOrderItems);
      console.log(`✅ Processed ${subformResult.subformData.length} products for Zoho`);
      console.log(`❌ Errors: ${subformResult.errors.length}`);
      
      if (subformResult.subformData.length > 0) {
        console.log('\n📊 Sample Zoho subform data:');
        console.log(JSON.stringify(subformResult.subformData[0], null, 2));
      }
      
      if (subformResult.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        subformResult.errors.forEach(error => console.log(`  - ${error}`));
      }
    }
    
    console.log('\n✅ Real Product Lookup Test Complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRealProductLookup().then(() => {
  console.log('\n🏁 Test completed, exiting...');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});