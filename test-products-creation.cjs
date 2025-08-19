const { createServer } = require('http');

async function testProductCreation() {
  console.log('🧪 Testing Products Module Creation with Fixed Logic\n');
  
  // Import the ZohoService and related dependencies dynamically
  const { ZohoService } = await import('./server/zoho-service.js');
  const { ZohoProductLookupService } = await import('./server/services/zoho-product-lookup-service.js');
  
  try {
    // Initialize services
    const zohoService = new ZohoService();
    const productLookupService = new ZohoProductLookupService(zohoService);
    
    console.log('✅ Services initialized');
    
    // Test products from our successful order
    const testProducts = [
      {
        sku: 'ALGACT',
        productName: 'ALG COMBAT TRIGGER',
        manufacturer: 'ALG',
        productCategory: 'Parts & Accessories',
        distributorPartNumber: 'ALGACT',
        distributor: 'RSR',
        fflRequired: false,
        dropShipEligible: true,
        inHouseOnly: false
      },
      {
        sku: 'CMMG55CA6C7',
        productName: 'CMMG RECEIVER EXT KIT CARBINE AR15',
        manufacturer: 'CMMG',
        productCategory: 'Parts & Accessories', 
        distributorPartNumber: 'CMMG55CA6C7',
        distributor: 'RSR',
        fflRequired: false,
        dropShipEligible: true,
        inHouseOnly: false
      }
    ];
    
    console.log('🔍 Testing product creation/lookup...\n');
    
    for (const product of testProducts) {
      console.log(`📦 Processing ${product.sku}...`);
      
      try {
        const result = await productLookupService.findOrCreateProductBySKU(product);
        
        if (result.productId) {
          console.log(`  ✅ ${result.created ? 'Created' : 'Found'} product ID: ${result.productId}`);
        } else {
          console.log(`  ❌ Failed: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

// Run the test
testProductCreation().catch(console.error);