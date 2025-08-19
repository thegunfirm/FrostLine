// Direct verification of Zoho Products Module via the service layer
const fs = require('fs');

async function verifyProductsModuleDirectly() {
  console.log('🔍 DIRECT ZOHO PRODUCTS MODULE VERIFICATION\n');
  
  try {
    // Import the Zoho service directly
    const { ZohoService } = await import('./server/zoho-service.js');
    
    console.log('Creating Zoho service instance...');
    const zohoService = new ZohoService({
      clientId: process.env.ZOHO_WEBSERVICES_CLIENT_ID,
      clientSecret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET,
      redirectUri: process.env.ZOHO_REDIRECT_URI,
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'https://accounts.zoho.com',
      apiHost: process.env.ZOHO_CRM_BASE || 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
    });
    
    const testProducts = [
      { name: 'ALG COMBAT TRIGGER', sku: 'ALGACT' },
      { name: 'CMMG RECEIVER EXT KIT CARBINE AR15', sku: 'CMMG55CA6C7' },
      { name: 'XS R3D 2.0 FOR SIG 320 SUP HGT GREEN', sku: 'XSSI-R203P-6G' }
    ];
    
    for (const product of testProducts) {
      try {
        console.log(`\n🔍 Searching Products Module for: ${product.name} (${product.sku})`);
        
        // Search for product in Zoho Products Module
        const searchResult = await zohoService.searchProducts(product.sku);
        
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
          const foundProduct = searchResult.data[0];
          console.log('✅ FOUND in Zoho Products Module:');
          console.log(`   Product Name: ${foundProduct.Product_Name}`);
          console.log(`   Product Code: ${foundProduct.Product_Code}`);
          console.log(`   Product ID: ${foundProduct.id}`);
          
          if (foundProduct.Manufacturer) {
            console.log(`   Manufacturer: ${foundProduct.Manufacturer}`);
          }
          
          if (foundProduct.Distributor_Part_Number) {
            console.log(`   RSR Stock Number: ${foundProduct.Distributor_Part_Number}`);
          }
          
        } else {
          console.log('❌ NOT FOUND in Zoho Products Module');
          
          // Check if it needs to be created
          console.log('   → Checking if product should be created...');
        }
        
      } catch (error) {
        console.log(`❌ Error searching for ${product.sku}:`, error.message);
      }
    }
    
    // Also verify our deal subform data shows correct product information
    console.log('\n📋 VERIFYING DEAL SUBFORM DATA...');
    
    try {
      const dealId = '6585331000001018047';
      const dealDetails = await zohoService.getDealById(dealId);
      
      if (dealDetails && dealDetails.Product_Details) {
        console.log(`✅ Deal ${dealId} subform contains:`, dealDetails.Product_Details.length, 'items');
        
        dealDetails.Product_Details.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.Product_Name} (${item.Product_Code})`);
          console.log(`      RSR: ${item.Distributor_Part_Number || 'N/A'}`);
          console.log(`      Price: $${item.Unit_Price || 'N/A'}`);
        });
      } else {
        console.log('⚠️ Could not retrieve deal subform data');
      }
      
    } catch (error) {
      console.log('❌ Error verifying deal subform:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Direct verification failed:', error.message);
    
    // Fallback: Check if products exist in our local database
    console.log('\n📊 FALLBACK: Checking local product database...');
    
    const testSkus = ['ALGACT', 'CMMG55CA6C7', 'XSSI-R203P-6G'];
    
    for (const sku of testSkus) {
      try {
        const { productLookupService } = await import('./server/services/product-lookup-service.js');
        const product = await productLookupService.findProductBySku(sku);
        
        if (product) {
          console.log(`✅ ${sku}: Found in local database`);
          console.log(`   Name: ${product.name}`);
          console.log(`   Manufacturer: ${product.manufacturer}`);
          console.log(`   RSR Stock: ${product.sku}`);
        } else {
          console.log(`❌ ${sku}: Not found in local database`);
        }
        
      } catch (error) {
        console.log(`❌ Error checking ${sku} locally:`, error.message);
      }
    }
  }
}

verifyProductsModuleDirectly().catch(error => {
  console.error('💥 Verification script failed:', error);
});