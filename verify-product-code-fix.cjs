const https = require('https');

async function verifyProductCodeFix() {
  console.log('🔍 Verifying Product_Code field population in Products module...');
  
  // Get access token from environment
  const accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ ZOHO_WEBSERVICES_ACCESS_TOKEN not found');
    return;
  }
  
  // Product IDs from our test order
  const productIds = [
    '6585331000001084001', // RUGER Magazine
    '6585331000001059083', // 1791 Holster  
    '6585331000001085001'  // Magpul Sling
  ];
  
  console.log(`🔄 Checking ${productIds.length} products from test order...`);
  
  for (const productId of productIds) {
    try {
      const options = {
        hostname: 'www.zohoapis.com',
        path: `/crm/v7/Products/${productId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      const response = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.end();
      });
      
      if (response.data && response.data[0]) {
        const product = response.data[0];
        console.log(`\n📦 Product ID: ${productId}`);
        console.log(`   Product Name: ${product.Product_Name || 'Not found'}`);
        console.log(`   Product_Code: ${product.Product_Code || 'NOT POPULATED ❌'}`);
        console.log(`   Mfg_Part_Number: ${product.Mfg_Part_Number || 'Not found'}`);
        console.log(`   RSR_Stock_Number: ${product.RSR_Stock_Number || 'Not found'}`);
        console.log(`   Manufacturer: ${product.Manufacturer || 'Not found'}`);
        
        // Check if Product_Code is populated
        if (product.Product_Code) {
          console.log(`   ✅ Product_Code field is correctly populated!`);
        } else {
          console.log(`   ❌ Product_Code field is MISSING - Fix needed!`);
        }
      } else {
        console.log(`❌ Could not retrieve product ${productId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error checking product ${productId}:`, error.message);
    }
  }
  
  console.log('\n🔍 Verification complete.');
}

verifyProductCodeFix().catch(console.error);