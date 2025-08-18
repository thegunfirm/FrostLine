#!/usr/bin/env node

const axios = require('axios');

async function testDirectProductCreation() {
  console.log('🔧 TESTING DIRECT PRODUCT CREATION');
  console.log('==================================');
  
  try {
    // Test the product creation endpoint directly
    console.log('📦 Testing product creation for SKU: GLOCK19GEN5');
    
    const productResponse = await axios.post('http://localhost:5000/api/test/create-product', {
      sku: 'GLOCK19GEN5',
      manufacturerPartNumber: 'PA195S201',
      name: 'GLOCK 19 Gen 5 9mm',
      price: 499.99
    });
    
    console.log('✅ Product Creation Response:', productResponse.data);
    
    // Test subform assignment
    console.log('\n📋 Testing subform assignment...');
    const subformResponse = await axios.post('http://localhost:5000/api/test/assign-to-deal-subform', {
      dealId: '6585331000000988245',
      productId: 'test-product-id',
      quantity: 1,
      unitPrice: 499.99
    });
    
    console.log('✅ Subform Assignment Response:', subformResponse.data);
    
  } catch (error) {
    console.error('❌ Direct Test Failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Show the specific authentication error
    if (error.response?.data?.error?.includes('oauth token')) {
      console.log('\n🚨 AUTHENTICATION FAILURE CONFIRMED');
      console.log('The Zoho API is rejecting our authentication token.');
      console.log('This means NO products can be created or assigned to deals.');
    }
  }
}

testDirectProductCreation();