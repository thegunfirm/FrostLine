/**
 * Debug pricing issue with cart
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function debugPricing() {
  console.log('🔍 Debugging Pricing Issue');
  console.log('==========================');
  
  try {
    // Test getting product details directly
    const response = await fetch(`${BASE_URL}/api/products/PA175S203`);
    const product = await response.json();
    
    console.log('Product API response:');
    console.log(JSON.stringify(product, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugPricing();