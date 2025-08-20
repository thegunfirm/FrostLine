const axios = require('axios');

async function verifyRugerCorrection() {
  console.log('Verifying Ruger LCP II correction with authentic RSR data');
  console.log('RSR Stock: RUG03701');
  console.log('Manufacturer Part: 03701'); 
  console.log('UPC: 736676037018');
  console.log('');
  
  try {
    const response = await axios.get('http://localhost:5000/api/products', {
      params: { search: 'Ruger LCP II', limit: 1 }
    });
    
    if (response.data && response.data.length > 0) {
      const product = response.data[0];
      console.log('Product found:');
      console.log(`Name: ${product.name}`);
      console.log(`SKU: ${product.sku} (should be 03701)`);
      console.log(`RSR Stock: ${product.rsrStockNumber} (should be different from SKU)`);
      console.log(`Manufacturer Part: ${product.manufacturerPartNumber}`);
      console.log(`UPC: ${product.upc || 'Not set'}`);
      
      if (product.sku === '03701' && product.rsrStockNumber !== product.sku) {
        console.log('✓ Authentic RSR data correctly separated');
      } else {
        console.log('✗ Still using incorrect data');
      }
    }
  } catch (error) {
    console.log('Error checking product:', error.message);
  }
}

verifyRugerCorrection();