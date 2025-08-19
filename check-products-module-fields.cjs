// Check Zoho Products Module for our test sale products
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function checkProductsModule() {
  console.log('🔍 CHECKING ZOHO PRODUCTS MODULE\n');
  
  const testProducts = [
    { name: 'ALG COMBAT TRIGGER', sku: 'ALGACT' },
    { name: 'CMMG RECEIVER EXT KIT CARBINE AR15', sku: 'CMMG55CA6C7' },
    { name: 'XS R3D 2.0 FOR SIG 320 SUP HGT GREEN', sku: 'XSSI-R203P-6G' }
  ];
  
  console.log('Searching for products from our test sale...');
  
  for (const product of testProducts) {
    try {
      console.log(`\n🔍 Searching for: ${product.name} (${product.sku})`);
      
      // Search by SKU in Products Module
      const searchResponse = await execAsync(`
        curl -X GET "http://localhost:5000/api/zoho/products?search=${product.sku}" \\
          --max-time 10 2>/dev/null
      `);
      
      try {
        const searchResult = JSON.parse(searchResponse.stdout);
        
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
          const foundProduct = searchResult.data[0];
          console.log('✅ FOUND in Products Module:');
          console.log(`   Product Name: ${foundProduct.Product_Name}`);
          console.log(`   Product Code: ${foundProduct.Product_Code}`);
          console.log(`   Manufacturer: ${foundProduct.Manufacturer || 'N/A'}`);
          console.log(`   Product ID: ${foundProduct.id}`);
          
          if (foundProduct.Distributor_Part_Number) {
            console.log(`   RSR Stock Number: ${foundProduct.Distributor_Part_Number}`);
          }
          
        } else {
          console.log('❌ NOT FOUND in Products Module');
        }
        
      } catch (parseError) {
        console.log('⚠️ Could not parse search response - checking raw response...');
        
        if (searchResponse.stdout.includes('Product_Name') || searchResponse.stdout.includes('Product_Code')) {
          console.log('✅ Raw response contains product data - likely found but format issue');
          console.log('Sample response:', searchResponse.stdout.substring(0, 200));
        } else {
          console.log('❌ No product data found in response');
        }
      }
      
    } catch (error) {
      console.log(`❌ Search failed for ${product.sku}: ${error.message}`);
    }
  }
  
  // Also check overall Products Module status
  console.log('\n📊 PRODUCTS MODULE OVERVIEW');
  try {
    const overviewResponse = await execAsync(`
      curl -X GET "http://localhost:5000/api/zoho/products?per_page=5" \\
        --max-time 10 2>/dev/null
    `);
    
    try {
      const overview = JSON.parse(overviewResponse.stdout);
      
      if (overview && overview.data) {
        console.log(`✅ Products Module accessible: ${overview.data.length} products returned`);
        console.log('Sample products in module:');
        
        overview.data.slice(0, 3).forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.Product_Name || 'Unknown'} (${product.Product_Code || 'No Code'})`);
        });
      } else {
        console.log('⚠️ Products Module response format unexpected');
      }
      
    } catch (parseError) {
      console.log('⚠️ Could not parse overview response');
      console.log('Raw response sample:', overviewResponse.stdout.substring(0, 150));
    }
    
  } catch (error) {
    console.log('❌ Products Module overview failed:', error.message);
  }
}

checkProductsModule().catch(error => {
  console.error('💥 Products Module check failed:', error);
});