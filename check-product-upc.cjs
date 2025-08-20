/**
 * Check Product UPC Data - PA175S203 (GLOCK 17 GEN5)
 */

const axios = require('axios');

async function checkProductUPC() {
  console.log('🔍 Checking Product UPC Data for PA175S203');
  console.log('📋 Looking up GLOCK 17 GEN5 product details\n');

  try {
    // Query our database for the product
    const response = await axios.get(`http://localhost:5000/api/products/search?q=PA175S203`);
    
    if (response.data && response.data.length > 0) {
      const product = response.data[0];
      
      console.log('📊 Product Details Found:');
      console.log(`   Name: ${product.name || 'N/A'}`);
      console.log(`   SKU: ${product.sku || 'N/A'}`);
      console.log(`   UPC Code: ${product.upcCode || 'NULL/MISSING'}`);
      console.log(`   RSR Stock Number: ${product.rsrStockNumber || 'N/A'}`);
      console.log(`   Manufacturer Part Number: ${product.manufacturerPartNumber || 'N/A'}`);
      console.log(`   Manufacturer: ${product.manufacturer || 'N/A'}`);
      console.log(`   Category: ${product.category || 'N/A'}`);
      
      if (!product.upcCode) {
        console.log('\n❌ UPC CODE IS MISSING from product data!');
        console.log('💡 This explains why UPC shows as null in Zoho subforms');
      } else {
        console.log('\n✅ UPC Code is present in product data');
      }
      
    } else {
      console.log('❌ Product PA175S203 not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking product:', error.message);
    console.log('📋 Response data:', error.response?.data);
  }
}

checkProductUPC();