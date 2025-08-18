#!/usr/bin/env node

const axios = require('axios');

async function testProductSubformDirectly() {
  console.log('🎯 DIRECT API TEST - PRODUCT CREATION & SUBFORM');
  console.log('===============================================');
  
  const BASE_URL = 'http://localhost:5000';
  
  try {
    // Test 1: Product Creation
    console.log('📦 Step 1: Testing product creation via Find or Create Product by SKU...');
    
    const productPayload = {
      sku: 'GLOCK19GEN5',
      manufacturerPartNumber: 'PA195S201', 
      name: 'GLOCK 19 Gen 5 9mm Luger',
      price: 499.99,
      category: 'Handguns',
      manufacturer: 'Glock'
    };
    
    const productResponse = await axios.post(`${BASE_URL}/api/zoho/find-or-create-product`, productPayload);
    console.log('✅ Product Creation Result:', productResponse.data);
    
    // Test 2: Deal Creation with Product
    console.log('\n🤝 Step 2: Testing deal creation with product subform...');
    
    const dealPayload = {
      contactInfo: {
        email: 'test.product@example.com',
        firstName: 'Product',
        lastName: 'Test'
      },
      orderData: {
        orderNumber: 'TEST-PRODUCT-' + Date.now(),
        totalAmount: 499.99,
        lineItems: [
          {
            sku: 'GLOCK19GEN5',
            name: 'GLOCK 19 Gen 5 9mm Luger',
            quantity: 1,
            unitPrice: 499.99,
            totalPrice: 499.99
          }
        ]
      }
    };
    
    const dealResponse = await axios.post(`${BASE_URL}/api/zoho/create-deal-with-products`, dealPayload);
    console.log('✅ Deal Creation Result:', dealResponse.data);
    
    // Test 3: Verify the deal has products
    if (dealResponse.data.success && dealResponse.data.dealId) {
      console.log('\n🔍 Step 3: Verifying deal has products in subform...');
      
      const verifyResponse = await axios.get(`${BASE_URL}/api/zoho/verify-deal-products/${dealResponse.data.dealId}`);
      console.log('✅ Deal Verification Result:', verifyResponse.data);
    }
    
  } catch (error) {
    console.error('❌ API Test Failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    
    if (error.response?.data?.error?.includes('oauth')) {
      console.log('\n🚨 CONFIRMED: Zoho authentication is blocking product creation');
    }
  }
}

testProductSubformDirectly();